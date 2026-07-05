import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return {
    mockSendMail: sendMail,
    mockCreateTransport: vi.fn().mockReturnValue({
      sendMail,
    }),
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
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

vi.mock("#utils/logger", () => ({
  logger: mockLogger,
}));

// Mock config values
const mockConfig = vi.hoisted(() => ({
  auth: {
    emailProvider: "console",
    emailFrom: "VeriWorkly <no-reply@veriworkly.com>",
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "user",
    smtpPass: "pass",
    baseUrl: "http://localhost:8080/api/v1/auth",
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
} from "#services/mail";

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
});
