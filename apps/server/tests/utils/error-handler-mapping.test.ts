import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";

vi.mock("#config", () => ({
  config: { nodeEnv: "production" },
  isProduction: true,
}));

vi.mock("#lib/logger", async (importOriginal) => ({
  maskEmails: (await importOriginal<typeof import("#lib/logger")>()).maskEmails,
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { errorHandler } = await import("#middleware/errorHandler");
const { ApiError } = await import("#lib/errors");
const { logger } = await import("#lib/logger");

/**
 * Central error mapping (audit V-092, V-023, V-025, V-084, V-137): errors that controllers forget
 * to map must still reach the client with the right status instead of a generic 500.
 */

function prismaKnownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(
    `Invalid prisma call: ${code} secret-value@example.com`,
    { code, meta, clientVersion: "7.10.0" },
  );
}

function bodyParserError(status: number, type: string, message: string) {
  // body-parser builds these with http-errors: status/statusCode, expose (true for 4xx) and type.
  return Object.assign(new SyntaxError(message), {
    status,
    statusCode: status,
    expose: true,
    type,
    body: '{"a":',
  });
}

describe("errorHandler central mapping", () => {
  let req: Request;
  let res: Response & { locals: Record<string, unknown>; headersSent: boolean };
  let next: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { method: "POST", path: "/api/v1/things" } as Request;
    res = { locals: {}, status: statusMock, headersSent: false } as unknown as Response & {
      locals: Record<string, unknown>;
      headersSent: boolean;
    };
    next = vi.fn();
  });

  function body() {
    return jsonMock.mock.calls.at(-1)?.[0] as {
      success: boolean;
      message: string;
      statusCode: number;
      details?: unknown;
    };
  }

  it("1. ApiError keeps its own status, message and details, logged at warn", () => {
    errorHandler(new ApiError(409, "Slug already taken", { field: "slug" }), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(body()).toEqual({
      success: false,
      message: "Slug already taken",
      statusCode: 409,
      details: { field: "slug" },
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("2. MulterError still maps to 413 for an oversized file, logged at warn", async () => {
    const { default: multer } = await import("multer");
    errorHandler(new multer.MulterError("LIMIT_FILE_SIZE", "resume"), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(413);
    expect(body()).toMatchObject({ success: false, statusCode: 413 });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("3. a ZodError maps to 400 Validation failed with field paths (V-023)", () => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    errorHandler(parsed.error, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    const b = body();
    expect(b).toMatchObject({ success: false, message: "Validation failed", statusCode: 400 });
    const details = b.details as Array<{ path: string; message: string }>;
    expect(details[0].path).toBe("a");
    expect(typeof details[0].message).toBe("string");
    expect(Object.keys(details[0]).sort()).toEqual(["message", "path"]);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("3b. a ZodError-shaped error from another zod copy maps the same way", () => {
    const foreign = Object.assign(new Error("[]"), {
      name: "ZodError",
      issues: [{ path: ["items", 0, "name"], message: "Required", code: "invalid_type" }],
    });

    errorHandler(foreign, req, res, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(body().details).toEqual([{ path: "items.0.name", message: "Required" }]);
  });

  describe("4. Prisma known request errors", () => {
    it("P2002 → 409 with only the column names as details (V-025, V-084)", () => {
      errorHandler(
        prismaKnownError("P2002", { modelName: "Document", target: ["userId", "slug"] }),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body()).toEqual({
        success: false,
        message: "Resource already exists",
        statusCode: 409,
        details: { target: ["userId", "slug"] },
      });
      expect(JSON.stringify(body())).not.toContain("secret-value");
      expect(res.locals.errorMessage).toBe("Prisma P2002");
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      // The model name is logged for triage; the Prisma message (query, values) never is.
      const line = String(vi.mocked(logger.warn).mock.calls[0][0]);
      expect(line).toContain("P2002 Document");
      expect(line).not.toContain("secret-value");
    });

    it("P2002 from adapter-pg with only the constraint index name omits details", () => {
      errorHandler(
        prismaKnownError("P2002", {
          modelName: "Document",
          driverAdapterError: { cause: { constraint: { index: "Document_userId_slug_key" } } },
        }),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body().details).toBeUndefined();
      expect(JSON.stringify(body())).not.toContain("Document_userId_slug_key");
    });

    it("P2002 reads the driver-adapter constraint fields when meta.target is absent", () => {
      errorHandler(
        prismaKnownError("P2002", {
          modelName: "Document",
          driverAdapterError: { cause: { constraint: { fields: ["id"] } } },
        }),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body().details).toEqual({ target: ["id"] });
    });

    it("P2002 with a non-array target omits details rather than echoing it", () => {
      errorHandler(
        prismaKnownError("P2002", { target: "Document_userId_slug_key" }),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body().details).toBeUndefined();
    });

    it("P2025 → 404 Resource not found", () => {
      errorHandler(
        prismaKnownError("P2025", { cause: "Record to update not found." }),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(body()).toEqual({
        success: false,
        message: "Resource not found",
        statusCode: 404,
        details: undefined,
      });
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("P2003 → 409 Operation conflicts with related data", () => {
      errorHandler(prismaKnownError("P2003", { field_name: "userId" }), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body()).toMatchObject({
        message: "Operation conflicts with related data",
        statusCode: 409,
      });
      expect(body().details).toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("P2034 → 409 Please retry the request", () => {
      errorHandler(prismaKnownError("P2034"), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(body()).toMatchObject({ message: "Please retry the request", statusCode: 409 });
      expect(logger.warn).toHaveBeenCalled();
    });

    it("P2028 → 503 Service temporarily unavailable, logged at error", () => {
      errorHandler(prismaKnownError("P2028"), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(body()).toEqual({
        success: false,
        message: "Service temporarily unavailable",
        statusCode: 503,
        details: undefined,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it("P1001 (connection) → 503, logged at error", () => {
      errorHandler(prismaKnownError("P1001"), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(body().message).toBe("Service temporarily unavailable");
      expect(logger.error).toHaveBeenCalled();
    });

    it("PrismaClientInitializationError with a P1xxx errorCode → 503", () => {
      const init = new Prisma.PrismaClientInitializationError(
        "Can't reach database server",
        "7.10.0",
        "P1001",
      );

      errorHandler(init, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(logger.error).toHaveBeenCalled();
    });

    it("any other Prisma code stays a generic 500, logged at error", () => {
      errorHandler(prismaKnownError("P2000"), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      // V-394: the audit column (admin-visible, kept for the retention window, never erased with
      // the account) gets the code, not the message that quotes the values.
      expect(res.locals.errorMessage).toBe("Prisma P2000");
      expect(body()).toEqual({
        success: false,
        message: "Internal server error",
        statusCode: 500,
        details: undefined,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it.each([
      [
        "PrismaClientValidationError",
        () =>
          new Prisma.PrismaClientValidationError("Argument `email`: secret-value@example.com", {
            clientVersion: "7.10.0",
          }),
      ],
      [
        "PrismaClientUnknownRequestError",
        () =>
          new Prisma.PrismaClientUnknownRequestError("engine panicked", {
            clientVersion: "7.10.0",
          }),
      ],
    ])("%s (no code) stays a generic 500", (_name, make) => {
      errorHandler(make(), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(body().message).toBe("Internal server error");
      // V-394: a validation error renders the call's arguments, values included; only its name
      // reaches the audit column.
      expect(res.locals.errorMessage).toBe(`Prisma ${_name}`);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("5. body-parser / http-errors (V-092)", () => {
    it("entity.parse.failed → 400 Invalid JSON body, logged at warn with the type audited", () => {
      errorHandler(
        bodyParserError(400, "entity.parse.failed", "Unexpected end of JSON input"),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(body()).toEqual({
        success: false,
        message: "Invalid JSON body",
        statusCode: 400,
        details: undefined,
      });
      expect(res.locals.errorMessage).toBe("entity.parse.failed");
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("entity.too.large → 413 Request body too large", () => {
      errorHandler(
        bodyParserError(413, "entity.too.large", "request entity too large"),
        req,
        res,
        next,
      );

      expect(statusMock).toHaveBeenCalledWith(413);
      expect(body()).toMatchObject({ message: "Request body too large", statusCode: 413 });
      expect(res.locals.errorMessage).toBe("entity.too.large");
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each(["encoding.unsupported", "charset.unsupported"])("%s → 415", (type) => {
      errorHandler(bodyParserError(415, type, "unsupported"), req, res, next);

      expect(statusMock).toHaveBeenCalledWith(415);
      expect(body()).toMatchObject({ success: false, statusCode: 415 });
      expect(res.locals.errorMessage).toBe(type);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("an unknown exposed 4xx keeps its status but answers with the status phrase only", () => {
      const err = Object.assign(new Error("secret detail"), { status: 422, expose: true });

      errorHandler(err, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(body()).toEqual({
        success: false,
        message: "Unprocessable Entity",
        statusCode: 422,
        details: undefined,
      });
      expect(JSON.stringify(body())).not.toContain("secret detail");
      // The real message is kept where only operators see it.
      expect(res.locals.errorMessage).toBe("secret detail");
      expect(String(vi.mocked(logger.warn).mock.calls[0][0])).toContain("secret detail");
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("a 4xx status without expose is not trusted and stays 500", () => {
      const err = Object.assign(new Error("internal detail"), { status: 400 });

      errorHandler(err, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(body().message).toBe("Internal server error");
    });
  });

  it("6. a SyntaxError not from body-parser stays 500, logged at error", () => {
    errorHandler(new SyntaxError("Unexpected token u in JSON"), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(body()).toEqual({
      success: false,
      message: "Internal server error",
      statusCode: 500,
      details: undefined,
    });
    expect(res.locals.errorMessage).toBe("Unexpected token u in JSON");
    expect(logger.error).toHaveBeenCalled();
  });

  it("7. delegates to next(error) once headers are sent instead of writing twice", () => {
    res.headersSent = true;
    const err = new Error("stream broke");

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
