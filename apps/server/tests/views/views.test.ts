import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  portfolioPublication: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },

  // The public read asks whether the owner is paid (`EntitlementService.isPaid`).
  entitlementGrant: {
    findMany: vi.fn(() => Promise.resolve([])),
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

  $executeRaw: vi.fn(() => Promise.resolve(0)),

  // The flushes run batch (array) transactions; anything else still gets the callback form.
  $transaction: vi.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock))),
};

vi.mock("#lib/prisma", () => ({
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

  exists: vi.fn((keys: string | string[]) => {
    return (Array.isArray(keys) ? keys : [keys]).filter((key) => mockRedisStore.has(key)).length;
  }),

  getDel: vi.fn((key: string) => {
    const value = mockRedisStore.get(key) ?? null;
    mockRedisStore.delete(key);
    return Promise.resolve(value);
  }),

  // Stands in for the scripts the view code runs: the share view record, the portfolio view
  // buffer, the pending-count settle and the compare-and-delete lock release.
  eval: vi.fn(
    (script: string, { keys, arguments: args }: { keys: string[]; arguments: string[] }) => {
      if (script.includes("LPUSH")) {
        const [buffer, counts, lastViewed, dropped, dedup] = keys as string[] as [
          string,
          string,
          string,
          string,
          string | undefined,
        ];
        const [record, linkId, timestamp, cap] = args as [string, string, string, string];
        // The script's order: the cap first, so a dropped view never spends the dedup key.
        if ((mockRedisStore.get(buffer)?.length ?? 0) >= Number(cap)) {
          mockRedisStore.set(dropped, (Number(mockRedisStore.get(dropped)) || 0) + 1);
          return Promise.resolve(0);
        }
        if (dedup && mockRedisStore.has(dedup)) return Promise.resolve(0);
        if (dedup) mockRedisStore.set(dedup, "1");
        mockRedis.lPush(buffer, record);
        mockRedis.hIncrBy(counts, linkId, 1);
        mockRedis.hSet(lastViewed, linkId, timestamp);
        return Promise.resolve(1);
      }
      if (script.includes("HDEL")) {
        const [marker, ...pendingKeys] = keys as [string, ...string[]];
        if (mockRedisStore.has(marker)) return Promise.resolve(0);
        const [dateKey, ...counts] = args as [string, ...string[]];
        pendingKeys.forEach((key, index) => {
          const hash = mockRedisStore.get(key) ?? {};
          const left = (Number(hash[dateKey]) || 0) - Number(counts[index]);
          if (left <= 0) delete hash[dateKey];
          else hash[dateKey] = left;
          mockRedisStore.set(key, hash);
        });
        mockRedisStore.set(marker, "1");
        return Promise.resolve(1);
      }
      if (keys.length === 3) {
        const [buffer, pending, dedup] = keys as [string, string, string];
        if (dedup && mockRedisStore.has(dedup)) return Promise.resolve(0);
        if (dedup) mockRedisStore.set(dedup, "1");
        const [field, fallback, cap, dateKey] = args as [string, string, string, string];
        const hash = mockRedisStore.get(buffer) ?? {};
        const target = field in hash || Object.keys(hash).length < Number(cap) ? field : fallback;
        mockRedis.hIncrBy(buffer, target, 1);
        mockRedis.hIncrBy(pending, dateKey, 1);
        return Promise.resolve(1);
      }
      if (mockRedisStore.get(keys[0]!) === args[0]) mockRedisStore.delete(keys[0]!);
      return Promise.resolve(1);
    },
  ),

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
    return Promise.resolve(arr.length);
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
    // Applies each queued command to the store at once, through the single-command mocks.
    const queue =
      (name: "lPush" | "lTrim" | "hIncrBy" | "hSet" | "set") =>
      (...args: unknown[]) => {
        (mockRedis[name] as (...a: unknown[]) => unknown)(...args);
        return chain;
      };
    const chain = {
      expire: vi.fn(() => chain),
      lPush: vi.fn(queue("lPush")),
      lTrim: vi.fn(queue("lTrim")),
      hIncrBy: vi.fn(queue("hIncrBy")),
      hSet: vi.fn(queue("hSet")),
      set: vi.fn(queue("set")),
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

vi.mock("#lib/redis", () => ({
  getRedis: () => mockRedis,
  redisWrite: (run: (redis: typeof mockRedis) => Promise<unknown>) => run(mockRedis),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

// Keep the module graph under test scoped to views/redis/prisma — without these mocks,
// portfolioService's billing/mail imports pull in nodemailer and the HTML mail templates on
// every dynamic import in this file, which is unrelated cost this suite shouldn't pay.
vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#services/apiKeyService", () => ({
  ApiKeyService: {
    invalidateAuthCacheForUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Account deletion now revokes better-auth sessions, which loads the auth instance and the
// full config. This suite does not exercise auth, so the revocation module is stubbed.
vi.mock("#auth/sessions", () => ({
  revokeAllSessionsForUser: vi.fn().mockResolvedValue(0),
  revokeSessionsBeforeAccountDeletion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#config", () => ({
  config: {
    auth: {
      secret: "test-auth-secret",
    },
    apiKeys: {
      hashSecret: "test-api-key-secret",
      authCacheTtlSeconds: 300,
      lastUsedTouchIntervalSeconds: 300,
      defaultRateLimit: 20,
      defaultScopes: ["user:read"],
      defaultKeyLifetimeDays: 365,
    },
    nodeEnv: "test",
  },
}));

describe("Views tracking buffering and flushing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRedisStore.clear();
    prismaMock.portfolioPublication.findUnique.mockReset();
    prismaMock.portfolioPublication.findFirst.mockReset();
    prismaMock.portfolioPublication.findMany.mockReset();
    prismaMock.portfolioViewDaily.upsert.mockReset();
    prismaMock.shareView.createMany.mockReset();
    prismaMock.shareView.deleteMany.mockReset();
    prismaMock.shareLink.findMany.mockReset();
    prismaMock.shareLink.update.mockReset();
    prismaMock.viewFlushBatch.create.mockReset();
    prismaMock.$executeRaw.mockClear();
    prismaMock.portfolioPublication.findMany.mockImplementation(({ where }) =>
      where.id.in.map((id: string) => ({ id })),
    );
    prismaMock.shareLink.findMany.mockImplementation(({ where }) =>
      where.id.in.map((id: string) => ({ id })),
    );
  });

  describe("Portfolio Views", () => {
    it("buffers portfolio view count in Redis on recordView", async () => {
      const { PortfolioService } = await import("../../src/services/portfolioService.js");

      prismaMock.portfolioPublication.findFirst.mockResolvedValue({
        id: "pub_123",
        userId: "user_123",
        subdomain: "testsub",
        status: "LIVE",
        updatedAt: new Date(),
        user: { subscriptions: [] },
      });

      // V-363: Date stands still, so the write and the key read below name the same UTC day.
      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
      await PortfolioService.recordView("testsub", "https://google.com");

      // Verify Redis contains the entry
      const dateKey = new Date().toISOString().slice(0, 10);
      vi.useRealTimers();
      const redisKey = `portfolio:views:buffer:${dateKey}`;

      expect(mockRedis.hIncrBy).toHaveBeenCalled();
      expect(mockRedisStore.get(redisKey)).toBeDefined();
      expect(mockRedisStore.get(redisKey)["pub_123:google.com"]).toBe(1);
    });

    it("flushes portfolio views from Redis to database", async () => {
      const { PortfolioService } = await import("../../src/services/portfolioService.js");

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

      // One INSERT … ON CONFLICT for the day (V-103); the SQL itself is covered by
      // tests/integration/flushes-and-limits.test.ts against a real Postgres.
      expect(prismaMock.portfolioViewDaily.upsert).not.toHaveBeenCalled();
      expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
      const [, , publicationIds, hosts, counts] = prismaMock.$executeRaw.mock.calls[0] as unknown[];
      expect(publicationIds).toEqual(["pub_123", "pub_123"]);
      expect(hosts).toEqual(["google.com", "linkedin.com"]);
      expect(counts).toEqual([5, 3]);

      // Verify Redis buffer is cleared
      expect(mockRedisStore.has(redisKey)).toBe(false);
    });
  });

  describe("Share Link Views", () => {
    it("buffers share view count, last viewed timestamp, and raw view records in Redis", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");

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

    it("S-397 a link-preview bot fetching the page is not a view", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");

      for (const agent of [
        "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
        "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "WhatsApp/2.23.20.0",
        "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
        "TelegramBot (like TwitterBot)",
      ]) {
        await ShareService.recordShareView("link_456", "1.2.3.4", agent);
      }

      expect(mockRedisStore.has("share:views:buffer")).toBe(false);
      expect(mockRedisStore.has("share:links:view_count")).toBe(false);
    });

    it("S-397 a phone whose model name ends in 'bot' is a reader", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");

      await ShareService.recordShareView(
        "link_456",
        "1.2.3.4",
        "Mozilla/5.0 (Linux; Android 12; CUBOT X30 Build/SP1A) AppleWebKit/537.36 Chrome/120 Mobile",
      );

      expect(mockRedisStore.get("share:links:view_count")).toEqual({ link_456: 1 });
    });

    it("S-397 a view dropped at the buffer cap does not spend that network's dedup window", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");
      const browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130";

      mockRedisStore.set(
        "share:views:buffer",
        Array.from({ length: 10_000 }, () => "{}"),
      );
      await ShareService.recordShareView("link_456", "1.2.3.4", browser);

      expect(mockRedisStore.get("share:views:dropped")).toBe(1);
      expect([...mockRedisStore.keys()].some((key) => key.startsWith("share:views:dedup:"))).toBe(
        false,
      );

      // Once the flush has drained the buffer, the same reader is counted.
      mockRedisStore.set("share:views:buffer", []);
      await ShareService.recordShareView("link_456", "1.2.3.4", browser);
      expect(mockRedisStore.get("share:links:view_count")).toEqual({ link_456: 1 });
    });

    it("S-397 the record script checks the cap before it sets the dedup key", async () => {
      // The mock above cannot run Lua; this holds the real script to the order it mirrors.
      const source = await import("node:fs").then((fs) =>
        fs.readFileSync(new URL("../../src/services/shareService.ts", import.meta.url), "utf8"),
      );
      const script = source.slice(source.indexOf("const RECORD_SHARE_VIEW_SCRIPT"));

      expect(script.indexOf('"LLEN"')).toBeGreaterThan(-1);
      expect(script.indexOf('"LLEN"')).toBeLessThan(script.indexOf('"NX"'));
    });

    it("S-397 a refresh from the same network the same day counts once", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");
      const browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130";

      await ShareService.recordShareView("link_456", "1.2.3.4", browser);
      await ShareService.recordShareView("link_456", "1.2.3.4", browser);
      await ShareService.recordShareView("link_456", "5.6.7.8", browser);
      await ShareService.recordShareView("link_789", "1.2.3.4", browser);

      expect(mockRedisStore.get("share:links:view_count")).toEqual({ link_456: 2, link_789: 1 });
    });

    it("flushes buffered share views and increments database counts with 30-day retention cleanup", async () => {
      const { ShareService } = await import("../../src/services/shareService.js");

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

      // One UPDATE … FROM unnest(…) for every link (V-110); retention is no longer part of the
      // flush (`pruneShareViews`).
      expect(prismaMock.shareLink.update).not.toHaveBeenCalled();
      const [, ids, counts, lastViewedAtMs] = prismaMock.$executeRaw.mock.calls.at(-1) as unknown[];
      expect(ids).toEqual(["link_456"]);
      expect(counts).toEqual([2]);
      expect(lastViewedAtMs).toEqual([timestamp]);
      expect(prismaMock.shareView.deleteMany).not.toHaveBeenCalled();

      expect(mockRedisStore.has("share:views:buffer")).toBe(false);
      expect(mockRedisStore.has("share:links:view_count")).toBe(false);
      expect(mockRedisStore.has("share:links:last_viewed")).toBe(false);
    });
  });
});
