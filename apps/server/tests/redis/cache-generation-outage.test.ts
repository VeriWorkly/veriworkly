import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-370 review: while Redis is down (the client is not ready), a cache invalidation must not make
 * every write wait out the inline retries. It is queued at once, and applied by the background
 * retry as soon as Redis is back.
 */

const redis = vi.hoisted(() => ({
  ready: false,
  eval: vi.fn(async () => 1),
}));

vi.mock("#lib/redis", () => ({
  getRedis: () => {
    if (!redis.ready) throw new Error("Redis client not ready");
    return { eval: redis.eval };
  },
}));

const { bumpGeneration } = await import("#lib/cacheGeneration");

beforeEach(() => {
  vi.useFakeTimers();
  redis.ready = false;
  redis.eval.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a cache invalidation while Redis is down", () => {
  it("returns at once instead of waiting out the inline retries, and lands once Redis is back", async () => {
    let settled = false;
    void bumpGeneration("share:public-readable:someone").then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(0);

    expect(settled).toBe(true);
    expect(redis.eval).not.toHaveBeenCalled();

    redis.ready = true;
    await vi.advanceTimersByTimeAsync(1_000);

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("INCR"),
      expect.objectContaining({ keys: ["cache:gen:share:public-readable:someone"] }),
    );
  });
});
