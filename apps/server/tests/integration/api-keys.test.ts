import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";
import { ApiKeyService, hashKey } from "#services/apiKeyService";
import { revokeApiKey, updateApiKey } from "#services/admin/adminApiKeyService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * API keys through the real stack: session-cookie management routes, then the key itself on
 * `GET /api/v1/users/me` via `flexibleAuth` → `apiKeyAuth` → the Redis rate limiter. Covers
 * V-123 (rotate atomicity), V-051 (expired rotate), V-140 (subscription-row gate), the `name`
 * validation LOW, and the API-key half of V-122 (revoked key must stop authenticating at once).
 */

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

type CreatedKey = { id: string; key: string };

async function createKey(user: TestUser, body: Record<string, unknown> = {}): Promise<CreatedKey> {
  const response = await asUser(user)
    .post("/api/v1/api-keys")
    .send({ name: "integration key", ...body });

  expect(response.status).toBe(201);
  expect(response.body.data.key).toMatch(/^vw_[a-f0-9]{64}$/);

  return { id: response.body.data.id, key: response.body.data.key };
}

function requestWithKey(key: string) {
  return request(app).get("/api/v1/users/me").set("X-API-Key", key);
}

/** Rows that would authenticate right now: the server's validity rule, applied in SQL. */
async function activeKeyCount(userId: string) {
  return prisma.apiKey.count({
    where: {
      userId,
      isActive: true,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * validateKey() repopulates the auth cache with a fire-and-forget `void setAuthCache`, so the
 * entry can land a tick after the HTTP response. Poll briefly instead of reading once.
 */
async function waitForAuthCache(keyHash: string) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const cached = await cacheGet<Record<string, unknown>>(`apikey:auth:${keyHash}`);
    if (cached) return cached;
    await sleep(20);
  }

  throw new Error(`auth cache for ${keyHash.slice(0, 8)} never populated`);
}

function revokedMarker(keyHash: string) {
  return cacheGet<number>(`apikey:revoked:${keyHash}`);
}

/**
 * Runs `fn` while `keyId`'s row is locked by an outer transaction that has already retired it
 * (and, when `replacementRaw` is given, inserted the winner's new key, as a committed rotate
 * does). `fn`'s own conditional `updateMany` blocks on the row lock until the outer transaction
 * commits, then re-evaluates its WHERE against the committed row. This is the race that two
 * supertest requests on one event loop never reproduce: there, the loser is turned away by the
 * `findFirst` precheck, never by the `updateMany` count.
 */
async function whileRowRetired<T>(
  keyId: string,
  userId: string,
  replacementRaw: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  let pending: Promise<T> | undefined;

  await prisma.$transaction(
    async (tx) => {
      await tx.apiKey.update({
        where: { id: keyId },
        data: { isActive: false, revokedAt: new Date() },
      });

      if (replacementRaw) {
        await tx.apiKey.create({
          data: {
            keyHash: hashKey(replacementRaw),
            keyPrefix: replacementRaw.slice(0, 8),
            keySuffix: replacementRaw.slice(-8),
            name: "winner",
            userId,
          },
        });
      }

      // Start the contender now (not awaited: it cannot finish until we commit) and give it time
      // to pass its precheck and block on the lock.
      pending = fn();
      await sleep(300);
    },
    { timeout: 10_000 },
  );

  // The winner's own post-commit step (a real rotate/revoke writes the marker and drops the auth
  // entry for the retired hash). Without it the warm cache would keep answering for the old key
  // regardless of what the contender did, which is what (g)/(g2)/(h) cover, not these races.
  await ApiKeyService.markRevokedById(keyId);

  return pending!;
}

function rawKey() {
  return `vw_${randomBytes(32).toString("hex")}`;
}

describe("API keys through the real stack", () => {
  it("(a) a key created with a session authenticates GET /users/me", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);

    const me = await requestWithKey(created.key);

    expect(me.status).toBe(200);
    expect(me.body.success).toBe(true);
    expect(me.body.data.id).toBe(user.id);

    // Management routes are session-only: the key cannot manage keys.
    const list = await request(app).get("/api/v1/api-keys").set("X-API-Key", created.key);
    expect(list.status).toBe(401);
  });

  it("(b) two concurrent rotates leave exactly one live key", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200); // warms the auth cache

    const [first, second] = await Promise.all([
      asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({}),
      asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({}),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = first.status === 201 ? first : second;
    const loser = first.status === 201 ? second : first;
    expect(loser.body.message).toBe("Key is no longer active");
    expect(winner.body.data.rotatedFromId).toBe(created.id);

    expect(await activeKeyCount(user.id)).toBe(1);
    expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(2);

    expect((await requestWithKey(created.key)).status).toBe(401);
    expect((await requestWithKey(winner.body.data.key)).status).toBe(200);

    // A third rotate of the retired key is a conflict, not "not found".
    const again = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(again.status).toBe(409);
    expect(again.body.message).toBe("Key is no longer active");

    const missing = await asUser(user).post(`/api/v1/api-keys/does-not-exist/rotate`).send({});
    expect(missing.status).toBe(404);
  });

  it("(b-race) a rotate that loses the row to a concurrent rotate is refused by the updateMany count", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    const winnerRaw = rawKey();

    // The outer transaction plays the winning rotate (retire + insert) and holds the lock while
    // the contender runs; the contender's precheck still sees an active row.
    const loser = await whileRowRetired(created.id, user.id, winnerRaw, () =>
      asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({}),
    );

    expect(loser.status).toBe(409);
    expect(loser.body.message).toBe("Key is no longer active");

    expect(await activeKeyCount(user.id)).toBe(1);
    expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.apiKey.count({ where: { userId: user.id, name: "winner" } })).toBe(1);

    expect((await requestWithKey(created.key)).status).toBe(401);
    expect((await requestWithKey(winnerRaw)).status).toBe(200);
  });

  it("(c) rotate racing revoke never resurrects access", async () => {
    // Invariant: afterwards the old key never authenticates; if rotate answered 201 its key is the
    // single live row and authenticates, if rotate answered 409 (revoke committed first) the user
    // has no live key at all. A revoked key is never silently replaced by a live one.
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    const [rotate, revoke] = await Promise.all([
      asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({}),
      asUser(user).post(`/api/v1/api-keys/${created.id}/revoke`).send({}),
    ]);

    expect([200, 404]).toContain(revoke.status);
    expect([201, 409]).toContain(rotate.status);

    expect((await requestWithKey(created.key)).status).toBe(401);

    if (rotate.status === 201) {
      expect(await activeKeyCount(user.id)).toBe(1);
      expect((await requestWithKey(rotate.body.data.key)).status).toBe(200);
    } else {
      expect(await activeKeyCount(user.id)).toBe(0);
      expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(1);
    }
  });

  it("(c-race) a rotate blocked behind a committing revoke ends 409 and creates nothing", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    // Outer transaction = the revoke (retire, no replacement). Rotate passes its precheck on the
    // still-committed active row, blocks on updateMany, then sees revokedAt set → count 0.
    const rotate = await whileRowRetired(created.id, user.id, null, () =>
      asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({}),
    );

    expect(rotate.status).toBe(409);
    expect(rotate.body.message).toBe("Key is no longer active");

    expect(await activeKeyCount(user.id)).toBe(0);
    expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(1);
    expect((await requestWithKey(created.key)).status).toBe(401);
  });

  it("(c2-race) a revoke blocked behind a committing rotate is an idempotent 200 that keeps the new key", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    const before = await prisma.apiKey.findUniqueOrThrow({ where: { id: created.id } });
    const winnerRaw = rawKey();

    const revoke = await whileRowRetired(created.id, user.id, winnerRaw, () =>
      asUser(user).post(`/api/v1/api-keys/${created.id}/revoke`).send({}),
    );

    expect(revoke.status).toBe(200);

    // The rotate's revokedAt stands; the late revoke did not overwrite it.
    const after = await prisma.apiKey.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.revokedAt).not.toBeNull();
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    const retiredAt = after.revokedAt!.getTime();

    const again = await asUser(user).post(`/api/v1/api-keys/${created.id}/revoke`).send({});
    expect(again.status).toBe(200);
    const unchanged = await prisma.apiKey.findUniqueOrThrow({ where: { id: created.id } });
    expect(unchanged.revokedAt!.getTime()).toBe(retiredAt);
    expect(unchanged.updatedAt.getTime()).toBe(after.updatedAt.getTime());

    expect(await activeKeyCount(user.id)).toBe(1);
    expect((await requestWithKey(created.key)).status).toBe(401);
    expect((await requestWithKey(winnerRaw)).status).toBe(200);
  });

  it("(d) a valid key authenticates a user whose latest subscription row is CANCELED", async () => {
    const user = await createUserWithSession();

    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_${user.id}`,
        productKey: "ai_credits",
        status: "CANCELED",
        rawStatus: "cancelled",
      },
    });

    const created = await createKey(user);

    const cold = await requestWithKey(created.key);
    expect(cold.status).toBe(200);

    const warm = await requestWithKey(created.key);
    expect(warm.status).toBe(200);

    // An INACTIVE row (past_due / paused / pending all map here) must not kill the key either.
    await prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: "INACTIVE" },
    });
    await ApiKeyService.invalidateAuthCacheForUser(user.id);
    expect((await requestWithKey(created.key)).status).toBe(200);
  });

  it("(e) an expired key cannot be rotated and a past expiresAt is rejected", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);

    const past = new Date(Date.now() - 60_000);
    await prisma.apiKey.update({ where: { id: created.id }, data: { expiresAt: past } });

    expect((await requestWithKey(created.key)).status).toBe(401);

    const rotated = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(rotated.status).toBe(409);
    expect(rotated.body.message).toBe("Key has expired, create a new one");

    // Nothing was created and the expired key was not touched.
    expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(1);
    const row = await prisma.apiKey.findUnique({ where: { id: created.id } });
    expect(row?.isActive).toBe(true);
    expect(row?.revokedAt).toBeNull();

    const pastOnCreate = await asUser(user)
      .post("/api/v1/api-keys")
      .send({ name: "past", expiresAt: past.toISOString() });
    expect(pastOnCreate.status).toBe(400);

    const live = await createKey(user);
    const pastOnRotate = await asUser(user)
      .post(`/api/v1/api-keys/${live.id}/rotate`)
      .send({ expiresAt: past.toISOString() });
    expect(pastOnRotate.status).toBe(400);
    expect(await activeKeyCount(user.id)).toBe(1);
  });

  it("(e2) rotate carries a future expiresAt over to the new key", async () => {
    const user = await createUserWithSession();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const created = await createKey(user, { expiresAt: future.toISOString() });

    const rotated = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(rotated.status).toBe(201);
    expect(new Date(rotated.body.data.expiresAt).getTime()).toBe(future.getTime());
  });

  it("(e3) expiresAt must be an ISO-8601 timestamp with a zone; offset forms are accepted", async () => {
    const user = await createUserWithSession();

    for (const expiresAt of ["2030-01-01T00:00:00", "2030-01-01", "next year", 1893456000000]) {
      const response = await asUser(user)
        .post("/api/v1/api-keys")
        .send({ name: "zoneless", expiresAt });
      expect(response.status, `expiresAt=${JSON.stringify(expiresAt)}`).toBe(400);
    }

    const withOffset = await asUser(user)
      .post("/api/v1/api-keys")
      .send({ name: "offset", expiresAt: "2030-01-01T05:30:00+05:30" });
    expect(withOffset.status).toBe(201);
    expect(new Date(withOffset.body.data.expiresAt).toISOString()).toBe("2030-01-01T00:00:00.000Z");

    const blank = await asUser(user)
      .post("/api/v1/api-keys")
      .send({ name: "blank", expiresAt: "" });
    expect(blank.status).toBe(201);
    expect(blank.body.data.expiresAt).not.toBeNull();
  });

  it("(f) a non-string or oversized name is a 400, not a 500", async () => {
    const user = await createUserWithSession();

    for (const name of [12345, "", "   ", "x".repeat(101), { a: 1 }, null]) {
      const response = await asUser(user).post("/api/v1/api-keys").send({ name });
      expect(response.status, `name=${JSON.stringify(name)}`).toBe(400);
    }

    const missing = await asUser(user).post("/api/v1/api-keys").send({});
    expect(missing.status).toBe(400);

    const trimmed = await asUser(user).post("/api/v1/api-keys").send({ name: "  padded  " });
    expect(trimmed.status).toBe(201);
    expect(trimmed.body.data.name).toBe("padded");

    const badRotate = await asUser(user)
      .post(`/api/v1/api-keys/${trimmed.body.data.id}/rotate`)
      .send({ name: 12345 });
    expect(badRotate.status).toBe(400);
    expect(await activeKeyCount(user.id)).toBe(1);

    const keptName = await asUser(user)
      .post(`/api/v1/api-keys/${trimmed.body.data.id}/rotate`)
      .send({ name: null });
    expect(keptName.status).toBe(201);
    expect(keptName.body.data.name).toBe("padded");
  });

  it("(g) a revoked key stops authenticating immediately, even against a warm or racing cache", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);

    expect((await requestWithKey(created.key)).status).toBe(200);

    const keyHash = hashKey(created.key);
    const cachedBefore = await waitForAuthCache(keyHash);
    expect(await revokedMarker(keyHash)).toBeNull();

    const revoked = await asUser(user).post(`/api/v1/api-keys/${created.id}/revoke`).send({});
    expect(revoked.status).toBe(200);

    expect(await revokedMarker(keyHash)).not.toBeNull();
    expect((await requestWithKey(created.key)).status).toBe(401);

    // The V-122 race: a validateKey that read the row before the revoke committed writes the
    // stale active record after the revoke's DEL. Replay that write and the key must still fail.
    await cacheSet(`apikey:auth:${keyHash}`, cachedBefore, 300);
    expect((await requestWithKey(created.key)).status).toBe(401);

    // Rotating a revoked key is 409 and must not resurrect it.
    const rotated = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(rotated.status).toBe(409);
    expect(await activeKeyCount(user.id)).toBe(0);
  });

  it("(g2) the retired half of a rotate stops authenticating even against a racing cache write", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    const keyHash = hashKey(created.key);
    const cachedBefore = await waitForAuthCache(keyHash);

    const rotated = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(rotated.status).toBe(201);
    expect(await revokedMarker(keyHash)).not.toBeNull();

    await cacheSet(`apikey:auth:${keyHash}`, cachedBefore, 300);
    expect((await requestWithKey(created.key)).status).toBe(401);
    expect((await requestWithKey(rotated.body.data.key)).status).toBe(200);
  });

  it("(h) admin revoke and admin disable write the revoked marker; a rate-limit edit does not", async () => {
    const user = await createUserWithSession();

    const revokedKey = await createKey(user, { name: "admin-revoked" });
    const disabledKey = await createKey(user, { name: "admin-disabled" });
    const limitedKey = await createKey(user, { name: "admin-limited" });

    for (const key of [revokedKey, disabledKey, limitedKey]) {
      expect((await requestWithKey(key.key)).status).toBe(200);
    }

    const revokedHash = hashKey(revokedKey.key);
    const disabledHash = hashKey(disabledKey.key);
    const limitedHash = hashKey(limitedKey.key);

    const revokedCached = await waitForAuthCache(revokedHash);
    const disabledCached = await waitForAuthCache(disabledHash);
    await waitForAuthCache(limitedHash);

    // Admin revoke (service-level: the admin route needs the configured admin session).
    await revokeApiKey(revokedKey.id);
    expect(await revokedMarker(revokedHash)).not.toBeNull();
    expect((await requestWithKey(revokedKey.key)).status).toBe(401);
    await cacheSet(`apikey:auth:${revokedHash}`, revokedCached, 300); // replay the V-122 race
    expect((await requestWithKey(revokedKey.key)).status).toBe(401);

    // Admin disable.
    await updateApiKey(disabledKey.id, { isActive: false, reason: "integration disable" });
    expect(await revokedMarker(disabledHash)).not.toBeNull();
    expect((await requestWithKey(disabledKey.key)).status).toBe(401);
    await cacheSet(`apikey:auth:${disabledHash}`, disabledCached, 300);
    expect((await requestWithKey(disabledKey.key)).status).toBe(401);

    // A rate-limit edit is a plain cache drop: no marker, key keeps working.
    await updateApiKey(limitedKey.id, { rateLimit: 5, reason: "integration limit" });
    expect(await revokedMarker(limitedHash)).toBeNull();
    expect(await cacheGet(`apikey:auth:${limitedHash}`)).toBeNull();
    expect((await requestWithKey(limitedKey.key)).status).toBe(200);

    // The user's own plain cache drop writes no marker either (the billing/deletion path).
    await ApiKeyService.invalidateAuthCacheForUser(user.id);
    expect(await revokedMarker(limitedHash)).toBeNull();
    expect((await requestWithKey(limitedKey.key)).status).toBe(200);
  });

  it("(h2) admin Enable after Disable clears the revoked marker, so the key works at once (V-188)", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user, { name: "admin-toggled" });
    const keyHash = hashKey(created.key);
    expect((await requestWithKey(created.key)).status).toBe(200);

    await updateApiKey(created.id, { isActive: false, reason: "integration disable" });
    expect(await revokedMarker(keyHash)).not.toBeNull();
    expect((await requestWithKey(created.key)).status).toBe(401);

    await updateApiKey(created.id, { isActive: true, reason: "integration enable" });
    expect(await revokedMarker(keyHash)).toBeNull();
    expect((await requestWithKey(created.key)).status).toBe(200);
  });

  it("(h3) admin Enable on a revoked key keeps it dead and keeps the marker", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user, { name: "admin-revoked-then-enabled" });
    const keyHash = hashKey(created.key);

    await revokeApiKey(created.id);
    await updateApiKey(created.id, { isActive: true, reason: "integration enable" });
    expect(await revokedMarker(keyHash)).not.toBeNull();
    expect((await requestWithKey(created.key)).status).toBe(401);
  });

  it("(i) a revoked key is deleted with the marker already in place", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    expect((await requestWithKey(created.key)).status).toBe(200);

    const keyHash = hashKey(created.key);
    const cachedBefore = await waitForAuthCache(keyHash);

    const deleted = await request(app)
      .delete(`/api/v1/api-keys/${created.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(deleted.status).toBe(200);

    expect(await revokedMarker(keyHash)).not.toBeNull();
    await cacheSet(`apikey:auth:${keyHash}`, cachedBefore, 300);
    expect((await requestWithKey(created.key)).status).toBe(401);
    expect(await prisma.apiKey.count({ where: { userId: user.id } })).toBe(0);
  });

  it("(j) the key list carries expiresAt and revokedAt, so an expired or revoked key can be labelled (V-195)", async () => {
    const user = await createUserWithSession();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const live = await createKey(user, { name: "listed-live", expiresAt: future.toISOString() });
    const revoked = await createKey(user, { name: "listed-revoked" });
    await asUser(user).post(`/api/v1/api-keys/${revoked.id}/revoke`).send({});

    const list = await asUser(user).get("/api/v1/api-keys");
    expect(list.status).toBe(200);
    const rows = list.body.data.items as Array<Record<string, unknown>>;
    const liveRow = rows.find((row) => row.id === live.id);
    const revokedRow = rows.find((row) => row.id === revoked.id);

    expect(liveRow).toHaveProperty("revokedAt", null);
    expect(new Date(liveRow?.expiresAt as string).getTime()).toBe(future.getTime());
    expect(typeof revokedRow?.revokedAt).toBe("string");
    expect(revokedRow).toHaveProperty("expiresAt");
  });

  it("(k) rotate keeps an admin-raised rate limit unless the caller sends a new one, which is clamped (V-196)", async () => {
    const user = await createUserWithSession();
    const created = await createKey(user);
    await updateApiKey(created.id, { rateLimit: 5_000, reason: "integration raise" });

    const kept = await asUser(user).post(`/api/v1/api-keys/${created.id}/rotate`).send({});
    expect(kept.status).toBe(201);
    expect(kept.body.data.rateLimit).toBe(5_000);

    const asked = await asUser(user)
      .post(`/api/v1/api-keys/${kept.body.data.id}/rotate`)
      .send({ rateLimit: 5_000 });
    expect(asked.status).toBe(201);
    expect(asked.body.data.rateLimit).toBeLessThan(5_000);
  });
});

