import { STATUS_CODES } from "node:http";

import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ZodError } from "zod";

import { isProduction } from "#config";

import { logger, maskEmails } from "#lib/logger";
import { ApiError, createErrorResponse, handleValidationError } from "#lib/errors";

// Cap on what we persist to AuditLog.error — an error carrying a large payload (a serialized
// upstream response, a validation dump) should not become an unbounded column write per request.
const MAX_AUDIT_ERROR_CHARS = 500;

/**
 * Records the diagnostic that `loggingMiddleware` persists to AuditLog.error on the `finish`
 * event. Without this the column was written as NULL on every single row, so the audit log
 * recorded that a request failed but never why.
 *
 * The row is admin-visible, kept for the retention window and has no user link, so account
 * deletion never erases it: addresses are masked as in the log lines (V-394).
 */
function recordAuditError(res: Response, message: string) {
  res.locals.errorMessage = maskEmails(message).slice(0, MAX_AUDIT_ERROR_CHARS);
}

type ValidationDetail = { path: string; message: string };

/**
 * A ZodError from the zod copy this file imports, or one from another copy in the workspace
 * (the root hoists zod 4 for blog-platform), recognised by shape so that `instanceof` across
 * copies cannot silently send a validation failure to the 500 path.
 */
function zodValidationDetails(error: unknown): ValidationDetail[] | null {
  if (error instanceof ZodError) {
    return handleValidationError(error).details as ValidationDetail[];
  }

  if (
    error instanceof Error &&
    error.name === "ZodError" &&
    Array.isArray((error as { issues?: unknown }).issues)
  ) {
    const { issues } = error as Error & { issues: Array<{ path?: unknown; message?: unknown }> };
    return issues.map((issue) => ({
      path: Array.isArray(issue.path) ? issue.path.map(String).join(".") : "",
      message: typeof issue.message === "string" ? issue.message : "Invalid value",
    }));
  }

  return null;
}

type PrismaLikeError = Error & {
  code?: unknown;
  errorCode?: unknown;
  clientVersion?: unknown;
  meta?: unknown;
};

/**
 * Detected by shape rather than `instanceof Prisma.PrismaClientKnownRequestError` so this
 * middleware does not load the generated client and an error from any Prisma runtime copy matches.
 * Returns the Prisma error code (P2002, P1001, ...) or null.
 */
function prismaErrorCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const candidate = error as PrismaLikeError;
  if (typeof candidate.clientVersion !== "string") return null;

  // PrismaClientKnownRequestError carries `code`; PrismaClientInitializationError `errorCode`.
  const code = candidate.code ?? candidate.errorCode;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string");
}

/**
 * Column names of the violated unique constraint, never the values. The classic engine puts them
 * in `meta.target`. With a driver adapter (Prisma 7 + adapter-pg) the cause is under
 * `meta.driverAdapterError.cause.constraint`, and for a Postgres 23505 that is usually
 * `{ index: <constraint name> }` (Postgres names the constraint) rather than `{ fields: [...] }`,
 * so most adapter P2002s carry no column list. The index name is never echoed: it is not a column
 * list and leaks schema naming, so in that case `details` is omitted.
 */
function uniqueTarget(meta: unknown): string[] | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const m = meta as {
    target?: unknown;
    driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
  };
  if (isStringArray(m.target)) return m.target;
  const fields = m.driverAdapterError?.cause?.constraint?.fields;
  return isStringArray(fields) ? fields : undefined;
}

type ErrorMapping = { status: number; message: string; details?: unknown };

function mapPrismaError(code: string, meta: unknown): ErrorMapping | null {
  // P1xxx: cannot reach / authenticate to the database; P2028: interactive transaction timed out.
  if (code.startsWith("P1") || code === "P2028") {
    return { status: 503, message: "Service temporarily unavailable" };
  }

  switch (code) {
    case "P2002": {
      const target = uniqueTarget(meta);
      return {
        status: 409,
        message: "Resource already exists",
        details: target ? { target } : undefined,
      };
    }
    case "P2025":
      return { status: 404, message: "Resource not found" };
    case "P2003":
      return { status: 409, message: "Operation conflicts with related data" };
    case "P2034":
      return { status: 409, message: "Please retry the request" };
    default:
      return null;
  }
}

/**
 * body-parser (and anything else built on http-errors) marks client errors with a 4xx
 * `status`/`statusCode` and `expose: true`; `type` names the failure (`entity.parse.failed`, ...).
 * Without `expose` the status is not trusted and the error stays a 500.
 */
function clientHttpError(
  error: unknown,
): { status: number; type?: string; message: string } | null {
  if (!(error instanceof Error)) return null;
  const e = error as Error & {
    status?: unknown;
    statusCode?: unknown;
    expose?: unknown;
    type?: unknown;
  };
  const status = typeof e.status === "number" ? e.status : e.statusCode;
  if (typeof status !== "number" || status < 400 || status > 499 || e.expose !== true) return null;

  return { status, type: typeof e.type === "string" ? e.type : undefined, message: e.message };
}

