import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { JOB_LAST_SUCCESS_KEY, recordJobSuccess } from "#lib/metrics";
import { UserService } from "#services/userService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import { createSessionForUser, seedBetterAuthSessionEntries } from "./helpers/sessions.js";

/**
 * Phase 11 group 4a, auth and platform: V-315 a session revoked while Redis refuses the delete is
 * not reported revoked, V-316 a username cannot be replaced by a racing second set, V-317 a slow
 * profile read cannot put the old row back over a write, V-320 the job-success hash expires.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function me(cookie: string) {
  return request(app).get("/api/v1/users/me").set("Origin", STUDIO_ORIGIN).set("Cookie", cookie);
}

describe("V-315 revoking another device while Redis refuses the delete", () => {
  it("fails the request and keeps the session, rather than answer 200 and leave it alive in Redis", async () => {
    const user = await createUserWithSession();
    const other = await createSessionForUser(user.id);
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken, other.sessionToken]);
    expect((await me(other.cookie)).status).toBe(200);

    const redis = getRedis();
    const realDel = redis.del.bind(redis);
    const del = vi.spyOn(redis, "del").mockImplementation((async (...args: unknown[]) => {
      const keys = (Array.isArray(args[0]) ? args[0] : [args[0]]) as string[];
      if (keys.includes(other.sessionToken)) throw new Error("Redis connection lost");
      return (realDel as (...a: unknown[]) => Promise<number>)(...args);
    }) as typeof redis.del);

    const revoke = await request(app)
      .post("/api/v1/auth/revoke-other-sessions")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({});
    expect(revoke.status, JSON.stringify(revoke.body)).toBeGreaterThanOrEqual(500);
    // Nothing was revoked, and nothing claims it was: the row is still there.
    expect(await prisma.session.count({ where: { token: other.sessionToken } })).toBe(1);

    // Redis is back: the retry revokes it, and the other device is signed out.
    del.mockRestore();
    const retry = await request(app)
      .post("/api/v1/auth/revoke-other-sessions")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({});
    expect(retry.status, JSON.stringify(retry.body)).toBe(200);
    expect(await redis.exists(other.sessionToken)).toBe(0);
    expect((await me(other.cookie)).status).toBe(401);
  });
});

describe("V-316 a username is set once, even by two requests at once", () => {
  it("answers 409 to the second set that read the account before the first committed", async () => {
    const user = await createUserWithSession();
    await prisma.user.update({ where: { id: user.id }, data: { username: null } });

    // The second request read the row while it still had no username.
    const stale = { id: user.id, username: null };
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(stale as never);
    await prisma.user.update({ where: { id: user.id }, data: { username: "first-name" } });

    await expect(UserService.updateUsername(user.id, "second-name")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).username).toBe(
      "first-name",
    );
  });
});

describe("V-317 the account read is never re-cached from before a write", () => {
  it("keeps the written row when a read that loaded earlier finishes after the write", async () => {
    const user = await createUserWithSession();
    await prisma.user.update({ where: { id: user.id }, data: { autoSyncEnabled: false } });
    await getRedis().del(`user:profile:v2:${user.id}`);

    const findUnique = prisma.user.findUnique.bind(prisma.user);
    vi.spyOn(prisma.user, "findUnique").mockImplementationOnce((async (args: never) => {
      const before = await findUnique(args);
      // The write commits and refreshes the cache while this read is still on its way back.
      await UserService.updateAutoSync(user.id, true);
      return before;
    }) as never);

    const raced = (await UserService.getUserById(user.id)) as { autoSyncEnabled: boolean };
    expect(raced.autoSyncEnabled).toBe(false);

    const next = (await UserService.getUserById(user.id)) as { autoSyncEnabled: boolean };
    expect(next.autoSyncEnabled).toBe(true);
  });
});

describe("V-320 the job-success hash expires like every other key", () => {
  it("has a TTL after a success is recorded", async () => {
    await getRedis().del(JOB_LAST_SUCCESS_KEY);
    recordJobSuccess("views-flush");

    await vi.waitFor(async () => {
      expect(await getRedis().hGet(JOB_LAST_SUCCESS_KEY, "views-flush")).not.toBeNull();
      expect(await getRedis().ttl(JOB_LAST_SUCCESS_KEY)).toBeGreaterThan(0);
    });
  });
});

describe("V-315 account deletion when the session revoke cannot reach Redis", () => {
  it("answers 503 and keeps the account, rather than delete it with its sessions alive in Redis", async () => {
    const user = await createUserWithSession();
    const other = await createSessionForUser(user.id);
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken, other.sessionToken]);

    const redis = getRedis();
    const realDel = redis.del.bind(redis);
    vi.spyOn(redis, "del").mockImplementation((async (...args: unknown[]) => {
      const keys = (Array.isArray(args[0]) ? args[0] : [args[0]]) as string[];
      if (keys.includes(other.sessionToken)) throw new Error("Redis connection lost");
      return (realDel as (...a: unknown[]) => Promise<number>)(...args);
    }) as typeof redis.del);

    const response = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(response.status, JSON.stringify(response.body)).toBe(503);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
