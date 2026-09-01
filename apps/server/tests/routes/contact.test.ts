import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import router from "../../src/routes/contact.js";
import { sendContactEmail } from "#services/mail";

vi.mock("#services/mail", () => ({
  sendContactEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
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
      message: "Hello VeriWorkly! Need help with resumes.",
      _ts: Date.now() - 5000,
    };

    await router(req as Request, res as Response, next);

    expect(sendContactEmail).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      subject: "Inquiry",
      message: "Hello VeriWorkly! Need help with resumes.",
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

  it("trips honeypot and does not send email if website field is filled", async () => {
    req.body = {
      name: "Spam Bot",
      email: "bot@spammer.com",
      subject: "Buy crypto now",
      message: "Check out this link to buy crypto right now!",
      website: "https://spamlink.com",
    };

    await router(req as Request, res as Response, next);

    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Message sent successfully",
      }),
    );
  });

  it("detects impossible fast submission and suppresses email", async () => {
    req.body = {
      name: "Fast Bot",
      email: "bot@fast.com",
      subject: "Spam Topic",
      message: "This is a spam message that was sent within 20ms.",
      _ts: Date.now() - 50, // Only 50ms elapsed
    };

    await router(req as Request, res as Response, next);

    expect(sendContactEmail).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Message sent successfully",
      }),
    );
  });

  it("returns 400 validation error when fields are missing or message too short", async () => {
    req.body = {
      name: "",
      email: "invalid-email",
      subject: "",
      message: "short",
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
          expect.objectContaining({
            path: "message",
            message: "Message must be at least 10 characters",
          }),
        ]),
      }),
    );
  });

  it("returns 500 error if email dispatch fails", async () => {
    req.body = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Inquiry",
      message: "Hello VeriWorkly! Please help me.",
      _ts: Date.now() - 5000,
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
