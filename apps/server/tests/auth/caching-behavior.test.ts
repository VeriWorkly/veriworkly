import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const evalMock = vi.fn();
const getSessionMock = vi.fn();

const AUTH_SECRET = "unit-test-auth-secret";

vi.mock("#config", () => ({
  config: {
    nodeEnv: "test",
    auth: {
      secret: AUTH_SECRET,
      sessionCacheMaxAgeSeconds: 900,
    },
  },
  isProduction: false,
}));

vi.mock("#lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  getRedis: () => ({ eval: evalMock }),
}));

vi.mock("#auth/index", () => ({
  convertNodeHeadersToWebHeaders: (headers: unknown) => headers,
  getSessionFromRequestHeaders: getSessionMock,
}));

/** A cookie signed the way better-call signs it; an unsigned value is never cached (see below). */
function signedCookie(token: string) {
  const signature = createHmac("sha256", AUTH_SECRET).update(token).digest("base64");
  return `veriworkly-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
}

describe("Session Caching Behavior", () => {
  beforeEach(() => {
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
    evalMock.mockReset();
    getSessionMock.mockReset();
  });

  it("hits Redis cache and bypasses database (cache hit)", async () => {
    // Redis has the session cached
    cacheGetMock.mockResolvedValue({
      id: "user-cached",
      email: "cached@example.com",
      name: "Cached User",
    });

    const { getSessionUserFromRequest } = await import("#middleware/auth");

    const req = { headers: { cookie: signedCookie("valid-token") } } as never;

    const user = await getSessionUserFromRequest(req);

    // Redis get was called
    expect(cacheGetMock).toHaveBeenCalled();
    // User returned is the cached user
    expect(user?.id).toBe("user-cached");
    // DB session lookup was bypassed!
    expect(getSessionMock).not.toHaveBeenCalled();
    // Cache was not re-written
    expect(cacheSetMock).not.toHaveBeenCalled();
    expect(evalMock).not.toHaveBeenCalled();
  });

  it("queries database on Redis miss and populates cache (cache miss)", async () => {
    // Redis does not have the session
    cacheGetMock.mockResolvedValue(null);
    // DB has the session
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-db",
        email: "db@example.com",
        name: "DB User",
      },
    });

    const { getSessionUserFromRequest } = await import("#middleware/auth");

    const req = { headers: { cookie: signedCookie("valid-token") } } as never;

    const user = await getSessionUserFromRequest(req);

    // Redis get was called
    expect(cacheGetMock).toHaveBeenCalled();
    // DB session lookup was called
    expect(getSessionMock).toHaveBeenCalled();
    // User returned is the DB user
    expect(user?.id).toBe("user-db");
    // Cache was updated with TTL 900, unless the session was revoked meanwhile (V-122)
    const [, write] = evalMock.mock.calls[0];
    expect(write.keys[0]).toMatch(/^auth:session:/);
    expect(write.keys[1]).toBe(`${write.keys[0]}:revoked`);
    expect(JSON.parse(write.arguments[0])).toEqual({
      id: "user-db",
      email: "db@example.com",
      name: "DB User",
    });
    expect(write.arguments[1]).toBe("900");
  });

  it("never consults or fills the cache for an unsigned cookie; better-auth decides", async () => {
    cacheGetMock.mockResolvedValue({ id: "user-cached", email: null, name: null });
    getSessionMock.mockResolvedValue(null);

    const { getSessionUserFromRequest } = await import("#middleware/auth");

    const req = { headers: { cookie: "veriworkly-auth.session_token=valid-token" } } as never;

    const user = await getSessionUserFromRequest(req);

    expect(user).toBeNull();
    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
    expect(evalMock).not.toHaveBeenCalled();
    expect(getSessionMock).toHaveBeenCalled();
  });
});
