import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { cacheSet, getRedis } from "#lib/redis";
import { generationalKey, getGeneration } from "#lib/cacheGeneration";
import { userProfileCacheKey } from "#lib/cacheKeys";
import { dashboardCacheKey, leaderboardCacheKey } from "#services/affiliate/cache";
import { CHANGELOG_CACHE_KEYS } from "#services/changelog/cache";
import { CreditService } from "#services/creditService";
import { ROADMAP_CACHE_NAMESPACES } from "#services/roadmapService";
import { UserService } from "#services/userService";
import {
  PUBLIC_LIST_CACHE_NAMESPACE,
  publicPortfolioCacheNamespace,
} from "#utils/portfolioPublicationCache";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-356: `POST /admin/system/cache/flush` targets hand-copied prefixes. Each case writes the real
 * key through the code that owns it (its builder, or the service that caches it), flushes, and
 * checks the key is gone. A renamed key or a version bump that leaves the prefix behind makes the
 * flush delete nothing while it still answers 200; this fails instead.
 */
let adminPromise: Promise<TestUser> | undefined;
const admin = () => (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));

async function flush(prefix: string) {
  const response = await request(app)
    .post("/api/v1/admin/system/cache/flush")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", (await admin()).cookie)
    .send({ prefix, reason: "integration cache flush" });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
}

const keysContaining = (fragment: string) => getRedis().keys(`*${fragment}*`);
const exists = async (key: string) => (await getRedis().exists(key)) === 1;

describe("admin cache flush reaches the real keys (V-356)", () => {
  it("credits: the summary and history the credit service cached", async () => {
    const user = await createUserWithSession();
    const id = randomUUID();
    await CreditService.grant(user.id, 10, {
      requestId: `grant:${id}`,
      source: "test",
      sourceId: id,
    });
    await CreditService.getWallet(user.id);
    await CreditService.getHistory(user.id);
    const cached = (await keysContaining(user.id)).filter((key) => key.startsWith("credits"));
    expect(cached.length).toBeGreaterThanOrEqual(2);

    await flush("credits");

    for (const key of cached) expect(await exists(key), key).toBe(false);
  });

  it("user:profile: the account read the user service cached", async () => {
    const user = await createUserWithSession();
    await UserService.getUserById(user.id);
    expect(await exists(userProfileCacheKey(user.id))).toBe(true);

    await flush("user:profile");

    expect(await exists(userProfileCacheKey(user.id))).toBe(false);
  });

  it("affiliate: dashboards and both leaderboards", async () => {
    const keys = [
      dashboardCacheKey(randomUUID()),
      leaderboardCacheKey("monthly"),
      leaderboardCacheKey("all_time"),
    ];
    for (const key of keys) await cacheSet(key, { cached: true }, 600);

    await flush("affiliate");

    for (const key of keys) expect(await exists(key), key).toBe(false);
  });

  it("portfolio:public: a cached public site, and the public list's generation moves", async () => {
    const namespace = publicPortfolioCacheNamespace(`site${randomUUID().slice(0, 8)}`);
    const siteKey = generationalKey(namespace, "1", "page");
    await cacheSet(siteKey, { cached: true }, 600);
    const listBefore = await getGeneration(PUBLIC_LIST_CACHE_NAMESPACE);

    await flush("portfolio:public");

    expect(await exists(siteKey)).toBe(false);
    expect(await getGeneration(PUBLIC_LIST_CACHE_NAMESPACE)).not.toBe(listBefore);
  });

  it.each([
    [
      "changelog",
      [
        CHANGELOG_CACHE_KEYS.LIST_NAMESPACE,
        CHANGELOG_CACHE_KEYS.ENTRY_NAMESPACE,
        CHANGELOG_CACHE_KEYS.STATS_NAMESPACE,
      ],
    ],
    ["roadmap", Object.values(ROADMAP_CACHE_NAMESPACES)],
  ])("%s: every generation namespace moves", async (prefix, namespaces) => {
    const before = await Promise.all(namespaces.map((namespace) => getGeneration(namespace)));

    await flush(prefix);

    const after = await Promise.all(namespaces.map((namespace) => getGeneration(namespace)));
    after.forEach((generation, index) => expect(generation).not.toBe(before[index]));
  });

  it("never touches a session record or a lock that shares a family name", async () => {
    await getRedis().set("auth:session:keep-me", "1", { EX: 600 });
    await getRedis().set(CHANGELOG_CACHE_KEYS.RELEASE_SYNC_LOCK, "1", { EX: 600 });

    for (const prefix of ["credits", "user:profile", "affiliate", "portfolio:public", "changelog"])
      await flush(prefix);

    expect(await exists("auth:session:keep-me")).toBe(true);
    expect(await exists(CHANGELOG_CACHE_KEYS.RELEASE_SYNC_LOCK)).toBe(true);
  });
});
