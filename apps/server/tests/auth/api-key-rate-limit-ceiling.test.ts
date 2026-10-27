import { describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("#config", () => ({
  config: {
    apiKeys: {
      defaultRateLimit: 20,
      maxRateLimit: 600,
      defaultScopes: ["user:read"],
      defaultKeyLifetimeDays: 365,
      authCacheTtlSeconds: 300,
      lastUsedTouchIntervalSeconds: 300,
      hashSecret: "test-hash-secret",
    },
  },
}));

vi.mock("#lib/prisma", () => {
  // generateKey counts the live keys and creates under a lock in one transaction (V-242).
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    apiKey: { create: createMock, count: vi.fn(async () => 0) },
  };
  return {
    prisma: {
      apiKey: tx.apiKey,
      $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
    },
  };
});

vi.mock("#lib/redis", () => ({
  cacheDel: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  getRedis: vi.fn(),
}));

vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("#lib/cacheKeys", () => ({
  userProfileCacheKey: (userId: string) => `user:${userId}`,
}));

const { ApiKeyService } = await import("#services/apiKeyService");

function createdRateLimit() {
  return createMock.mock.calls.at(-1)?.[0]?.data?.rateLimit;
}

/**
 * Regression cover for the inert rateLimit column: the ceiling used to be defined as the default
 * (`MAX_API_KEY_RATE_LIMIT = config.apiKeys.defaultRateLimit`), so normalizeRateLimit clamped
 * every requested value back down to 20. The field persisted and could only ever be lowered.
 */
describe("API key rate limit ceiling", () => {
  it("honours a requested limit above the default", async () => {
    createMock.mockResolvedValue({ id: "key-1" });

    await ApiKeyService.generateKey("user-1", { name: "ci", rateLimit: 300 });

    expect(createdRateLimit()).toBe(300);
  });

  it("still clamps at the configured maximum", async () => {
    createMock.mockResolvedValue({ id: "key-1" });

    await ApiKeyService.generateKey("user-1", { name: "ci", rateLimit: 10_000 });

    expect(createdRateLimit()).toBe(600);
  });

  it("falls back to the default when no limit is requested", async () => {
    createMock.mockResolvedValue({ id: "key-1" });

    await ApiKeyService.generateKey("user-1", { name: "ci" });

    expect(createdRateLimit()).toBe(20);
  });

  it("keeps a floor of 1 for zero or negative input", async () => {
    createMock.mockResolvedValue({ id: "key-1" });

    await ApiKeyService.generateKey("user-1", { name: "ci", rateLimit: -5 });

    expect(createdRateLimit()).toBe(1);
  });
});
