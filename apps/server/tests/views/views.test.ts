import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  portfolioPublication: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },

  portfolioViewDaily: {
    upsert: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },

  shareView: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },

  shareLink: {
    findMany: vi.fn(),
    update: vi.fn(),
  },

  viewFlushBatch: {
    create: vi.fn(),
  },

  $transaction: vi.fn((cb) => cb(prismaMock)),
};

vi.mock("../../src/utils/prisma", () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

const mockRedisStore = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

const mockRedis = {
  set: vi.fn((key: string, value: string, options?: { NX?: boolean }) => {
    if (options?.NX && mockRedisStore.has(key)) return null;
    mockRedisStore.set(key, value);
    return "OK";
  }),

  get: vi.fn((key: string) => mockRedisStore.get(key) ?? null),

  hExists: vi.fn((key: string, field: string) => Boolean(mockRedisStore.get(key)?.[field])),

  hLen: vi.fn((key: string) => Object.keys(mockRedisStore.get(key) || {}).length),

  hIncrBy: vi.fn((key: string, field: string, value: number) => {
    if (!mockRedisStore.has(key)) mockRedisStore.set(key, {});
    const obj = mockRedisStore.get(key);
    obj[field] = (obj[field] || 0) + value;
    return obj[field];
  }),

  hSet: vi.fn((key: string, field: string, value: string) => {
    if (!mockRedisStore.has(key)) mockRedisStore.set(key, {});
    mockRedisStore.get(key)[field] = value;
    return 1;
  }),

  hGetAll: vi.fn((key: string) => {
    return mockRedisStore.get(key) || {};
  }),

  exists: vi.fn((key: string) => {
    return mockRedisStore.has(key) ? 1 : 0;
  }),

  rename: vi.fn((oldKey: string, newKey: string) => {
    if (!mockRedisStore.has(oldKey)) {
      throw new Error("ERR no such key");
    }
    mockRedisStore.set(newKey, mockRedisStore.get(oldKey));
    mockRedisStore.delete(oldKey);
  }),

  del: vi.fn((keys: string | string[]) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) {
      mockRedisStore.delete(k);
    }
  }),

  lPush: vi.fn((key: string, value: string) => {
    if (!mockRedisStore.has(key)) mockRedisStore.set(key, []);
    mockRedisStore.get(key).unshift(value);
    return mockRedisStore.get(key).length;
  }),

  lRange: vi.fn((key: string, start: number, stop: number) => {
    const list = mockRedisStore.get(key) || [];
    if (stop === -1) return list.slice(start);
    return list.slice(start, stop + 1);
  }),

  lTrim: vi.fn((key: string, start: number, stop: number) => {
    const list = mockRedisStore.get(key) || [];
    mockRedisStore.set(key, list.slice(start, stop + 1));
  }),

  expire: vi.fn(),

  multi: vi.fn(() => {
    const chain = {
      expire: vi.fn(() => chain),
      hIncrBy: vi.fn(() => chain),
      set: vi.fn(() => chain),
      exec: vi.fn(),
    };
    return chain;
  }),

  scanIterator: vi.fn(function* (options: { MATCH: string }) {
    for (const key of mockRedisStore.keys()) {
      if (key.startsWith(options.MATCH.replace("*", ""))) {
        yield [key];
      }
    }
  }),
};

