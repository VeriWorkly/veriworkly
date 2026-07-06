import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiError,
  NotFoundError,
  BadRequestError,
  handleValidationError,
  createSuccessResponse,
  createErrorResponse,
} from "../../src/lib/errors.js";

describe("errors utility", () => {
  describe("ApiError and Subclasses", () => {
    it("preserves prototype chain and class inheritance", () => {
      const error = new NotFoundError("Not Found Msg");
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Not Found Msg");
    });

    it("captures stack traces correctly", () => {
      const error = new BadRequestError("Bad Request Msg");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("errors.test");
    });
  });

  describe("handleValidationError", () => {
    it("converts a ZodError to a formatted BadRequestError", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: "invalid-email", age: 10 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const apiError = handleValidationError(result.error);
        expect(apiError).toBeInstanceOf(ApiError);
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toBe("Validation failed");

        const details = apiError.details as Array<{ path: string; message: string }>;
        expect(details).toHaveLength(2);
        expect(details[0].path).toBe("email");
        expect(details[1].path).toBe("age");
      }
    });
  });

  describe("Response helpers", () => {
    it("creates standard success and error payloads", () => {
      const success = createSuccessResponse({ user: "test" }, "User loaded");
      expect(success).toEqual({
        success: true,
        message: "User loaded",
        data: { user: "test" },
      });

      const err = createErrorResponse(403, "Forbidden Action", "IP banned");
      expect(err).toEqual({
        success: false,
        statusCode: 403,
        message: "Forbidden Action",
        details: "IP banned",
      });
    });
  });
});
