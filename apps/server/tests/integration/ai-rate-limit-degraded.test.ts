import request from "supertest";
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { app } from "#app";
import { logger } from "#lib/logger";
import { closeRedis, initRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";

/**
 * V-160: the IP limiter without Redis. The client is closed for real (`closeRedis`), so
 * `getRedis()` throws exactly as it does during an outage, and reopened afterwards so the
 * recovery transition is the real one too.
 */

function redisTransitionWarnings(warn: MockInstance<typeof logger.warn>) {
  return warn.mock.calls
    .map(([message]) => String(message))
    .filter((message) => /rate limiter/i.test(message));
}

describe("rate limiter without Redis", () => {
  afterEach(async () => {
    await initRedis();
  });

  it("fails the share-verify class closed with 503 and logs the fallback once", async () => {
    const warn = vi.spyOn(logger, "warn");
    await closeRedis();

    const path = "/api/v1/shares/public/someowner/someslug/verify";
    const first = await request(app)
      .post(path)
      .set("Origin", STUDIO_ORIGIN)
      .send({ password: "x" });
    const second = await request(app)
      .post(path)
      .set("Origin", STUDIO_ORIGIN)
      .send({ password: "y" });

    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(first.body.message).toMatch(/temporarily unavailable/i);

    // Other classes keep serving from the per-process map; the degradation is logged one time.
    const generic = await request(app).get("/api/v1/does-not-exist").set("Origin", STUDIO_ORIGIN);
    expect(generic.status).toBe(404);
    expect(redisTransitionWarnings(warn)).toHaveLength(1);
    expect(redisTransitionWarnings(warn)[0]).toMatch(/memory/i);

    await initRedis();
    const recovered = await request(app).get("/api/v1/does-not-exist").set("Origin", STUDIO_ORIGIN);
    expect(recovered.status).toBe(404);

    const after = redisTransitionWarnings(warn);
    expect(after).toHaveLength(2);
    expect(after[1]).toMatch(/recovered/i);
  });
});
