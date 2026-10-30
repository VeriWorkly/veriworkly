import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSendMail, mockCreateTransport, mockResendSend } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const resendSend = vi.fn().mockResolvedValue({
    data: { id: "resend-msg-123" },
    error: null,
  });
  return {
    mockSendMail: sendMail,
    mockCreateTransport: vi.fn().mockReturnValue({
      sendMail,
    }),
    mockResendSend: resendSend,
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: {
        send: mockResendSend,
      },
    };
  }),
}));

const { mockLogger } = vi.hoisted(() => {
  return {
    mockLogger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

vi.mock("#lib/logger", () => ({
  logger: mockLogger,
}));

// Mock config values
const mockConfig = vi.hoisted(() => ({
  auth: {
    emailProvider: "console",
    emailFrom: "VeriWorkly <no-reply@veriworkly.com>",
    resendApiKey: "re_test_key_12345",
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "user",
    smtpPass: "pass",
    baseUrl: "http://localhost:8080/api/v1/auth",
    studioUrl: "https://app.example.com",
  },
}));

vi.mock("#config", () => ({
  config: mockConfig,
  isDevelopment: true,
}));

import {
  sendAuthOtpEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendAccountDeletedEmail,
} from "#services/mail/index";

describe("mail service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.auth.emailProvider = "console";
  });

  describe("development console mode", () => {
    it("logs OTP email to the console in development mode", async () => {
      await sendAuthOtpEmail({
        email: "test@example.com",
        otp: "123456",
        type: "sign-in",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email sent to console"),
        expect.objectContaining({
          to: "test@example.com",
          subject: "Your VeriWorkly sign-in code",
        }),
      );
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("logs Welcome email to the console in development mode", async () => {
      await sendWelcomeEmail("welcome@example.com", "Jane Doe");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email sent to console"),
        expect.objectContaining({
          to: "welcome@example.com",
          subject: "Welcome to VeriWorkly!",
        }),
      );
    });

    it("logs Login Alert email to the console in development mode", async () => {
      await sendLoginAlertEmail("alert@example.com", {
        ip: "127.0.0.1",
        device: "Chrome / Windows",
        timestamp: "2026-06-26 12:00:00",
        location: "San Francisco, CA",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email sent to console"),
        expect.objectContaining({
          to: "alert@example.com",
          subject: "Security Alert: New Sign-in Detected",
        }),
      );
    });

    it("logs Account Deleted email to the console in development mode", async () => {
      await sendAccountDeletedEmail("deleted@example.com", "John Doe");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email sent to console"),
        expect.objectContaining({
          to: "deleted@example.com",
          subject: "Your VeriWorkly Account Has Been Deleted",
        }),
      );
    });
  });

  describe("production SMTP mode", () => {
    beforeEach(() => {
      mockConfig.auth.emailProvider = "smtp";
    });

    it("sends OTP email via nodemailer when SMTP is configured", async () => {
      await sendAuthOtpEmail({
        email: "smtp-test@example.com",
        otp: "987654",
        type: "email-verification",
      });

      expect(mockCreateTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "VeriWorkly <no-reply@veriworkly.com>",
          to: "smtp-test@example.com",
          subject: "Verify your VeriWorkly email",
          text: expect.stringContaining("987654"),
          html: expect.stringContaining("987654"),
        }),
      );
    });

    it("throws error if SMTP environment configuration is missing", async () => {
      mockConfig.auth.smtpHost = ""; // invalid config

      await expect(
        sendAuthOtpEmail({
          email: "smtp-test@example.com",
          otp: "987654",
          type: "email-verification",
        }),
      ).rejects.toThrow("SMTP provider selected but SMTP environment values are incomplete");

      mockConfig.auth.smtpHost = "smtp.example.com"; // restore config
    });
  });

  describe("production Resend mode", () => {
    beforeEach(() => {
      mockConfig.auth.emailProvider = "resend";
      mockConfig.auth.resendApiKey = "re_test_key_12345";
    });

    it("sends OTP email via Resend when configured", async () => {
      await sendAuthOtpEmail({
        email: "resend-test@example.com",
        otp: "112233",
        type: "sign-in",
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "VeriWorkly <no-reply@veriworkly.com>",
          to: "resend-test@example.com",
          subject: "Your VeriWorkly sign-in code",
          text: expect.stringContaining("112233"),
          html: expect.stringContaining("112233"),
        }),
        // V-047: the SDK has no client timeout, so every send carries an abort signal.
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Email dispatched successfully via Resend"),
        expect.objectContaining({
          to: "resend-test@example.com",
          messageId: "resend-msg-123",
        }),
      );
    });

    it("throws error if RESEND_API_KEY is missing", async () => {
      mockConfig.auth.resendApiKey = "";

      await expect(
        sendAuthOtpEmail({
          email: "resend-test@example.com",
          otp: "112233",
          type: "sign-in",
        }),
      ).rejects.toThrow(
        "Resend provider selected but RESEND_API_KEY environment variable is missing",
      );
    });

    it("throws error if Resend API returns an error", async () => {
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid API Key", name: "validation_error" },
      });

      await expect(
        sendAuthOtpEmail({
          email: "resend-test@example.com",
          otp: "112233",
          type: "sign-in",
        }),
      ).rejects.toThrow("Resend email delivery failed: Invalid API Key");
    });
  });

  // After the SMTP block: the pooled transport is created once per module, and that block asserts the creation.
  describe("addresses and copy", () => {
    it("sets replyTo on the mails that tell the reader to reply", async () => {
      mockConfig.auth.emailProvider = "smtp";

      await sendLoginAlertEmail("alert@example.com", {
        ip: "127.0.0.1",
        device: "Chrome",
        timestamp: "2026-06-26T12:00:00Z",
      });
      await sendAccountDeletedEmail("deleted@example.com", "John");

      expect(mockSendMail).toHaveBeenCalledTimes(2);
      for (const [message] of mockSendMail.mock.calls)
        expect(message).toMatchObject({ replyTo: "info@veriworkly.com" });
    });

    it("links the welcome mail to the studio, not the API host", async () => {
      mockConfig.auth.emailProvider = "smtp";

      await sendWelcomeEmail("welcome@example.com", "Jane");

      const { html } = mockSendMail.mock.calls[0]![0];
      expect(html).toContain('href="https://app.example.com/"');
      expect(html).not.toContain("localhost:8080");
    });

    it("S-376 the login alert links to signing out every other device", async () => {
      mockConfig.auth.emailProvider = "smtp";

      await sendLoginAlertEmail("alert@example.com", {
        ip: "127.0.0.1",
        device: "Chrome",
        timestamp: "2026-06-26T12:00:00Z",
      });

      const { html, text } = mockSendMail.mock.calls[0]![0];
      expect(html).toContain('href="https://app.example.com/profile?focus=sessions"');
      expect(html).toMatch(/Sign out of all other devices/);
      expect(text).toContain("https://app.example.com/profile?focus=sessions");
    });

    it("does not promise custom domains or instant publishing", async () => {
      mockConfig.auth.emailProvider = "smtp";

      await sendWelcomeEmail("welcome@example.com", "Jane");

      const { html } = mockSendMail.mock.calls[0]![0];
      expect(html).not.toMatch(/custom domain/i);
      expect(html).not.toMatch(/Instant Subdomain Publishing/i);
    });

    it("does not claim every trace of the account was wiped", async () => {
      mockConfig.auth.emailProvider = "smtp";

      await sendAccountDeletedEmail("deleted@example.com", "John");

      const { html, text } = mockSendMail.mock.calls[0]![0];
      for (const body of [html, text]) {
        expect(body).not.toMatch(/wiped|all associated data has been permanently removed/i);
        expect(body).toMatch(/as long as the law requires/);
      }
    });
  });
});
