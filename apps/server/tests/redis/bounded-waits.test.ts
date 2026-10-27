import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { config } from "#config";
import { cacheGet, closeRedis, getRedis, initRedis, RedisTimeoutError } from "#lib/redis";
import { incrementFixedWindow } from "#middleware/rateLimit";
import { cacheSessionUser } from "#utils/authCache";

import { startFakeRedis } from "./fakeRedisServer.js";

/**
 * V-095: `disableOfflineQueue` only fails commands fast while the client is disconnected. A
 * connected Redis that stops answering (an AOF rewrite fork, a CPU-bound script) used to hold every
 * request on its first Redis read for as long as the stall lasted. Every command issued through
 * `getRedis()` now has a bounded wait, so each caller's existing fallback (cache miss, memory
 * count, 503) runs instead.
 */

const BOUND_MS = 2_000;
const originalUrl = config.redis.url;
let fake: Awaited<ReturnType<typeof startFakeRedis>>;

beforeAll(async () => {
  fake = await startFakeRedis("stall");
  config.redis.url = fake.url;
  await initRedis({ bootTimeoutMs: 5_000 });
});

afterAll(async () => {
  await closeRedis();
  await fake.close();
  config.redis.url = originalUrl;
});

async function timed<T>(work: () => Promise<T>) {
  const started = Date.now();
  const outcome = await work().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  return { ...outcome, elapsed: Date.now() - started };
}

describe("a connected but stalled Redis (V-095)", () => {
  it("fails a plain read with RedisTimeoutError instead of waiting", async () => {
    const result = await timed(() => getRedis().get("some-key"));

    expect(result.ok).toBe(false);
    expect((result as { error: unknown }).error).toBeInstanceOf(RedisTimeoutError);
    expect(result.elapsed).toBeLessThan(BOUND_MS);
  });

  it("bounds scripts and MULTI transactions too", async () => {
    const script = await timed(() => getRedis().eval("return 1", { keys: [], arguments: [] }));
    const multi = await timed(() => getRedis().multi().incr("a").expire("a", 60).exec());

    for (const result of [script, multi]) {
      expect(result.ok).toBe(false);
      expect((result as { error: unknown }).error).toBeInstanceOf(RedisTimeoutError);
      expect(result.elapsed).toBeLessThan(BOUND_MS);
    }
  });

  it("the request-path helpers fall back in time: cache miss, counter error, skipped cache write", async () => {
    const cached = await timed(() => cacheGet("auth:session:abc"));
    expect(cached).toMatchObject({ ok: true, value: null });
    expect(cached.elapsed).toBeLessThan(BOUND_MS);

    // OTP recipient throttle and better-auth's limiter count through this; each caller decides
    // whether a failed count fails open or closed.
    const counted = await timed(() => incrementFixedWindow("rate:x", 60));
    expect(counted.ok).toBe(false);
    expect(counted.elapsed).toBeLessThan(BOUND_MS);

    const sessionWrite = await timed(() => cacheSessionUser("auth:session:abc", { id: "u" }));
    expect(sessionWrite.ok).toBe(true);
    expect(sessionWrite.elapsed).toBeLessThan(BOUND_MS);
  });
});

describe("one place bounds every command (V-095)", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith(".ts") ? [full] : [];
    });
  }

  it("no module but lib/redis.ts creates a Redis client of its own", () => {
    const src = path.resolve(import.meta.dirname, "../../src");
    const offenders = sourceFiles(src)
      .filter((file) => !file.endsWith(path.join("lib", "redis.ts")))
      .filter((file) => /\bcreateClient\s*\(|from ["']redis["']/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(src, file));

    expect(offenders).toEqual([]);
  });
});