vi.mock("../../src/utils/redis", () => ({
  getRedis: () => mockRedis,
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

vi.mock("../../src/config", () => ({
  config: {
    jwt: {
      secret: "test-jwt-secret",
    },
  },
}));

describe("Views tracking buffering and flushing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRedisStore.clear();
    prismaMock.portfolioPublication.findUnique.mockReset();
    prismaMock.portfolioPublication.findMany.mockReset();
    prismaMock.portfolioViewDaily.upsert.mockReset();
    prismaMock.shareView.createMany.mockReset();
    prismaMock.shareView.deleteMany.mockReset();
    prismaMock.shareLink.findMany.mockReset();
    prismaMock.shareLink.update.mockReset();
    prismaMock.viewFlushBatch.create.mockReset();
    prismaMock.portfolioPublication.findMany.mockImplementation(({ where }) =>
      where.id.in.map((id: string) => ({ id })),
    );
    prismaMock.shareLink.findMany.mockImplementation(({ where }) =>
      where.id.in.map((id: string) => ({ id })),
    );
  });

  describe("Portfolio Views", () => {
    it("buffers portfolio view count in Redis on recordView", async () => {
      const { PortfolioService } = await import("../../src/services/portfolioService");

      prismaMock.portfolioPublication.findUnique.mockResolvedValue({
        id: "pub_123",
        subdomain: "testsub",
        updatedAt: new Date(),
        user: {
          subscriptions: [],
        },
      });

      await PortfolioService.recordView("testsub", "https://google.com");

      // Verify Redis contains the entry
      const dateKey = new Date().toISOString().slice(0, 10);
      const redisKey = `portfolio:views:buffer:${dateKey}`;

      expect(mockRedis.hIncrBy).toHaveBeenCalled();
      expect(mockRedisStore.get(redisKey)).toBeDefined();
      expect(mockRedisStore.get(redisKey)["pub_123:google.com"]).toBe(1);
    });

    it("flushes portfolio views from Redis to database", async () => {
      const { PortfolioService } = await import("../../src/services/portfolioService");

      // Populate Redis buffer
      const dateKey = "2026-05-31";
      const redisKey = `portfolio:views:buffer:${dateKey}`;
      mockRedisStore.set(redisKey, {
        "pub_123:google.com": "5",
        "pub_123:linkedin.com": "3",
      });

      const dates = await PortfolioService.getPendingViewDates();
      expect(dates).toEqual([dateKey]);

      const result = await PortfolioService.flushViewsForDate(dateKey);
      expect(result.flushedCount).toBe(8);

      expect(prismaMock.portfolioViewDaily.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.portfolioViewDaily.upsert).toHaveBeenCalledWith({
        where: {
          publicationId_date_referrerHost: {
            publicationId: "pub_123",
            date: new Date("2026-05-31T00:00:00.000Z"),
            referrerHost: "google.com",
          },
        },
        create: {
          publicationId: "pub_123",
          date: new Date("2026-05-31T00:00:00.000Z"),
          referrerHost: "google.com",
          count: 5,
        },
        update: {
          count: { increment: 5 },
        },
      });

      // Verify Redis buffer is cleared
      expect(mockRedisStore.has(redisKey)).toBe(false);
    });
  });

  describe("Share Link Views", () => {
    it("buffers share view count, last viewed timestamp, and raw view records in Redis", async () => {
      const { ShareService } = await import("../../src/services/shareService");

      await ShareService.recordShareView("link_456", "1.2.3.4", "Mozilla/5.0");

      expect(mockRedis.lPush).toHaveBeenCalled();
      expect(mockRedis.hIncrBy).toHaveBeenCalledWith("share:links:view_count", "link_456", 1);
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        "share:links:last_viewed",
        "link_456",
        expect.any(String),
      );

      const bufferList = mockRedisStore.get("share:views:buffer");

      expect(bufferList).toHaveLength(1);

      const parsedRecord = JSON.parse(bufferList[0]);

      expect(parsedRecord.shareLinkId).toBe("link_456");
      expect(parsedRecord.ipAddress).not.toBe("1.2.3.4");
      expect(parsedRecord.userAgent).toBe("Mozilla/5.0");
    });

    it("flushes buffered share views and increments database counts with 30-day retention cleanup", async () => {
      const { ShareService } = await import("../../src/services/shareService");

      const timestamp = Date.now();

      mockRedisStore.set("share:views:buffer", [
        JSON.stringify({
          shareLinkId: "link_456",
          ipAddress: "hashed_ip_1",
          userAgent: "Mozilla/5.0",
          timestamp,
        }),
      ]);

      mockRedisStore.set("share:links:view_count", {
        link_456: "2",
      });

      mockRedisStore.set("share:links:last_viewed", {
        link_456: String(timestamp),
      });

      const result = await ShareService.flushShareViews();

      expect(result.flushedViews).toBe(1);
      expect(result.flushedLinks).toBe(1);

      expect(prismaMock.shareView.createMany).toHaveBeenCalledWith({
        data: [
          {
            shareLinkId: "link_456",
            ipAddress: "hashed_ip_1",
            userAgent: "Mozilla/5.0",
            createdAt: new Date(timestamp),
          },
        ],
      });

      expect(prismaMock.shareLink.update).toHaveBeenCalledWith({
        where: { id: "link_456" },
        data: {
          viewCount: { increment: 2 },
          lastViewedAt: new Date(timestamp),
        },
      });

      expect(prismaMock.shareView.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });

      expect(mockRedisStore.has("share:views:buffer")).toBe(false);
      expect(mockRedisStore.has("share:links:view_count")).toBe(false);
      expect(mockRedisStore.has("share:links:last_viewed")).toBe(false);
    });
  });
});
