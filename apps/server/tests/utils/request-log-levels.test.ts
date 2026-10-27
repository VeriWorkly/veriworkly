import { EventEmitter } from "node:events";

import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#config", () => ({ config: { nodeEnv: "test" }, isProduction: false }));

vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("#lib/prisma", () => ({ prisma: { auditLog: { createMany: vi.fn() } } }));

vi.mock("#utils/requestIp", () => ({
  getRequestIpDetails: () => ({ resolvedIp: "203.0.113.1" }),
}));

const { logger } = await import("#lib/logger");
const { loggingMiddleware } = await import("#middleware/logging");

function finish(statusCode: number, locals: Record<string, unknown> = {}) {
  const res = Object.assign(new EventEmitter(), { statusCode, locals });
  // Inside a router `req.path` is router-relative; the log names the full path, never the query.
  const req = {
    method: "GET",
    path: "/",
    originalUrl: "/api/v1/documents?email=someone@example.com",
    headers: {},
  } as unknown as Request;

  loggingMiddleware(req, res as unknown as Response, vi.fn());
  res.emit("finish");
}

/** V-190: a 4xx is the client's problem and must not bury real failures at error level. */
describe("request log levels", () => {
  beforeEach(() => {
    vi.mocked(logger.error).mockClear();
    vi.mocked(logger.warn).mockClear();
  });

  it("logs a 5xx at error level, once, without its own level tag", () => {
    finish(503);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    const [line] = vi.mocked(logger.error).mock.calls[0]!;
    expect(line).toMatch(/^GET \/api\/v1\/documents 503 \d+ms$/);
  });

  it.each([400, 401, 403, 404, 409, 429])("logs a %i at warn level, without a tag", (status) => {
    finish(status);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [line] = vi.mocked(logger.warn).mock.calls[0]!;
    expect(line).toMatch(new RegExp(`^GET /api/v1/documents ${status} \\d+ms$`));
  });

  it("logs nothing for a program switched off by config (an expected 503)", () => {
    finish(503, { programDisabled: true });

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs nothing for a success", () => {
    finish(200);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
