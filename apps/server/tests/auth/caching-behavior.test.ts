import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("#config", () => ({
  config: {
    auth: {
      sessionCacheMaxAgeSeconds: 900,
    },
  },
}));

vi.mock("#lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
}));

vi.mock("#auth/index", () => ({
  convertNodeHeadersToWebHeaders: (headers: unknown) => headers,
  getSessionFromRequestHeaders: getSessionMock,
}));

describe("Session Caching Behavior", () => {
  beforeEach(() => {
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
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

    const req = {
      headers: {
        cookie: "veriworkly-auth.session_token=valid-token",
      },
    } as never;

    const user = await getSessionUserFromRequest(req);

    // Redis get was called
    expect(cacheGetMock).toHaveBeenCalled();
    // User returned is the cached user
    expect(user?.id).toBe("user-cached");
    // DB session lookup was bypassed!
    expect(getSessionMock).not.toHaveBeenCalled();
    // Cache was not re-written
    expect(cacheSetMock).not.toHaveBeenCalled();
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

    const req = {
      headers: {
        cookie: "veriworkly-auth.session_token=valid-token",
      },
    } as never;

    const user = await getSessionUserFromRequest(req);

    // Redis get was called
    expect(cacheGetMock).toHaveBeenCalled();
    // DB session lookup was called
    expect(getSessionMock).toHaveBeenCalled();
    // User returned is the DB user
    expect(user?.id).toBe("user-db");
    // Cache was updated with TTL 900
    expect(cacheSetMock).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:/),
      {
        id: "user-db",
        email: "db@example.com",
        name: "DB User",
      },
      900,
    );
  });
});
