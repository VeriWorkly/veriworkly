import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import {
  MAX_CUSTOM_EVENTS_PER_DAY,
  flushUsageMetricsForDate,
  incrementUsageMetric,
} from "#services/analyticsService";

import { INTERNAL_API_KEY_VALUE, STATS_INTERNAL_KEY_VALUE, STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Phase 2 item 5 contracts through the real stack: who counts as an internal `/stats/events`
 * caller (V-024, V-151), the forwarded client IP contract (V-151), the `flexibleAuth` error
 * envelope (V-136), admin search on the affiliate lists (V-133), reasons on admin money actions
 * (V-081/V-082) and the wrong-state status codes (V-137).
 */

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Runs `fn` with only `Date` frozen at `iso`, so a test that writes and then reads a per-day
 * key cannot straddle UTC midnight. Timers, sockets and Redis are untouched.
 */
async function atFixedDate<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(iso) });
  try {
    return await fn();
  } finally {
    vi.useRealTimers();
  }
}

let adminPromise: Promise<TestUser> | undefined;
const admin = () =>
  (adminPromise ??= createUserWithSession({ email: "admin@example.test", emailVerified: true }));

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    patch: (url: string) =>
      request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    delete: (url: string) =>
      request(app).delete(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

describe("/stats/events callers (V-024, V-151)", () => {
  it("treats an API key as a public caller: a custom event is refused", async () => {
    const user = await createUserWithSession();
    const created = await asUser(user)
      .post("/api/v1/api-keys")
      .send({ name: "stats key", scopes: ["user:read"] });
    expect(created.status).toBe(201);

    // Date frozen so the request and the read name the same day key (V-363).
    await atFixedDate("2026-03-08T12:00:00.000Z", async () => {
      const response = await request(app)
        .post("/api/v1/stats/events")
        .set("X-API-Key", created.body.data.key)
        .send({ event: "custom_x" });

      expect(response.status).toBe(400);
      expect(await getRedis().hGet(`usage:daily:${today()}`, "custom_x")).toBeNull();
    });
  });

  // V-379: `auth_login_success` is allow-listed for the dashboard but only the server records
  // it (the session hook). A public caller, with or without an API key, is refused and nothing
  // is counted; the stats key may still send it.
  it("refuses a server-only event from a public caller and counts nothing", () =>
    atFixedDate("2026-03-07T12:00:00.000Z", async () => {
      const response = await request(app)
        .post("/api/v1/stats/events")
        .set("Origin", STUDIO_ORIGIN)
        .send({ event: "auth_login_success" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("cannot be reported directly");
      expect(await getRedis().hGet(`usage:daily:${today()}`, "auth_login_success")).toBeNull();

      const internal = await request(app)
        .post("/api/v1/stats/events")
        .set("x-internal-key", STATS_INTERNAL_KEY_VALUE)
        .send({ event: "auth_login_success" });
      expect(internal.status).toBe(202);
      expect(await getRedis().hGet(`usage:daily:${today()}`, "auth_login_success")).toBe("1");
    }));

  it("forces value to 1 for a public caller", async () => {
    await atFixedDate("2026-03-09T12:00:00.000Z", async () => {
      const response = await request(app)
        .post("/api/v1/stats/events")
        .set("Origin", STUDIO_ORIGIN)
        .send({ event: "resume_created", value: 1000 });

      expect(response.status).toBe(202);
      expect(await getRedis().hGet(`usage:daily:${today()}`, "resume_created")).toBe("1");
    });
  });

  it("does not accept the general internal API key as the stats key", async () => {
    const response = await request(app)
      .post("/api/v1/stats/events")
      .set("Origin", STUDIO_ORIGIN)
      .set("x-internal-key", INTERNAL_API_KEY_VALUE)
      .send({ event: "custom_wrong_key" });

    expect(response.status).toBe(400);
  });

  it("lets the stats key record custom events and caps distinct names per day at 50", () =>
    atFixedDate("2026-03-10T12:00:00.000Z", async () => {
      const redis = getRedis();
      const capKey = `usage:custom-events:${today()}`;
      await redis.del(capKey);
      await redis.sAdd(
        capKey,
        Array.from({ length: 49 }, (_, i) => `custom_seed_${i}`),
      );

      const fiftieth = await request(app)
        .post("/api/v1/stats/events")
        .set("x-internal-key", STATS_INTERNAL_KEY_VALUE)
        .send({ event: "custom_fiftieth", value: 7 });
      expect(fiftieth.status).toBe(202);
      expect(await redis.hGet(`usage:daily:${today()}`, "custom_fiftieth")).toBe("7");

      const fiftyFirst = await request(app)
        .post("/api/v1/stats/events")
        .set("x-internal-key", STATS_INTERNAL_KEY_VALUE)
        .send({ event: "custom_fifty_first" });
      expect(fiftyFirst.status).toBe(429);
      expect(fiftyFirst.body).toMatchObject({ success: false, statusCode: 429 });
      expect(await redis.hGet(`usage:daily:${today()}`, "custom_fifty_first")).toBeNull();
      expect(await redis.sCard(capKey)).toBe(50);

      // A name already counted today is not a new distinct name.
      const repeat = await request(app)
        .post("/api/v1/stats/events")
        .set("x-internal-key", STATS_INTERNAL_KEY_VALUE)
        .send({ event: "custom_fiftieth" });
      expect(repeat.status).toBe(202);
    }));

  it("never admits more than 50 distinct custom names under a concurrent burst", () =>
    atFixedDate("2026-03-11T12:00:00.000Z", async () => {
      const redis = getRedis();
      const capKey = `usage:custom-events:${today()}`;
      await redis.del(capKey);

      const results = await Promise.allSettled(
        Array.from({ length: 60 }, (_, i) =>
          incrementUsageMetric({ event: `custom_burst_${i}` }, { allowCustom: true }),
        ),
      );

      const accepted = results.filter((result) => result.status === "fulfilled").length;
      const rejected = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      expect(accepted).toBeLessThanOrEqual(MAX_CUSTOM_EVENTS_PER_DAY);
      expect(accepted + rejected.length).toBe(60);
      expect(rejected.every((result) => result.reason?.statusCode === 429)).toBe(true);
      expect(await redis.sCard(capKey)).toBe(accepted);
      expect(Object.keys(await redis.hGetAll(`usage:daily:${today()}`))).toHaveLength(accepted);
    }));

  it("flushes a large field set to Postgres in one pass", async () => {
    const redis = getRedis();
    const date = new Date("2026-01-15T12:00:00.000Z");
    const key = "usage:daily:2026-01-15";
    const fields = Object.fromEntries(
      Array.from({ length: 300 }, (_, i) => [`custom_flush_${i}`, String(i + 1)]),
    );
    await redis.hSet(key, fields);

    const first = await flushUsageMetricsForDate(date);
    expect(first.flushedEvents).toBe(300);

    await redis.hSet(key, { custom_flush_0: "4" });
    await flushUsageMetricsForDate(date);

    const rows = await prisma.usageMetricDaily.findMany({
      where: { date: new Date("2026-01-15T00:00:00.000Z") },
    });
    expect(rows).toHaveLength(300);
    expect(rows.find((row) => row.event === "custom_flush_0")?.count).toBe(5);
    expect(rows.find((row) => row.event === "custom_flush_299")?.count).toBe(300);
    expect(await redis.exists([key, `${key}:processing`])).toBe(0);
  });
});

describe("forwarded client IP (V-151)", () => {
  it("uses x-forwarded-client-ip for the rate-limit bucket only with the internal key", async () => {
    const redis = getRedis();

    await request(app).get("/").set("x-forwarded-client-ip", "203.0.113.9");
    expect(await redis.exists("rate-limit:global:203.0.113.9")).toBe(0);

    await request(app)
      .get("/")
      .set("x-internal-key", "not-the-key")
      .set("x-forwarded-client-ip", "203.0.113.9");
    expect(await redis.exists("rate-limit:global:203.0.113.9")).toBe(0);

    await request(app)
      .get("/")
      .set("x-internal-key", INTERNAL_API_KEY_VALUE)
      .set("x-forwarded-client-ip", "203.0.113.7");
    expect(await redis.exists("rate-limit:global:203.0.113.7")).toBe(1);
  });
});

describe("response envelopes (V-136, V-137)", () => {
  it("flexibleAuth 401 carries statusCode and keeps code under details", async () => {
    const response = await request(app).post("/api/v1/stats/events").send({ event: "x" });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      details: { code: "API_KEY_REQUIRED" },
    });
  });

  it("GET / uses the standard success envelope", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: "ok" } });
  });
});

