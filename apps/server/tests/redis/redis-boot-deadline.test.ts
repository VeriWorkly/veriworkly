import { afterEach, describe, expect, it } from "vitest";

import { config } from "#config";
import { closeRedis, getRedis, initRedis, RedisConfigError } from "#lib/redis";

import { startFakeRedis, unusedPort } from "./fakeRedisServer.js";

/**
 * V-254: with an unreachable or misconfigured Redis, node-redis keeps reconnecting and its
 * `connect()` never settles, so a worker used to sit forever without listening while pm2 showed it
 * online. Boot now has a deadline, and a credentials error fails at once: the worker exits and the
 * primary revives it with backoff.
 */

const originalUrl = config.redis.url;
let cleanup: Array<() => Promise<unknown>> = [];

afterEach(async () => {
  await closeRedis();
  for (const step of cleanup) await step();
  cleanup = [];
  config.redis.url = originalUrl;
});

async function settleWithin<T>(promise: Promise<T>, ms: number) {
  const started = Date.now();
  const outcome = await promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  return { ...outcome, elapsed: Date.now() - started, inTime: Date.now() - started < ms };
}

describe("Redis boot deadline (V-254)", () => {
  it("rejects when Redis refuses connections for the whole boot deadline, and stops retrying", async () => {
    config.redis.url = `redis://127.0.0.1:${await unusedPort()}/14`;

    const result = await settleWithin(initRedis({ bootTimeoutMs: 400 }), 5_000);

    expect(result.ok).toBe(false);
    expect(result.inTime).toBe(true);
    expect(String((result as { error: Error }).error.message)).toMatch(/not ready within 400 ms/);
    expect(() => getRedis()).toThrow();
  });

  it("rejects when Redis accepts the connection but never answers the handshake", async () => {
    const fake = await startFakeRedis("silent");
    cleanup.push(fake.close);
    config.redis.url = fake.url;

    const result = await settleWithin(initRedis({ bootTimeoutMs: 400 }), 5_000);

    expect(result.ok).toBe(false);
    expect(result.inTime).toBe(true);
    expect(() => getRedis()).toThrow();
  });

  it("fails at once on a credentials error instead of retrying until the deadline", async () => {
    const fake = await startFakeRedis("wrongpass");
    cleanup.push(fake.close);
    config.redis.url = fake.url;

    const result = await settleWithin(initRedis({ bootTimeoutMs: 30_000 }), 5_000);

    expect(result.ok).toBe(false);
    expect(result.inTime).toBe(true);
    expect(String((result as { error: Error }).error.message)).toMatch(/WRONGPASS/);
    // Fatal: the worker exits with the configuration code and the primary stops reviving it.
    expect((result as { error: Error }).error).toBeInstanceOf(RedisConfigError);
    expect(() => getRedis()).toThrow();
  });
});
