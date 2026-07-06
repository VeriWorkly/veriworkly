import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("#config", () => ({
  config: {
    auth: {
      sessionCacheMaxAgeSeconds: 123,
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

describe("session auth cache", () => {
  beforeEach(() => {
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
    getSessionMock.mockReset();
  });

  it("uses configured session cache TTL", async () => {
    cacheGetMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
    });

    const { getSessionUserFromRequest } = await import("#middleware/auth");

    const user = await getSessionUserFromRequest({
      headers: {
        cookie: "veriworkly-auth.session_token=token-1",
      },
    } as never);

    expect(user?.id).toBe("user-1");
    expect(cacheSetMock).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:session:/),
      {
        id: "user-1",
        email: "user@example.com",
        name: "User",
      },
      123,
    );
  });
});
