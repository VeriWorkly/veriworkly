import { describe, expect, it, vi, beforeEach } from "vitest";

const mockConfig = vi.hoisted(() => ({
  admin: {
    email: "admin@veriworkly.com",
  },
  auth: {
    secret: "production-strong-secret-1234567890",
    baseUrl: "https://api.veriworkly.com",
    sessionTtlSeconds: 2592000,
    sessionResetTtlOnUse: 86400,
    sessionCacheMaxAgeSeconds: 900,
    otpTtlSeconds: 300,
    otpAllowedAttempts: 3,
    emailProvider: "resend",
    resendApiKey: "re_test_key_123",
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
  },
  apiKeys: {
    authCacheTtlSeconds: 300,
    lastUsedTouchIntervalSeconds: 300,
    hashSecret: "dedicated-api-key-hash-secret",
  },
  server: {
    trustProxy: 1,
  },
}));

let mockIsProduction = true;

vi.mock("#config", () => ({
  config: mockConfig,
  get isProduction() {
    return mockIsProduction;
  },
}));

vi.mock("#lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("#lib/prisma", () => ({
  prisma: {},
}));

import { validateAuthRuntimeConfig } from "#auth/runtime";

describe("validateAuthRuntimeConfig with Resend", () => {
  beforeEach(() => {
    process.env.API_KEY_HASH_SECRET = "dedicated-api-key-hash-secret";
    mockIsProduction = true;
    mockConfig.auth.emailProvider = "resend";
    mockConfig.auth.resendApiKey = "re_test_key_123";
    mockConfig.auth.smtpHost = "";
    mockConfig.auth.smtpUser = "";
    mockConfig.auth.smtpPass = "";
  });

  it("passes validation in production when emailProvider is resend and RESEND_API_KEY is configured", () => {
    expect(() => validateAuthRuntimeConfig()).not.toThrow();
  });

  it("throws error when emailProvider is resend but RESEND_API_KEY is missing", () => {
    mockConfig.auth.resendApiKey = "";
    expect(() => validateAuthRuntimeConfig()).toThrow(
      "RESEND_API_KEY must be configured when using Resend",
    );
  });

  it("passes validation in production when emailProvider is smtp and SMTP credentials are provided", () => {
    mockConfig.auth.emailProvider = "smtp";
    mockConfig.auth.smtpHost = "smtp.resend.com";
    mockConfig.auth.smtpUser = "resend";
    mockConfig.auth.smtpPass = "re_test_key_123";

    expect(() => validateAuthRuntimeConfig()).not.toThrow();
  });

  it("rejects console email provider in production", () => {
    mockConfig.auth.emailProvider = "console";
    expect(() => validateAuthRuntimeConfig()).toThrow(
      "AUTH_EMAIL_PROVIDER must be smtp or resend in production",
    );
  });
});