/**
 * The body message for an exposed 4xx. Only the four body-parser types get a tailored message;
 * anything else answers with the standard status phrase so a library's own message (which can
 * carry internals) never reaches the client. The real message stays in the log and audit column.
 */
function clientHttpErrorMessage(type: string | undefined, status: number): string {
  switch (type) {
    case "entity.parse.failed":
      return "Invalid JSON body";
    case "entity.too.large":
      return "Request body too large";
    case "encoding.unsupported":
      return "Unsupported content encoding";
    case "charset.unsupported":
      return "Unsupported charset";
    default:
      return STATUS_CODES[status] ?? "Bad Request";
  }
}

/**
 * The one place errors become responses (audit README operating rule 2): a controller that forgets
 * to map a ZodError, a Prisma constraint error or a body-parser failure still answers with the
 * right 4xx instead of a 500 that is logged and audited as a server fault.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  // A response already under way (a stream that failed midway) cannot get a second status line;
  // Express's default handler closes the connection instead.
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    logger.warn(`API Error [${req.method} ${req.path}]: ${error.message}`, error.details);
    recordAuditError(res, error.message);

    // A 429 or 503 that knows when to come back says so, like the limiter's own 429s (a 503 for
    // a restart, V-313 review), and so does a 409 for a paid request still running (S-384).
    const retryAfter = (error.details as { retryAfterSeconds?: unknown } | undefined)
      ?.retryAfterSeconds;
    if (
      [409, 429, 503].includes(error.statusCode) &&
      typeof retryAfter === "number" &&
      retryAfter > 0
    )
      res.set("Retry-After", String(Math.ceil(retryAfter)));

    return res
      .status(error.statusCode)
      .json(createErrorResponse(error.statusCode, error.message, error.details));
  }

  // An upload the limits refuse (too large, an extra field): the caller's mistake, not ours. It
  // reached the 500 below, so a 6 MB resume read "Internal server error".
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      status === 413
        ? "The file is larger than the 5 MB upload limit."
        : `Upload refused: ${error.message}.`;
    logger.warn(`Upload refused [${req.method} ${req.path}]: ${error.code}`);
    recordAuditError(res, error.code);
    return res.status(status).json(createErrorResponse(status, message));
  }

  // Every ZodError that reaches this point is reported as the client's fault (400). Server-side
  // `.parse` of trusted data (policy files, stored webhook payloads) must catch its own ZodError,
  // or a server bug is answered as "Validation failed" and logged only at warn.
  const validationDetails = zodValidationDetails(error);
  if (validationDetails) {
    logger.warn(`Validation failed [${req.method} ${req.path}]`, validationDetails);
    recordAuditError(res, "Validation failed");
    return res.status(400).json(createErrorResponse(400, "Validation failed", validationDetails));
  }

  const prismaCode = prismaErrorCode(error);
  const prismaMapping =
    prismaCode === null ? null : mapPrismaError(prismaCode, (error as PrismaLikeError).meta);
  if (prismaMapping) {
    // Only the code (and the model name, for triage) reaches the log line and the audit column:
    // the Prisma message can quote the query and the conflicting values.
    const meta = (error as PrismaLikeError).meta as { modelName?: unknown } | undefined;
    const model = typeof meta?.modelName === "string" ? ` ${meta.modelName}` : "";
    const line = `Prisma ${prismaCode}${model} [${req.method} ${req.path}] -> ${prismaMapping.status}`;
    if (prismaMapping.status >= 500) logger.error(line);
    else logger.warn(line);
    recordAuditError(res, `Prisma ${prismaCode}`);
    return res
      .status(prismaMapping.status)
      .json(
        createErrorResponse(prismaMapping.status, prismaMapping.message, prismaMapping.details),
      );
  }

  const httpError = clientHttpError(error);
  if (httpError) {
    logger.warn(
      `Client error [${req.method} ${req.path}]: ${httpError.status} ${httpError.type ?? "-"}: ${httpError.message}`,
    );
    recordAuditError(res, httpError.type ?? httpError.message);
    const message = clientHttpErrorMessage(httpError.type, httpError.status);
    return res.status(httpError.status).json(createErrorResponse(httpError.status, message));
  }

  if (error instanceof Error) {
    logger.error(`Unhandled Error [${req.method} ${req.path}]: ${error.message}`, {
      stack: error.stack,
    });

    // The audit log is internal and admin-only, so it keeps the real message even though the
    // response body is generic in production. Not for a Prisma error, whose message can render
    // the call's arguments (a validation error) or the conflicting values: its code or class
    // name only, as the mapped branch above records (V-394).
    const prismaError = error as PrismaLikeError;
    recordAuditError(
      res,
      typeof prismaError.clientVersion === "string"
        ? `Prisma ${typeof prismaError.code === "string" ? prismaError.code : error.name}`
        : error.message,
    );

    const message = isProduction ? "Internal server error" : error.message;
    return res.status(500).json(createErrorResponse(500, message));
  }

  logger.error("Unknown error type", error);
  recordAuditError(res, "Unknown error type");

  return res.status(500).json(createErrorResponse(500, "Internal server error"));
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(createErrorResponse(404, `Endpoint ${req.method} ${req.path} not found`));
}
