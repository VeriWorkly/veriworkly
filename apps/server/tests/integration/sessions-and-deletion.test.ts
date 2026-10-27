import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet, getRedis } from "#lib/redis";
import { getGeneration } from "#lib/cacheGeneration";
import { cacheNamespaces } from "#lib/cacheKeys";
import { ApiKeyService, hashKey } from "#services/apiKeyService";
import { getSessionCacheKey, invalidateCacheByToken } from "#utils/authCache";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { createSessionForUser, seedBetterAuthSessionEntries } from "./helpers/sessions.js";

/** The configured admin (env.ts sets ADMIN_EMAIL); one account shared by every test in the file. */
let adminPromise: Promise<TestUser> | undefined;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function withCookie(cookie: string) {
  return {
    get: (url: string) => request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", cookie),
    delete: (url: string) =>
      request(app).delete(url).set("Origin", STUDIO_ORIGIN).set("Cookie", cookie),
  };
}

async function exists(key: string) {
  return (await getRedis().exists(key)) === 1;
}

describe("session cache keyed on the token (V-019 / V-089)", () => {
  it("invalidateCacheByToken removes the exact key a signed cookie warmed", async () => {
    const user = await createUserWithSession();

    const warm = await withCookie(user.cookie).get("/api/v1/users/me");
    expect(warm.status).toBe(200);

    const cacheKey = getSessionCacheKey(user.cookie);
    expect(cacheKey).toMatch(/^auth:session:/);
    expect(await exists(cacheKey!)).toBe(true);

    await invalidateCacheByToken(user.sessionToken);

    expect(await exists(cacheKey!)).toBe(false);
  });

  it("a warm cache entry cannot be reached with the raw token or a forged signature", async () => {
    const user = await createUserWithSession();

    const warm = await withCookie(user.cookie).get("/api/v1/users/me");
    expect(warm.status).toBe(200);
    expect(await exists(getSessionCacheKey(user.cookie)!)).toBe(true);

    const garbage = Buffer.alloc(32, 7).toString("base64");
    const forged = `veriworkly-auth.session_token=${encodeURIComponent(`${user.sessionToken}.${garbage}`)}`;
    const unsigned = `veriworkly-auth.session_token=${user.sessionToken}`;

    // No cache key is derived for either, so better-auth verifies the HMAC itself and refuses.
    expect(getSessionCacheKey(forged)).toBeNull();
    expect(getSessionCacheKey(unsigned)).toBeNull();
    expect((await withCookie(forged).get("/api/v1/users/me")).status).toBe(401);
    expect((await withCookie(unsigned).get("/api/v1/users/me")).status).toBe(401);

    // The genuine cookie still works, and the entry it warmed is untouched.
    expect((await withCookie(user.cookie).get("/api/v1/users/me")).status).toBe(200);
  });
});

describe("self-service account deletion (V-118, V-048, V-021)", () => {
  it("signs out every other device: session B is 401 and better-auth's Redis entries are gone", async () => {
    const user = await createUserWithSession();
    const deviceB = await createSessionForUser(user.id);
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken, deviceB.sessionToken]);

    // Both devices are live and B's app-cache entry is warm.
    expect((await withCookie(user.cookie).get("/api/v1/users/me")).status).toBe(200);
    expect((await withCookie(deviceB.cookie).get("/api/v1/users/me")).status).toBe(200);
    const deviceBCacheKey = getSessionCacheKey(deviceB.cookie)!;
    expect(await exists(deviceBCacheKey)).toBe(true);

    const deleted = await withCookie(user.cookie).delete("/api/v1/users/me");
    expect(deleted.status).toBe(200);

    const afterDelete = await withCookie(deviceB.cookie).get("/api/v1/users/me");
    expect(afterDelete.status).toBe(401);

    const redis = getRedis();
    expect(await redis.get(user.sessionToken)).toBeNull();
    expect(await redis.get(deviceB.sessionToken)).toBeNull();
    expect(await redis.get(`active-sessions-${user.id}`)).toBeNull();
    expect(await exists(deviceBCacheKey)).toBe(false);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it("stops the account's API keys authenticating immediately", async () => {
    const user = await createUserWithSession();
    const created = await ApiKeyService.generateKey(user.id, { name: "deletion-test" });
    const authCacheKey = `apikey:auth:${hashKey(created.key)}`;

    const warm = await request(app).get("/api/v1/users/me").set("X-API-Key", created.key);
    expect(warm.status).toBe(200);
    expect(await exists(authCacheKey)).toBe(true);

    const cachedBefore = await cacheGet<Record<string, unknown>>(authCacheKey);
    expect(cachedBefore).not.toBeNull();

    const deleted = await withCookie(user.cookie).delete("/api/v1/users/me");
    expect(deleted.status).toBe(200);

    expect(await exists(authCacheKey)).toBe(false);
    const afterDelete = await request(app).get("/api/v1/users/me").set("X-API-Key", created.key);
    expect(afterDelete.status).toBe(401);

    // The V-122 race: a validateKey that read the row before the delete committed writes the
    // stale active record after the DEL. Replay that write and the key must still fail.
    await cacheSet(authCacheKey, cachedBefore, 300);
    const replayed = await request(app).get("/api/v1/users/me").set("X-API-Key", created.key);
    expect(replayed.status).toBe(401);
  });

  it("refuses with 409 while an affiliate withdrawal is REQUESTED or APPROVED", async () => {
    const user = await createUserWithSession();
    await prisma.affiliateWithdrawal.create({
      data: { userId: user.id, amountCents: 2500, status: "APPROVED" },
    });

    const deleted = await withCookie(user.cookie).delete("/api/v1/users/me");
    expect(deleted.status).toBe(409);
    expect(deleted.body.message).toBe(
      "You have a withdrawal in progress. Wait for it to be paid or rejected before deleting your account.",
    );
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await prisma.affiliateWithdrawal.count({ where: { userId: user.id } })).toBe(1);
  });

  it("clears the public share snapshot and the other per-user cache keys", async () => {
    const user = await createUserWithSession({ username: `shared${randomUUID().slice(0, 8)}` });
    const username = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).username!;

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        slug: "my-resume",
        title: "My resume",
        content: { basics: { name: "Shared" } },
      },
    });
    await prisma.shareLink.create({
      data: {
        userId: user.id,
        documentId: document.id,
        slug: "public-slug",
        snapshot: { basics: { name: "Shared" } },
      },
    });

    // Share snapshots, documents and the lists are generation namespaces: deletion must move
    // each one to a new generation, which strands every key written under the old one.
    const namespaces = [
      cacheNamespaces.publicShare(username),
      cacheNamespaces.document(user.id, document.id),
      cacheNamespaces.documentList(user.id),
      cacheNamespaces.shareList(user.id),
      cacheNamespaces.sharedDocumentIds(user.id),
      // The master profile read is a generation too (V-244).
      cacheNamespaces.masterProfile(user.id),
    ];
    const generationsBefore = await Promise.all(namespaces.map((ns) => getGeneration(ns)));

    const keys = [
      `user:profile:v2:${user.id}`,
      `billing:summary:${user.id}`,
      `billing:history:${user.id}`,
      `credits:summary:${user.id}`,
      `credits:history:v3:${user.id}`,
      `affiliate:dashboard:${user.id}`,
    ];
    for (const key of keys) await cacheSet(key, { stale: true }, 3600);
    for (const key of keys) expect(await exists(key), key).toBe(true);

    const deleted = await withCookie(user.cookie).delete("/api/v1/users/me");
    expect(deleted.status).toBe(200);

    for (const key of keys) expect(await exists(key), key).toBe(false);
    for (const [index, ns] of namespaces.entries())
      expect(await getGeneration(ns), ns).not.toBe(generationsBefore[index]);
  });
});

