import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const mGetMock = vi.fn();
vi.mock("#config", () => ({
  config: {
    apiKeys: {
      defaultScopes: ["user:read"],
      defaultRateLimit: 20,
      authCacheTtlSeconds: 300,
      defaultKeyLifetimeDays: 365,
      lastUsedTouchIntervalSeconds: 300,
      hashSecret: "test-secret",
    },
  },
}));

vi.mock("#lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  getRedis: () => ({
    set: vi.fn(),
    mGet: mGetMock,
  }),
}));

const prismaFindMock = vi.fn();
vi.mock("#lib/prisma", () => ({
  prisma: {
    apiKey: {
      findFirst: (...args: unknown[]) => prismaFindMock(...args),
    },
  },
}));

describe("API Key Service Validation", () => {
  beforeEach(() => {
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
    prismaFindMock.mockReset();
    mGetMock.mockReset();
    mGetMock.mockResolvedValue([null, null]);
  });

  it("permits validation if user has an active subscription or no subscription", async () => {
    cacheGetMock.mockResolvedValue(null);
    prismaFindMock.mockResolvedValue({
      id: "key-1",
      keyHash: "hashed-key",
      keyPrefix: "vw_12345",
      keySuffix: "67890",
      name: "Test Key",
      userId: "user-1",
      isActive: true,
      rateLimit: 20,
      scopes: ["user:read"],
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null,
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
      },
    });

    const { ApiKeyService } = await import("../../src/services/apiKeyService.js");
    const result = await ApiKeyService.validateKey("vw_1234567890");

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
  });

  // V-140: key validity depends on the key row only. A past subscriber must keep the API access a
  // never-paid user (no subscription row) always had.
  it("permits validation when the user's latest subscription row is CANCELED", async () => {
    cacheGetMock.mockResolvedValue(null);
    prismaFindMock.mockResolvedValue({
      id: "key-2",
      keyHash: "hashed-key-canceled",
      keyPrefix: "vw_22345",
      keySuffix: "67890",
      name: "Canceled Test Key",
      userId: "user-2",
      isActive: true,
      rateLimit: 20,
      scopes: ["user:read"],
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null,
      user: {
        id: "user-2",
        email: "user-canceled@example.com",
        name: "Canceled User",
      },
    });

    const { ApiKeyService } = await import("../../src/services/apiKeyService.js");
    const result = await ApiKeyService.validateKey("vw_2234567890");

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-2");

    // The lookup no longer joins subscription rows at all, so there is nothing to gate on.
    expect(JSON.stringify(prismaFindMock.mock.calls[0][0])).not.toContain("subscriptions");
  });

  it("refuses a key that carries the revoked marker before touching the cache or the database", async () => {
    // Markers (revoked, known-invalid) read first in one MGET; the auth cache is never reached.
    mGetMock.mockResolvedValueOnce(["1", null]);

    const { ApiKeyService } = await import("../../src/services/apiKeyService.js");
    const result = await ApiKeyService.validateKey("vw_3234567890");

    expect(result).toBeNull();
    expect(mGetMock.mock.calls[0][0][0]).toMatch(/^apikey:revoked:/);
    expect(mGetMock.mock.calls[0][0][1]).toMatch(/^apikey:invalid:/);
    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(prismaFindMock).not.toHaveBeenCalled();
  });

  it("remembers a key with no valid row so the next attempt skips the database", async () => {
    cacheGetMock.mockResolvedValue(null);
    prismaFindMock.mockResolvedValue(null);

    const { ApiKeyService } = await import("../../src/services/apiKeyService.js");
    expect(await ApiKeyService.validateKey("vw_4234567890")).toBeNull();

    const negative = cacheSetMock.mock.calls.find(([key]) =>
      String(key).startsWith("apikey:invalid:"),
    );
    expect(negative?.[2]).toBe(60);
  });
});
