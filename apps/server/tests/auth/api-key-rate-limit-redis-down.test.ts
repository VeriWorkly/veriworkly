import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

/**
 * V-381: the per-key limiter fails open when Redis cannot count. The per-IP limiter still runs in
 * front of it, and an API customer must not lose access during a Redis blip.
 */
const evalMock = vi.fn();
vi.mock("#lib/redis", () => ({ getRedis: () => ({ eval: evalMock }) }));
vi.mock("#config", () => ({ config: { apiKeys: { defaultRateLimit: 100 } } }));
vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { apiKeyRateLimit } = await import("#middleware/apiKeyRateLimit");

describe("apiKeyRateLimit when Redis fails", () => {
  it("lets the request through without rate-limit headers", async () => {
    evalMock.mockRejectedValue(new Error("Redis did not answer"));
    const req = { apiKey: { id: "key-1", name: "key", rateLimit: 2 } } as unknown as Request;
    const res = { set: vi.fn(), status: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    await apiKeyRateLimit(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
