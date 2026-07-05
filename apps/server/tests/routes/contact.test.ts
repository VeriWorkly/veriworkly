import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import router from "../../src/routes/contact.js";
import { sendContactEmail } from "#services/mail";

vi.mock("#services/mail", () => ({
  sendContactEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("contact route", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      method: "POST",
      url: "/",
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("sends contact email successfully when input is valid", async () => {
    req.body = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Inquiry",
      message: "Hello VeriWorkly!",
    };

    await router(req as Request, res as Response, next);

    expect(sendContactEmail).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      subject: "Inquiry",
      message: "Hello VeriWorkly!",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Message sent successfully",
        data: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          subject: "Inquiry",
        }),
      }),
    );
  });

  it("returns 400 validation error when fields are missing", async () => {
    req.body = {
      name: "",
      email: "invalid-email",
      subject: "",
      message: "",
    };

    await router(req as Request, res as Response, next);

    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Validation failed",
        statusCode: 400,
        details: expect.arrayContaining([
          expect.objectContaining({ path: "name", message: "Name is required" }),
          expect.objectContaining({ path: "email", message: "Invalid email address" }),
          expect.objectContaining({ path: "subject", message: "Subject is required" }),
          expect.objectContaining({ path: "message", message: "Message is required" }),
        ]),
      }),
    );
  });

  it("returns 500 error if email dispatch fails", async () => {
    req.body = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Inquiry",
      message: "Hello!",
    };

    vi.mocked(sendContactEmail).mockRejectedValueOnce(new Error("SMTP connection failed"));

    await router(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: "Internal server error. Failed to send message.",
      }),
    );
  });
});
