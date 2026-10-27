import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { config } from "#config";
import { closeRedis, initRedis, RedisTimeoutError, redisWrite } from "#lib/redis";

import { startFakeRedis } from "./fakeRedisServer.js";

/**
 * A command that times out is not cancelled: Redis may still apply it once it recovers. For the
 * writes whose caller reports failure (an ATS scan count, a checkout claim, a job lock),
 * `redisWrite` hands the late result to an undo step so the write does not outlive the error.
 */

const originalUrl = config.redis.url;
let fake: Awaited<ReturnType<typeof startFakeRedis>>;

beforeAll(async () => {
  // Answers 300 ms after the 100 ms bound used below.
  fake = await startFakeRedis("slow", { delayMs: 400 });
  config.redis.url = fake.url;
  await initRedis({ bootTimeoutMs: 5_000 });
});

afterAll(async () => {
  await closeRedis();
  await fake.close();
  config.redis.url = originalUrl;
});

describe("redisWrite", () => {
  it("rejects at the bound, then runs undo with the late reply once Redis answers", async () => {
    const undo = vi.fn(async () => undefined);

    await expect(
      redisWrite((redis) => redis.set("claim", "token", { NX: true, EX: 60 }), undo, 100),
    ).rejects.toBeInstanceOf(RedisTimeoutError);
    expect(undo).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(undo).toHaveBeenCalledWith("OK"), { timeout: 3_000 });
  });

  it("returns the reply and skips undo when Redis answers in time", async () => {
    const undo = vi.fn(async () => undefined);

    await expect(redisWrite((redis) => redis.set("claim", "token"), undo, 2_000)).resolves.toBe(
      "OK",
    );
    expect(undo).not.toHaveBeenCalled();
  });
});
