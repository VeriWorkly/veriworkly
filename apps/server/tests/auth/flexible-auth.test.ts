import { beforeEach, describe, expect, it, vi } from "vitest";
import { flexibleAuth } from "../../src/middleware/flexibleAuth";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../src/config", () => ({
  config: {
    allowedOrigins: ["https://trusted.example.com"],
  },
  isDevelopment: false,
}));

vi.mock("../../src/middleware/apiKeyAuth", () => ({
  apiKeyAuth: vi.fn((req, res, next) => next()),
}));

vi.mock("../../src/middleware/auth", () => ({
  getSessionUserFromRequest: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../src/middleware/apiKeyRateLimit", () => ({
  apiKeyRateLimit: vi.fn((req, res, next) => next()),
}));

describe("flexibleAuth middleware", () => {
  let req: Partial<Request> & { headers: Record<string, string> };
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      ip: "192.168.1.1",
      path: "/test-route",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("passes for exact allowed origin", async () => {
    req.headers.origin = "https://trusted.example.com";
    await flexibleAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects malicious origin prefix-matching", async () => {
    req.headers.origin = "https://trusted.example.com.attacker.com";
    await flexibleAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects malicious origin suffix-injections", async () => {
    req.headers.origin = "https://trusted.example.attacker.example";
    await flexibleAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects headerless requests (no origin/referer)", async () => {
    await flexibleAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("passes for exact referer origin", async () => {
    req.headers.referer = "https://trusted.example.com/dashboard";
    await flexibleAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects invalid referer origin", async () => {
    req.headers.referer = "https://trusted.example.attacker.com/dashboard";
    await flexibleAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
