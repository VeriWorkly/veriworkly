import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * Credit pack prices come from CREDIT_PACK_250_PRICE_CENTS / CREDIT_PACK_500_PRICE_CENTS. The
 * per-file setup already loaded `#config` with the defaults, so this file sets the variables and
 * boots a second copy of the app from a fresh module graph, the way a restart with the new
 * environment would. The helpers above stay on the first graph; both talk to the same stores.
 */

process.env.CREDIT_PACK_250_PRICE_CENTS = "349";
process.env.CREDIT_PACK_500_PRICE_CENTS = "599";
vi.resetModules();

const { app } = await import("#app");
const fresh = {
  redis: await import("#lib/redis"),
  prisma: await import("#lib/prisma"),
};

describe("credit pack prices from the environment", () => {
  beforeAll(async () => {
    await fresh.redis.initRedis();
  });

  afterAll(async () => {
    delete process.env.CREDIT_PACK_250_PRICE_CENTS;
    delete process.env.CREDIT_PACK_500_PRICE_CENTS;
    await fresh.redis.closeRedis();
    await fresh.prisma.closePrisma();
  });

  it("prices each pack in the /billing/me catalog from the environment", async () => {
    const user = await createUserWithSession();
    const response = await request(app)
      .get("/api/v1/billing/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.creditEconomics.packs).toEqual([
      expect.objectContaining({ key: "credit_pack_250", price: 349, currency: "USD" }),
      expect.objectContaining({ key: "credit_pack_500", price: 599, currency: "USD" }),
    ]);
  });
});