async function makeAffiliate(label: string) {
  const suffix = randomBytes(3).toString("hex");
  return prisma.user.create({
    data: {
      email: `${label}-${suffix}@example.test`,
      name: `${label} ${suffix}`,
      username: `${label}${suffix}`,
      emailVerified: true,
      affiliateStatus: "ACTIVE",
      affiliateCode: `${label.slice(0, 4)}${suffix}`,
    },
  });
}

describe("admin affiliate lists (V-133) and reasons (V-081/V-082)", () => {
  it("filters commissions, referrals and withdrawals by query", async () => {
    const adminUser = await admin();
    const alice = await makeAffiliate("alicesearch");
    const bob = await makeAffiliate("bobsearch");

    for (const affiliate of [alice, bob]) {
      await prisma.affiliateCommission.create({
        data: { affiliateId: affiliate.id, amountCents: 500, rateBps: 2000 },
      });
      await prisma.affiliateWithdrawal.create({
        data: { userId: affiliate.id, amountCents: 1000 },
      });
      const referred = await createUserWithSession();
      await prisma.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          referredUserId: referred.id,
          code: affiliate.affiliateCode!,
        },
      });
    }

    const commissions = await asUser(adminUser).get(
      `/api/v1/admin/affiliates/commissions?query=${encodeURIComponent(alice.email)}`,
    );
    expect(commissions.status).toBe(200);
    expect(commissions.body.data.total).toBe(1);
    expect(commissions.body.data.items[0].affiliateId).toBe(alice.id);

    const byCode = await asUser(adminUser).get(
      `/api/v1/admin/affiliates/withdrawals?query=${bob.affiliateCode}`,
    );
    expect(byCode.status).toBe(200);
    expect(byCode.body.data.total).toBe(1);
    expect(byCode.body.data.items[0].userId).toBe(bob.id);

    const referrals = await asUser(adminUser).get(
      `/api/v1/admin/affiliates/referrals?query=bobsearch`,
    );
    expect(referrals.status).toBe(200);
    expect(referrals.body.data.total).toBe(1);
    expect(referrals.body.data.items[0].affiliateId).toBe(bob.id);
  });

  it("validates a reason when one is sent (optional until the studio sends it)", async () => {
    const adminUser = await admin();
    const carol = await makeAffiliate("carolreason");
    const commission = await prisma.affiliateCommission.create({
      data: { affiliateId: carol.id, amountCents: 500, rateBps: 2000 },
    });
    // The pending balance the commission sits in, so a reversal can come out of it (V-415).
    await prisma.affiliateWallet.create({ data: { userId: carol.id, pendingCents: 500 } });
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: { userId: carol.id, amountCents: 1000 },
    });

    const shortReason = await asUser(adminUser)
      .patch(`/api/v1/admin/affiliates/commissions/${commission.id}`)
      .send({ status: "REVERSED", reason: "x" });
    expect(shortReason.status).toBe(400);

    // Absent is still accepted past validation until the studio sends it (TODO V-081).
    const noReason = await asUser(adminUser)
      .patch(`/api/v1/admin/affiliates/commissions/${commission.id}`)
      .send({ status: "REVERSED" });
    expect(noReason.status, JSON.stringify(noReason.body)).toBe(200);
    expect(
      (await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: commission.id } })).status,
    ).toBe("REVERSED");

    const shortNote = await asUser(adminUser)
      .patch(`/api/v1/admin/affiliates/withdrawals/${withdrawal.id}`)
      .send({ status: "REJECTED", payoutNote: "no" });
    expect(shortNote.status).toBe(400);

    const standing = await asUser(adminUser)
      .patch(`/api/v1/admin/affiliates/${carol.id}`)
      .send({ status: "SUSPENDED", reason: "  a " });
    expect(standing.status).toBe(400);
  });

  it("accepts the DELETE reason as a query parameter", async () => {
    const adminUser = await admin();
    const owner = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: owner.id,
        title: "Doc",
        slug: `doc-${owner.id}`,
        type: "RESUME",
        content: {},
      },
    });

    const missing = await asUser(adminUser).delete(`/api/v1/admin/documents/${document.id}`);
    expect(missing.status).toBe(400);

    const response = await asUser(adminUser).delete(
      `/api/v1/admin/documents/${document.id}?reason=${encodeURIComponent("policy violation")}`,
    );
    expect(response.status).toBe(200);
  });

  it("keeps confirmEmail body-only: a query value does not confirm a user delete", async () => {
    const adminUser = await admin();
    const target = await createUserWithSession();

    const response = await asUser(adminUser).delete(
      `/api/v1/admin/users/${target.id}?reason=cleanup&confirmEmail=${encodeURIComponent(target.email)}`,
    );
    expect(response.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });
});

