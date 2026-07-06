import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(401, message, details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, message, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details?: unknown) {
    super(404, message, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, message, details);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error", details?: unknown) {
    super(500, message, details);
    this.name = "InternalServerError";
  }
}

export function handleValidationError(error: z.ZodError): ApiError {
  const formattedErrors = error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
  }));

  return new BadRequestError("Validation failed", formattedErrors);
}

export function createSuccessResponse<T>(data: T, message = "Success") {
  return {
    success: true,
    message,
    data,
  };
}

export function createErrorResponse(statusCode: number, message: string, details?: unknown) {
  return {
    success: false,
    message,
    statusCode,
    details,
  };
}
