import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { closeRedis, getRedis, initRedis } from "#lib/redis";
import { cacheSet } from "#lib/redis";
import { CreditService, sweepExpiredCredits } from "#services/creditService";
import { EntitlementService, entitlementCacheKey } from "#services/entitlementService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

/**
 * V-107 and V-108: the credit wallet and entitlement read paths must not write, and the
 * entitlement cache must never show a grant past its `endsAt` or hide one a webhook just made.
 * Writes are counted straight from Postgres: `xmin` changes on every UPDATE of a row, so a
 * fingerprint of row counts plus `max(xmin)` per ledger table is identical before and after a
 * read only if nothing was inserted or updated.
 */

const HOUR = 60 * 60 * 1000;

type Fingerprint = Record<string, { rows: number; xmin: string | null }>;

async function ledgerFingerprint(userId: string): Promise<Fingerprint> {
  const rows = await prisma.$queryRaw<Array<{ t: string; rows: number; xmin: string | null }>>`
    SELECT 'wallet' AS t, COUNT(*)::int AS rows, MAX(xmin::text::bigint)::text AS xmin
      FROM "CreditWallet" WHERE "userId" = ${userId}
    UNION ALL
    SELECT 'grant', COUNT(*)::int, MAX(xmin::text::bigint)::text
      FROM "CreditGrant" WHERE "userId" = ${userId}
    UNION ALL
    SELECT 'reservation', COUNT(*)::int, MAX(xmin::text::bigint)::text
      FROM "CreditReservation" WHERE "userId" = ${userId}
    UNION ALL
    SELECT 'transaction', COUNT(*)::int, MAX(xmin::text::bigint)::text
      FROM "CreditTransaction" WHERE "userId" = ${userId}
  `;
  return Object.fromEntries(rows.map((row) => [row.t, { rows: row.rows, xmin: row.xmin }]));
}

async function grant(userId: string, amount: number, expiresAt: Date | null = null) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
    expiresAt,
  });
  return prisma.creditGrant.findUniqueOrThrow({
    where: { userId_source_sourceId: { userId, source: "integration", sourceId: id } },
  });
}

async function entitlementGrant(userId: string, key: string, endsAt: Date | null) {
  return prisma.entitlementGrant.create({
    data: { userId, key, source: "SYSTEM", sourceId: randomUUID(), endsAt },
  });
}

async function cachedEntitlements(userId: string) {
  const key = await entitlementCacheKey(userId);
  expect(key).toMatch(new RegExp(`^entitlements:active:${userId}:g\\d+$`));
  return getRedis().get(key!);
}

async function deliverPassWebhook(userId: string) {
  const at = new Date(Date.now() - 60_000);
  const body = JSON.stringify({
    type: "payment.succeeded",
    timestamp: at.toISOString(),
    data: {
      payment_id: `pay_${randomUUID()}`,
      subscription_id: null,
      product_cart: [{ product_id: "prod_bundle_seven_day", quantity: 1 }],
      total_amount: 599,
      settlement_amount: 599,
      settlement_tax: null,
      tax: null,
      currency: "USD",
      settlement_currency: "USD",
      is_update_payment_method: false,
      created_at: at.toISOString(),
      metadata: {
        veriworkly_user_id: userId,
        veriworkly_product: "bundle",
        veriworkly_interval: "seven_day",
      },
    },
  });
  const headers = signDodoWebhook(body);
  const req = request(app).post("/api/v1/billing/webhooks/dodo");
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  return req.send(body);
}

