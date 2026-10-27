import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const deleteSessionsMock = vi.fn();
const cacheDelMock = vi.fn();
/** A Redis MULTI that records what it was asked to do, or fails on exec like a dead Redis. */
const multiCalls: { set: string[]; unlink: string[] } = { set: [], unlink: [] };
const execMock = vi.fn();
const multi = {
  set: (key: string) => (multiCalls.set.push(key), multi),
  unlink: (keys: string[]) => (multiCalls.unlink.push(...keys), multi),
  exec: () => execMock(),
};

const AUTH_SECRET = "unit-test-auth-secret";

vi.mock("#config", () => ({
  config: { nodeEnv: "test", auth: { secret: AUTH_SECRET } },
  isProduction: false,
}));

vi.mock("#lib/prisma", () => ({
  prisma: { session: { findMany: findManyMock } },
}));

vi.mock("#lib/redis", () => ({
  cacheDel: cacheDelMock,
  getRedis: () => ({ multi: () => multi }),
}));

vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("#auth/index", () => ({
  auth: {
    $context: Promise.resolve({
      internalAdapter: { deleteSessions: deleteSessionsMock },
    }),
  },
}));

// `#utils/authCache` is deliberately NOT mocked: the point of these tests is that the key the
// revocation path deletes is the key the request path reads. Mocking it made the suite pass
// while the two hashed different strings and revoked sessions stayed authenticated.
const { getSessionCacheKey } = await import("#utils/authCache");
const { revokeAllSessionsForUser, revokeSessionsBeforeAccountDeletion } =
  await import("#auth/sessions");

/** The cookie a browser actually sends: better-call's `encodeURIComponent(token.base64(HMAC))`. */
function signedCookie(token: string, name = "veriworkly-auth.session_token") {
  const signature = createHmac("sha256", AUTH_SECRET).update(token).digest("base64");
  return `${name}=${encodeURIComponent(`${token}.${signature}`)}`;
}

/**
 * Regression cover for the bug where admin "revoke sessions" deleted only the Postgres row.
 * better-auth's findSession reads its Redis secondary storage first and returns without ever
 * querying the database, so a DB-only delete left the user authenticated for the full session
 * TTL (30 days by default). Each assertion below pins one of the three stores that must be
 * cleared; dropping any one of them silently restores the vulnerability.
 */
describe("revokeAllSessionsForUser", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    deleteSessionsMock.mockReset();
    cacheDelMock.mockReset();
    execMock.mockReset().mockResolvedValue([]);
    multiCalls.set = [];
    multiCalls.unlink = [];
  });

  it("clears better-auth secondary storage, the active-sessions index, and the app session cache", async () => {
    findManyMock.mockResolvedValue([{ token: "token-a" }, { token: "token-b" }]);

    const revoked = await revokeAllSessionsForUser("user-1");

    expect(revoked).toBe(2);

    // 1. better-auth's per-token Redis entries + the DB rows.
    expect(deleteSessionsMock).toHaveBeenCalledWith(["token-a", "token-b"]);

    // 2. The active-sessions index, which the *plural* deleteSessions does not prune itself, and
    //    better-auth's per-token entries again, strictly (its own delete swallows errors, V-259).
    const deletedKeys = multiCalls.unlink;
    expect(deletedKeys).toContain("active-sessions-user-1");
    expect(deletedKeys).toEqual(expect.arrayContaining(["token-a", "token-b"]));

    // 3. This app's own auth:session:<token-hash> cache — the SAME key the request path builds
    //    from the signed cookie, with the real signature check and hashing on both sides — with a
    //    tombstone each so a lookup in flight cannot re-cache it (V-122).
    expect(multiCalls.set).toEqual([
      `${getSessionCacheKey(signedCookie("token-a"))}:revoked`,
      `${getSessionCacheKey(signedCookie("token-b"))}:revoked`,
    ]);

    expect(deletedKeys).toContain(getSessionCacheKey(signedCookie("token-a")));
    expect(deletedKeys).toContain(getSessionCacheKey(signedCookie("token-b")));
    expect(deletedKeys.filter((key) => key.startsWith("auth:session:"))).toHaveLength(2);
  });

  it("no-ops without touching any store when the user has no sessions", async () => {
    findManyMock.mockResolvedValue([]);

    await expect(revokeAllSessionsForUser("user-1")).resolves.toBe(0);

    expect(deleteSessionsMock).not.toHaveBeenCalled();
    expect(execMock).not.toHaveBeenCalled();
  });

  it("stops an account deletion with a 503 when the revocation fails (V-315 review)", async () => {
    findManyMock.mockRejectedValue(new Error("redis down"));

    await expect(revokeSessionsBeforeAccountDeletion("user-1")).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("fails when Redis does not confirm the deletes (V-259)", async () => {
    findManyMock.mockResolvedValue([{ token: "token-a" }]);
    execMock.mockRejectedValue(new Error("Redis client not ready"));

    await expect(revokeAllSessionsForUser("user-1")).rejects.toThrow("Redis client not ready");
    await expect(revokeSessionsBeforeAccountDeletion("user-1")).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("propagates failures in the strict variant so an admin sees a failed revocation", async () => {
    findManyMock.mockRejectedValue(new Error("redis down"));

    await expect(revokeAllSessionsForUser("user-1")).rejects.toThrow("redis down");
  });
});