describe("V-242 a user's live keys are capped", () => {
  it("the eleventh live key is a 409 API_KEY_LIMIT; revoking one frees a slot", async () => {
    const user = await createUserWithSession();
    const keys: CreatedKey[] = [];
    for (let i = 0; i < 10; i++) keys.push(await createKey(user, { name: `key ${i}` }));

    const refused = await asUser(user).post("/api/v1/api-keys").send({ name: "one too many" });
    expect(refused.status).toBe(409);
    expect(refused.body.details?.code).toBe("API_KEY_LIMIT");
    expect(refused.body.details?.limit).toBe(10);

    const revoked = await asUser(user).post(`/api/v1/api-keys/${keys[0].id}/revoke`);
    expect(revoked.status).toBe(200);
    await createKey(user, { name: "replacement" });
  });

  it("two racing creates at the cap leave exactly ten live keys", async () => {
    const user = await createUserWithSession();
    for (let i = 0; i < 9; i++) await createKey(user, { name: `key ${i}` });

    const results = await Promise.all(
      [0, 1].map((i) =>
        asUser(user)
          .post("/api/v1/api-keys")
          .send({ name: `race ${i}` }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null } })).toBe(10);
  });
});

describe("V-256 the API-key gate is a convenience, documented as such", () => {
  it("a non-browser client naming the studio origin is served as an anonymous caller; one with no origin gets API_KEY_REQUIRED", async () => {
    const withOrigin = await request(app).get("/api/v1/roadmap").set("Origin", STUDIO_ORIGIN);
    expect(withOrigin.status).not.toBe(401);

    const bare = await request(app).get("/api/v1/roadmap");
    expect(bare.status).toBe(401);
    expect(bare.body.details?.code).toBe("API_KEY_REQUIRED");

    // Anonymous all the same: an account route behind the same gate still wants a session.
    const account = await request(app).get("/api/v1/documents").set("Origin", STUDIO_ORIGIN);
    expect(account.status).toBe(401);
  });
});