describe("V-107 wallet reads do not write", () => {
  it("GET /billing/credits for a user with no wallet answers zero and creates no row", async () => {
    const user = await createUserWithSession();

    const response = await request(app)
      .get("/api/v1/billing/credits")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      balance: 0,
      reserved: 0,
      available: 0,
      lifetimeCredited: 0,
      lifetimeDebited: 0,
      nextExpiryAt: null,
      nextExpiryCredits: 0,
    });
    expect(await prisma.creditWallet.count({ where: { userId: user.id } })).toBe(0);
  });

  it("two consecutive uncached wallet reads run zero UPDATE/INSERT, even with an expired grant and an overdue reservation", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 100, new Date(Date.now() + HOUR));
    const expiring = await grant(user.id, 40, new Date(Date.now() + HOUR));
    const reservation = await CreditService.reserve(
      user.id,
      10,
      "ats_analysis",
      `req:${randomUUID()}`,
    );
    // Both sweeps now have work to do: an overdue PENDING reservation and a grant past its expiry.
    await prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.creditGrant.update({
      where: { id: expiring.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await CreditService.invalidate(user.id);

    const before = await ledgerFingerprint(user.id);
    const first = await CreditService.getWallet(user.id);
    await CreditService.invalidate(user.id);
    const second = await CreditService.getWallet(user.id);
    const after = await ledgerFingerprint(user.id);

    expect(after).toEqual(before);
    // The expired grant is still in `balance` until a write path or the job sweeps it, but it is
    // never spendable: 100 unexpired − 10 reserved.
    expect(first).toMatchObject({ balance: 130, reserved: 10, available: 90 });
    expect(second).toMatchObject({ balance: 130, reserved: 10, available: 90 });
  });

  it("consume releases an overdue reservation first, so an admin debit can reach its credits", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 50);
    const reservation = await CreditService.reserve(
      user.id,
      30,
      "ats_analysis",
      `req:${randomUUID()}`,
    );
    await prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Without the release the limit would be 50 unexpired − 30 reserved = 20 → 402.
    const debit = await CreditService.consume(user.id, 50, {
      requestId: `adj:${randomUUID()}`,
      action: "admin_adjustment",
      actorId: "admin_1",
    });
    expect(debit.amount).toBe(-50);
    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet).toMatchObject({ balance: 0, reserved: 0 });
    expect(
      (await prisma.creditReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status,
    ).toBe("EXPIRED");
  });

  it("/billing/me never shows a user with only expired, unswept credits as paying", async () => {
    const user = await createUserWithSession();
    const expired = await grant(user.id, 40, new Date(Date.now() + HOUR));
    await prisma.creditGrant.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await CreditService.invalidate(user.id);

    const response = await request(app)
      .get("/api/v1/billing/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
    const me = response.body.data;
    expect(me.access).toMatchObject({ tier: "free", isPaying: false, creditBalance: 0 });
    // The raw balance still reports the unswept credits; only `access` is derived from `available`.
    expect(me.credits).toMatchObject({ balance: 40, available: 0 });
    expect(
      await prisma.creditTransaction.count({ where: { userId: user.id, type: "EXPIRATION" } }),
    ).toBe(0);
  });

  it("sweepExpiredCredits releases overdue reservations and expires due grants in one pass", async () => {
    // The sweep is global: clear what earlier tests in this file left due before counting.
    await sweepExpiredCredits();
    const user = await createUserWithSession();
    const other = await createUserWithSession();
    const g = await grant(user.id, 100, new Date(Date.now() + HOUR));
    const reservation = await CreditService.reserve(
      user.id,
      30,
      "ats_analysis",
      `req:${randomUUID()}`,
    );
    await prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.creditGrant.update({
      where: { id: g.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await grant(other.id, 20, new Date(Date.now() - 1000));
    const untouched = await createUserWithSession();
    await grant(untouched.id, 5);
    const untouchedBefore = await ledgerFingerprint(untouched.id);

    const swept = await sweepExpiredCredits();
    expect(swept).toMatchObject({ wallets: 2, released: 30, expired: 120 });

    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet).toMatchObject({ balance: 0, reserved: 0 });
    const otherWallet = await prisma.creditWallet.findUniqueOrThrow({
      where: { userId: other.id },
    });
    expect(otherWallet).toMatchObject({ balance: 0, reserved: 0 });
    expect(await ledgerFingerprint(untouched.id)).toEqual(untouchedBefore);
    expect(await sweepExpiredCredits()).toMatchObject({ wallets: 0, released: 0, expired: 0 });
    expect(await CreditService.getWallet(user.id)).toMatchObject({ balance: 0, available: 0 });
  });
});

describe("V-108 entitlement cache", () => {
  it("a grant that ends inside the 60 s cache window stops counting at endsAt", async () => {
    const user = await createUserWithSession();
    // V-362: half a minute ahead (inside the 60 s cache window), and the clock is moved past it
    // rather than slept through, so no stall before the first read can end the grant early.
    const endsAt = new Date(Date.now() + 30_000);
    await entitlementGrant(user.id, "portfolio_publish", endsAt);

    expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(true);
    expect(await cachedEntitlements(user.id)).toBeTruthy();
    expect(await EntitlementService.listActive(user.id)).toEqual(["portfolio_publish"]);

    // Evaluated at read time against the cached endsAt: no invalidation, no DB round trip.
    expect(
      await EntitlementService.has(user.id, "portfolio_publish", new Date(endsAt.getTime() + 1)),
    ).toBe(false);
    vi.useFakeTimers({ toFake: ["Date"], now: endsAt.getTime() + 1_000 });
    try {
      expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(false);
      expect(await EntitlementService.listActive(user.id)).toEqual([]);
      expect(await cachedEntitlements(user.id)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a second consecutive has() is served from the cache, not the table", async () => {
    const user = await createUserWithSession();
    await entitlementGrant(user.id, "ai_credits", new Date(Date.now() + HOUR));
    expect(await EntitlementService.has(user.id, "ai_credits")).toBe(true);

    // Bypass every writer: the cache alone must answer the next read.
    await prisma.entitlementGrant.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });
    expect(await EntitlementService.has(user.id, "ai_credits")).toBe(true);
    // A transaction client gets the transactional view and leaves the cache alone.
    expect(
      await prisma.$transaction((tx) =>
        EntitlementService.has(user.id, "ai_credits", new Date(), tx),
      ),
    ).toBe(false);
    expect(await EntitlementService.has(user.id, "ai_credits")).toBe(true);
    await EntitlementService.invalidateEntitlements(user.id);
    expect(await EntitlementService.has(user.id, "ai_credits")).toBe(false);
  });

  it("a webhook pass grant is visible on the very next has() call", async () => {
    const user = await createUserWithSession();
    expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(false);
    expect(await cachedEntitlements(user.id)).toBeTruthy();

    const response = await deliverPassWebhook(user.id);
    expect(response.status).toBe(200);

    expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(true);
    expect(await EntitlementService.has(user.id, "ai_credits")).toBe(true);
    expect(await EntitlementService.listActive(user.id)).toContain("portfolio_publish");
  });

  it("a stale set written after a concurrent invalidation lands under the old generation and is never read", async () => {
    const user = await createUserWithSession();
    // Reader: resolves its key, then goes to the table (which has no grant yet).
    const staleKey = await entitlementCacheKey(user.id);
    expect(staleKey).toBeTruthy();

    // Webhook commits a grant and invalidates in between.
    await entitlementGrant(user.id, "portfolio_publish", null);
    await EntitlementService.invalidateEntitlements(user.id);

    // Reader finishes and writes what it saw (nothing) under the key it resolved earlier.
    await cacheSet(staleKey!, [], 60);
    expect(await getRedis().get(staleKey!)).toBe("[]");

    const freshKey = await entitlementCacheKey(user.id);
    expect(freshKey).not.toBe(staleKey);
    expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(true);
    expect(await EntitlementService.listActive(user.id)).toEqual(["portfolio_publish"]);
  });

  it("with Redis down has() answers from the database and never denies", async () => {
    const user = await createUserWithSession();
    await entitlementGrant(user.id, "portfolio_publish", null);
    expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(true);

    await closeRedis();
    try {
      expect(await EntitlementService.has(user.id, "portfolio_publish")).toBe(true);
      expect(await EntitlementService.listActive(user.id)).toEqual(["portfolio_publish"]);
      expect(await EntitlementService.has(user.id, "ai_credits")).toBe(false);
      await expect(EntitlementService.invalidateEntitlements(user.id)).resolves.toBeUndefined();
    } finally {
      await initRedis();
    }
  });
});
