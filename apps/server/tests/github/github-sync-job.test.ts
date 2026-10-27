import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-055 and V-058 against the real job and the real issue-sync service; only the stores, config
 * and logger are mocked. The freshness check is the `gitHubSync.findUnique` that selects
 * `syncedAt` alone; the sync's own read of the row selects `etag`.
 */

const mocks = vi.hoisted(() => ({
  config: {
    github: {
      owner: "",
      repo: "",
      token: "",
      projectUrl: "https://github.com/x/y",
      syncCron: "0 0,12 * * *",
      syncTimezone: "UTC",
      syncEnabled: true,
    },
  },
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  findUnique: vi.fn(),
  update: vi.fn(),
  redisSet: vi.fn(),
  locks: new Map<string, string>(),
}));

vi.mock("#config", () => ({ config: mocks.config }));
vi.mock("#lib/logger", () => ({ logger: mocks.logger }));
vi.mock("#lib/prisma", () => ({
  prisma: { gitHubSync: { findUnique: mocks.findUnique, update: mocks.update } },
}));
vi.mock("#lib/redis", () => {
  const client = {
    set: mocks.redisSet,
    get: async (key: string) => mocks.locks.get(key) ?? null,
    eval: vi.fn(async () => 1),
  };
  return {
    getRedis: () => client,
    redisWrite: (run: (redis: typeof client) => Promise<unknown>) => run(client),
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    cacheDel: vi.fn(),
    cacheDelByPrefix: vi.fn(),
  };
});

const { runGitHubSync } = await import("#jobs/githubSyncJob");

type Select = Record<string, boolean>;

const isFreshnessCheck = (args: { select?: Select }) =>
  Boolean(args.select?.syncedAt) && !args.select?.etag;

const freshnessChecks = () =>
  mocks.findUnique.mock.calls.filter(([args]) => isFreshnessCheck(args)).length;

/** The sync row: `syncedAt` as given, and an existing row so an empty fetch takes the short path. */
function syncRow(syncedAt: () => Date) {
  mocks.findUnique.mockImplementation(async (args: { select?: Select }) =>
    isFreshnessCheck(args) ? { syncedAt: syncedAt() } : { id: "sync", etag: null, data: null },
  );
}

const fresh = () => new Date();
const stale = () => new Date(Date.now() - 13 * 3_600_000);

describe("runGitHubSync", () => {
  beforeEach(() => {
    mocks.locks.clear();
    syncRow(fresh);
    mocks.update.mockResolvedValue({ issueCount: 0, syncedAt: new Date() });
    mocks.redisSet.mockImplementation(async (key: string, token: string) => {
      mocks.locks.set(key, token);
      return "OK";
    });
  });

  afterEach(() => {
    Object.assign(mocks.config.github, { owner: "", repo: "", token: "" });
  });

  it("warns exactly once across runs when GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN are empty (V-058)", async () => {
    await runGitHubSync("cron");
    await runGitHubSync("cron");
    await runGitHubSync("cron");

    expect(mocks.logger.warn).toHaveBeenCalledTimes(1);
    expect(mocks.logger.warn.mock.calls[0][0]).toMatch(/not configured/);
    expect(mocks.logger.error).not.toHaveBeenCalled();
    // The guard runs before the lock, so an unconfigured sync never touches Redis.
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("does not sync anonymously: owner and repo without a token is not configured (V-058)", async () => {
    Object.assign(mocks.config.github, { owner: "x", repo: "y", token: "" });

    await runGitHubSync("cron");

    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  describe("configured", () => {
    beforeEach(() => {
      Object.assign(mocks.config.github, { owner: "x", repo: "y", token: "t" });
    });

    it("skips the freshness check on cron runs and keeps it at startup (V-055)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      });

      // Data synced a second ago, and the cron still runs: the schedule is the intent.
      await runGitHubSync("cron");
      expect(freshnessChecks()).toBe(0);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // The startup run checks freshness and stops there.
      await runGitHubSync("startup");
      expect(freshnessChecks()).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("takes the lock before checking freshness at startup", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));

      // Another worker holds the lock: the startup run stops without reading the sync row.
      mocks.redisSet.mockResolvedValueOnce(null);
      await runGitHubSync("startup");
      expect(mocks.findUnique).not.toHaveBeenCalled();

      // The row was stale until the other worker's sync finished, just before this one got the
      // lock. Checked before the lock, this worker would have synced a second time.
      syncRow(stale);
      mocks.redisSet.mockImplementationOnce(async (key: string, token: string) => {
        mocks.locks.set(key, token);
        syncRow(fresh);
        return "OK";
      });

      await runGitHubSync("startup");
      expect(freshnessChecks()).toBe(1);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
