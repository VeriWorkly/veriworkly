import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
vi.mock("../../src/config", () => ({
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

vi.mock("../../src/utils/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  getRedis: () => ({
    set: vi.fn(),
  }),
}));

const prismaFindMock = vi.fn();
vi.mock("../../src/utils/prisma", () => ({
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
  });

  it("permits validation if user has active/trialing subscription or no subscription", async () => {
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
        subscriptions: [
          {
            status: "ACTIVE",
          },
        ],
      },
    });

    const { ApiKeyService } = await import("../../src/services/apiKeyService");
    const result = await ApiKeyService.validateKey("vw_1234567890");

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
  });

  it("rejects validation if user subscription status is CANCELED", async () => {
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
        subscriptions: [
          {
            status: "CANCELED",
          },
        ],
      },
    });

    const { ApiKeyService } = await import("../../src/services/apiKeyService");
    const result = await ApiKeyService.validateKey("vw_2234567890");

    expect(result).toBeNull();
  });
});
