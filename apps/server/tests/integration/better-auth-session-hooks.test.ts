import type { Request } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { cacheGet } from "#lib/redis";
import { getSessionUserFromRequest } from "#middleware/auth";
import { sessionCacheKeyForToken } from "#utils/authCache";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import { createSessionForUser, seedBetterAuthSessionEntries } from "./helpers/sessions.js";

/**
 * V-382: the app keeps its own token-keyed session cache (`auth:session:`). better-auth's own
 * routes that end a session or change the user reach it only through the `session.delete.after`
 * and `user.update.after` hooks. A hook dropped or renamed in an upgrade would leave a revoked
 * session authenticating, or a stale email in the admin and payments gates, for the cache's TTL.
 */
function withCookie(cookie: string) {
  return {
    get: (url: string) => request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", cookie),
    post: (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", cookie),
  };
}

async function warmCache(cookie: string, token: string) {
  expect((await withCookie(cookie).get("/api/v1/users/me")).status).toBe(200);
  expect(await cacheGet(sessionCacheKeyForToken(token))).not.toBeNull();
}

describe("better-auth hooks keep the app's session cache honest (V-382)", () => {
  it("POST /auth/revoke-session ends the other device at once, with its cache warm", async () => {
    const user = await createUserWithSession();
    const other = await createSessionForUser(user.id);
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken, other.sessionToken]);
    await warmCache(other.cookie, other.sessionToken);

    const revoke = await withCookie(user.cookie)
      .post("/api/v1/auth/revoke-session")
      .send({ token: other.sessionToken });
    expect(revoke.status, JSON.stringify(revoke.body)).toBe(200);

    expect((await withCookie(other.cookie).get("/api/v1/users/me")).status).toBe(401);
    expect((await withCookie(user.cookie).get("/api/v1/users/me")).status).toBe(200);
  });

  it("POST /auth/revoke-other-sessions ends every other device at once, with its cache warm", async () => {
    const user = await createUserWithSession();
    const other = await createSessionForUser(user.id);
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken, other.sessionToken]);
    await warmCache(other.cookie, other.sessionToken);

    const revoke = await withCookie(user.cookie)
      .post("/api/v1/auth/revoke-other-sessions")
      .send({});
    expect(revoke.status, JSON.stringify(revoke.body)).toBe(200);

    expect((await withCookie(other.cookie).get("/api/v1/users/me")).status).toBe(401);
    expect((await withCookie(user.cookie).get("/api/v1/users/me")).status).toBe(200);
  });

  it("POST /auth/update-user drops the cached session user, so the next read sees the change", async () => {
    const user = await createUserWithSession({ name: "Before Rename" });
    await seedBetterAuthSessionEntries(user.id, [user.sessionToken]);
    await warmCache(user.cookie, user.sessionToken);

    const update = await withCookie(user.cookie)
      .post("/api/v1/auth/update-user")
      .send({ name: "After Rename" });
    expect(update.status, JSON.stringify(update.body)).toBe(200);

    expect(await cacheGet(sessionCacheKeyForToken(user.sessionToken))).toBeNull();
    const sessionUser = await getSessionUserFromRequest({
      headers: { cookie: user.cookie, origin: STUDIO_ORIGIN },
    } as unknown as Request);
    expect(sessionUser).toMatchObject({ id: user.id, name: "After Rename" });
  });
});
