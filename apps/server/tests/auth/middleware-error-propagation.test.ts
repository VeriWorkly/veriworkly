import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("#config", () => ({
  config: {
    nodeEnv: "production",
    admin: {
      email: "admin@veriworkly.com",
    },
    github: {
      syncEnabled: false,
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
      authWindowMs: 60000,
      authMaxRequests: 100,
    },
    ai: {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
    },
    auth: {
      sessionCacheMaxAgeSeconds: 300,
    },
    allowedOrigins: ["https://trusted.example.com"],
  },
  isDevelopment: false,
}));

vi.mock("#lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("#lib/redis", () => ({
  getRedis: () => ({
    isOpen: true,
    eval: vi.fn().mockResolvedValue([1, 60000]),
  }),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#auth/index", () => ({
  convertNodeHeadersToWebHeaders: (headers: unknown) => headers,
  getSessionFromRequestHeaders: vi.fn().mockResolvedValue({
    user: {
      id: "admin-id",
      email: "admin@veriworkly.com",
      name: "Admin User",
    },
  }),
}));

vi.mock("#services/apiKeyService", () => ({
  ApiKeyService: {
    validateKey: vi.fn().mockResolvedValue({
      id: "key-id",
      name: "API Key",
      rateLimit: 100,
      scopes: ["user:read"],
      user: { id: "user-id", email: "user@example.com" },
    }),
  },
}));

import { authMiddleware } from "#middleware/auth";
import { adminAuthMiddleware } from "#middleware/adminAuth";
import { apiKeyAuth } from "#middleware/apiKeyAuth";
import { apiKeyRateLimit } from "#middleware/apiKeyRateLimit";
import { rateLimitMiddleware } from "#middleware/rateLimit";

describe("Middleware Error Propagation", () => {
  const setupMocks = () => {
    // API key must match the regex pattern ^vw_[a-f0-9]{64}$
    const validApiKey = "vw_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const req = {
      headers: {
        cookie: "veriworkly-auth=session-token",
        "x-api-key": validApiKey,
      },
      apiKey: {
        id: "key-id",
        rateLimit: 100,
      },
      ip: "127.0.0.1",
      path: "/api/v1/test",
      method: "GET",
      socket: {
        remoteAddress: "127.0.0.1",
      },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn(),
    } as unknown as Response;

    const nextError = new Error("Downstream Synchronous Bug");

    return { req, res, nextError };
  };

  it("authMiddleware should not catch errors thrown in subsequent handlers", async () => {
    const { req, res, nextError } = setupMocks();
    const next = vi.fn().mockImplementation(() => {
      throw nextError;
    });

    await expect(authMiddleware(req, res, next)).rejects.toThrow("Downstream Synchronous Bug");
  });

  it("adminAuthMiddleware should not catch errors thrown in subsequent handlers", async () => {
    const { req, res, nextError } = setupMocks();
    const next = vi.fn().mockImplementation(() => {
      throw nextError;
    });

    await expect(adminAuthMiddleware(req, res, next)).rejects.toThrow("Downstream Synchronous Bug");
  });

  it("apiKeyAuth should not catch errors thrown in subsequent handlers", async () => {
    const { req, res, nextError } = setupMocks();
    const next = vi.fn().mockImplementation(() => {
      throw nextError;
    });

    await expect(apiKeyAuth(req, res, next)).rejects.toThrow("Downstream Synchronous Bug");
  });

  it("apiKeyRateLimit should not catch errors thrown in subsequent handlers or call next twice", async () => {
    const { req, res, nextError } = setupMocks();
    const next = vi.fn().mockImplementation(() => {
      throw nextError;
    });

    await expect(apiKeyRateLimit(req, res, next)).rejects.toThrow("Downstream Synchronous Bug");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rateLimitMiddleware should not catch errors thrown in subsequent handlers or call next twice", async () => {
    const { req, res, nextError } = setupMocks();
    const next = vi.fn().mockImplementation(() => {
      throw nextError;
    });

    await expect(rateLimitMiddleware(req, res, next)).rejects.toThrow("Downstream Synchronous Bug");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
