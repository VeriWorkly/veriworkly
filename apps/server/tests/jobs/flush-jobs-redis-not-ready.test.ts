import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-101: when Redis is not ready at a cron tick, the flush jobs used to call `getRedis()` outside
 * their `try`, so the async run rejected, `void runFlush()` became an unhandledRejection and
 * `index.ts` shut the worker down. A Redis blip must cost one skipped tick and a warning, never
 * the worker.
 */

const mocks = vi.hoisted(() => ({
  getRedis: vi.fn(),
  schedule: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  prisma: {
    auditLog: { findMany: vi.fn(), deleteMany: vi.fn() },
    portfolioPublication: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("node-cron", () => ({
  default: { schedule: mocks.schedule },
}));

vi.mock("#config", () => ({
  config: {
    metrics: { flushCron: "0 1 * * *", flushTimezone: "UTC" },
    logging: { auditRetentionDays: 90 },
    github: { syncEnabled: true, syncCron: "0 */12 * * *", syncTimezone: "UTC" },
    changelogSync: { enabled: true, cron: "0 3 * * *", timezone: "UTC" },
  },
}));

vi.mock("#lib/redis", () => ({ getRedis: mocks.getRedis }));
vi.mock("#lib/logger", () => ({ logger: mocks.logger }));
vi.mock("#lib/prisma", () => ({ prisma: mocks.prisma, default: mocks.prisma }));

vi.mock("#services/shareService", () => ({
  ShareService: { flushShareViews: vi.fn() },
}));
vi.mock("#services/portfolioService", () => ({
  PortfolioService: { getPendingViewDates: vi.fn(), flushViewsForDate: vi.fn() },
}));
vi.mock("#services/analyticsService", () => ({
  flushUsageMetricsForDate: vi.fn(),
  getPendingUsageMetricDates: vi.fn(),
}));
vi.mock("#services/portfolioAssetService", () => ({
  PortfolioAssetService: {
    // Mirrors the real method: getRedis() is its first statement.
    cleanupStaleAssets: vi.fn(async () => {
      mocks.getRedis();
    }),
  },
}));
// Both sync services mirror the real code: the sync (its freshness check included) calls
// getRedis() for its lock before doing anything else.
vi.mock("#services/github/index", () => ({
  isGitHubIssueSyncConfigured: vi.fn(() => true),
  syncGitHubStatsFromGitHub: vi.fn(async () => {
    mocks.getRedis();
  }),
}));
vi.mock("#services/changelog/index", () => ({
  // Configured, so the job is scheduled and its tick runs (V-260 skips it otherwise).
  isChangelogSyncConfigured: () => true,
  syncChangelogFromGitHubReleases: vi.fn(async () => {
    mocks.getRedis();
  }),
}));
vi.mock("#utils/portfolioPublicationCache", () => ({
  invalidatePublicPortfolioCaches: vi.fn(),
  revalidatePublicPortfolios: vi.fn(),
}));

import { runViewsFlush, startViewsFlushJob, stopViewsFlushJob } from "#jobs/viewsFlushJob";
import {
  runUsageMetricsFlush,
  startUsageMetricsJob,
  stopUsageMetricsJob,
} from "#jobs/usageMetricsJob";
import { startPortfolioAccessJob, stopPortfolioAccessJob } from "#jobs/portfolioAccessJob";
import { runGitHubSync, startGitHubSyncJob, stopGitHubSyncJob } from "#jobs/githubSyncJob";
import {
  runChangelogSync,
  startChangelogSyncJob,
  stopChangelogSyncJob,
} from "#jobs/changelogSyncJob";

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("flush jobs when Redis is not ready (V-101)", () => {
  const rejections: unknown[] = [];
  const onRejection = (reason: unknown) => rejections.push(reason);

  beforeEach(() => {
    rejections.length = 0;
    process.on("unhandledRejection", onRejection);

    mocks.getRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });
    mocks.schedule.mockImplementation((_expr: string, callback: () => void) => ({
      stop: vi.fn(),
      fire: callback,
    }));
  });

  afterEach(() => {
    process.off("unhandledRejection", onRejection);
    stopViewsFlushJob();
    stopUsageMetricsJob();
    stopPortfolioAccessJob();
    stopGitHubSyncJob();
    stopChangelogSyncJob();
  });

  it.each([
    ["GitHub sync", runGitHubSync],
    ["changelog release sync", runChangelogSync],
  ] as const)("%s resolves, warns and skips the tick", async (_name, run) => {
    await expect(run("cron")).resolves.toBeUndefined();
    await expect(run("startup")).resolves.toBeUndefined();

    expect(
      mocks.logger.warn.mock.calls.filter(([msg]) => String(msg).includes("Redis not ready")),
    ).toHaveLength(2);
    expect(mocks.logger.error).not.toHaveBeenCalled();
    expect(rejections).toEqual([]);
  });

  it("views flush resolves, warns and skips the tick", async () => {
    await expect(runViewsFlush("cron")).resolves.toBeUndefined();

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Redis not ready"),
      expect.objectContaining({ error: "Redis client not ready" }),
    );
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });

  it("usage metrics flush resolves, warns and skips the tick", async () => {
    await expect(runUsageMetricsFlush("cron")).resolves.toBeUndefined();

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Redis not ready"),
      expect.objectContaining({ error: "Redis client not ready" }),
    );
    expect(mocks.prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });

  it("starting each job and firing its cron tick never produces an unhandled rejection", async () => {
    startViewsFlushJob();
    startUsageMetricsJob();
    startPortfolioAccessJob();
    startGitHubSyncJob();
    startChangelogSyncJob();

    // Fire every scheduled tick, as node-cron would.
    for (const call of mocks.schedule.mock.results) {
      (call.value as { fire: () => void }).fire();
    }

    await flushMicrotasks();

    expect(rejections).toEqual([]);
    expect(mocks.schedule).toHaveBeenCalledTimes(5);
    // Startup run + cron tick for each of the five jobs: a warning each, never an error.
    expect(
      mocks.logger.warn.mock.calls.filter(([msg]) => String(msg).includes("Redis not ready")),
    ).toHaveLength(10);
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });
});