describe("ambassador wrong-state codes (V-137)", () => {
  it("returns 409 for a second review and for a duplicate pending application", async () => {
    const adminUser = await admin();
    const applicant = await createUserWithSession();
    const application = await prisma.ambassadorApplication.create({
      data: {
        userId: applicant.id,
        collegeName: "Test College",
        graduationYear: "2027",
        whyJoin: "Because I want to help students build resumes.",
        superpower: "Organising",
        funFact: "Juggles",
      },
    });

    const reapply = await asUser(applicant).post("/api/v1/ambassador/apply").send({
      collegeName: "Test College",
      graduationYear: "2027",
      whyJoin: "Because I want to help students build resumes.",
      superpower: "Organising",
      funFact: "Juggles",
    });
    expect(reapply.status).toBe(409);

    const noNote = await asUser(adminUser)
      .patch(`/api/v1/admin/ambassadors/${application.id}`)
      .send({ action: "REJECT", reviewNote: "x" });
    expect(noNote.status).toBe(400);

    const first = await asUser(adminUser)
      .patch(`/api/v1/admin/ambassadors/${application.id}`)
      .send({ action: "REJECT", reviewNote: "Not this cohort" });
    expect(first.status).toBe(200);

    const second = await asUser(adminUser)
      .patch(`/api/v1/admin/ambassadors/${application.id}`)
      .send({ action: "APPROVE", reviewNote: "Changed my mind" });
    expect(second.status).toBe(409);
  });
});