describe("admin account deletion (V-119 / V-102)", () => {
  it("returns 200 for a user who spent credits (committed reservation with allocation rows)", async () => {
    const adminUser = await admin();
    const target = await createUserWithSession();

    const wallet = await prisma.creditWallet.create({
      data: {
        userId: target.id,
        balance: 90,
        reserved: 0,
        lifetimeCredited: 100,
        lifetimeDebited: 10,
      },
    });
    const grant = await prisma.creditGrant.create({
      data: {
        walletId: wallet.id,
        userId: target.id,
        amount: 100,
        remaining: 90,
        source: "subscription",
        sourceId: "sub_test",
      },
    });
    const debit = await prisma.creditTransaction.create({
      data: {
        walletId: wallet.id,
        userId: target.id,
        type: "DEBIT",
        amount: -10,
        balanceAfter: 90,
        action: "ats_score",
        requestId: `req_${randomUUID()}`,
      },
    });
    await prisma.creditUsageAllocation.create({
      data: { transactionId: debit.id, grantId: grant.id, amount: 10 },
    });
    await prisma.creditReservation.create({
      data: {
        walletId: wallet.id,
        userId: target.id,
        requestId: debit.requestId!,
        action: "ats_score",
        cost: 10,
        status: "COMMITTED",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", adminUser.cookie)
      .send({ confirmEmail: target.email, reason: "integration test cleanup" });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    // V-183: the ledger is a billing record and outlives the account, detached from it.
    expect(await prisma.creditUsageAllocation.count({ where: { grantId: grant.id } })).toBe(1);
    expect(await prisma.creditGrant.count({ where: { userId: target.id } })).toBe(0);
    expect((await prisma.creditGrant.findUnique({ where: { id: grant.id } }))?.userId).toBeNull();
  });

  it("refuses with 409 naming the open withdrawal, and keeps the user", async () => {
    const adminUser = await admin();
    const target = await createUserWithSession();
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: { userId: target.id, amountCents: 2500, status: "REQUESTED" },
    });

    const response = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", adminUser.cookie)
      .send({ confirmEmail: target.email, reason: "integration test cleanup" });

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.message).toContain(withdrawal.id);
    expect(response.body.message).toContain("REQUESTED");
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
    expect(await prisma.affiliateWithdrawal.count({ where: { id: withdrawal.id } })).toBe(1);
  });

  it("stops the deleted account's API keys even against a racing cache write", async () => {
    const adminUser = await admin();
    const target = await createUserWithSession();
    const created = await ApiKeyService.generateKey(target.id, { name: "admin-deletion-test" });
    const authCacheKey = `apikey:auth:${hashKey(created.key)}`;

    const warm = await request(app).get("/api/v1/users/me").set("X-API-Key", created.key);
    expect(warm.status).toBe(200);
    const cachedBefore = await cacheGet<Record<string, unknown>>(authCacheKey);
    expect(cachedBefore).not.toBeNull();

    const response = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", adminUser.cookie)
      .send({ confirmEmail: target.email, reason: "integration test cleanup" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    expect((await request(app).get("/api/v1/users/me").set("X-API-Key", created.key)).status).toBe(
      401,
    );

    await cacheSet(authCacheKey, cachedBefore, 300);
    expect((await request(app).get("/api/v1/users/me").set("X-API-Key", created.key)).status).toBe(
      401,
    );
  });
});
