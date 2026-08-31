import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

import { denyApiKeyAuth } from "../../src/middleware/apiKeyScope";

/**
 * `DELETE /users/me` destroys an account irreversibly: every document, portfolio,
 * credit, API key, and payout record, plus the R2 objects behind them.
 *
 * It was originally gated on `requireApiKeyScopes("user:write")`, which is the same
 * scope a key needs to rename an account. That put a long-lived integration token one
 * call away from total destruction — including a key the user had pasted into a
 * third-party tool for something entirely unrelated. Scopes are too coarse a lever for
 * this, so the route is session-only and this middleware is what enforces it.
 */
function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return res as unknown as Response & { statusCode: number; body: { message?: string } };
}

describe("denyApiKeyAuth", () => {
  it("rejects a request authenticated with an API key, whatever scopes it holds", () => {
    const req = {
      apiKey: { id: "key_1", scopes: ["user:read", "user:write", "resume:write"] },
    } as unknown as Request;

    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    denyApiKeyAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/cannot be performed with an API key/i);
  });

  it("rejects even a key that holds every scope", () => {
    const req = {
      apiKey: { id: "key_2", scopes: ["*"] },
    } as unknown as Request;

    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    denyApiKeyAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("allows a session-authenticated request through", () => {
    // No `apiKey` on the request means flexibleAuth resolved a session cookie from one
    // of our own origins, which is the only way this route may be reached.
    const req = { authUser: { id: "user_1" } } as unknown as Request;

    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    denyApiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0);
  });
});
