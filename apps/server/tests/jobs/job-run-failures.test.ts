import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /health/jobs reads the success withJobLock records when a run's callback resolves. A job that
 * caught its own failures resolved anyway and was reported healthy; these jobs keep their step
 * isolation but must end a run that had a failing step by throwing.
 */

const mocks = vi.hoisted(() => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  recordJobSuccess: vi.fn(),
  portfolio: {
    getPendingViewDates: vi.fn(),
    flushViewsForDate: vi.fn(),
    settleLapsedPortfolios: vi.fn(),
  },
  share: { flushShareViews: vi.fn(), pruneShareViews: vi.fn() },
  analytics: { getPendingUsageMetricDates: vi.fn(), flushUsageMetricsForDate: vi.fn() },
  sweepExpiredCredits: vi.fn(),
  cleanupStaleAssets: vi.fn(),
  runAnnualCreditGrants: vi.fn(),
  retryUnsentBillingNotifications: vi.fn(),
}));

vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));
vi.mock("#config", () => ({
  config: {
    metrics: { flushCron: "0 1 * * *", flushTimezone: "UTC" },
  },
}));
vi.mock("#lib/logger", () => ({ logger: mocks.logger }));
vi.mock("#lib/metrics", () => ({ recordJobSuccess: mocks.recordJobSuccess }));
vi.mock("#lib/redis", () => {
  let held = "";
  const client = {
    set: async (_key: string, token: string) => {
      held = token;
      return "OK";
    },
    get: async () => held,
    eval: async () => 1,
  };
  return {
    getRedis: () => client,
    redisWrite: (run: (redis: typeof client) => Promise<unknown>) => run(client),
  };
});
vi.mock("#services/portfolioService", () => ({ PortfolioService: mocks.portfolio }));
vi.mock("#services/shareService", () => ({ ShareService: mocks.share }));
vi.mock("#services/analyticsService", () => mocks.analytics);
vi.mock("#services/portfolioAssetService", () => ({
  PortfolioAssetService: { cleanupStaleAssets: mocks.cleanupStaleAssets },
}));
vi.mock("#services/creditService", () => ({ sweepExpiredCredits: mocks.sweepExpiredCredits }));
vi.mock("#services/annualCreditService", () => ({
  runAnnualCreditGrants: mocks.runAnnualCreditGrants,
}));
vi.mock("#services/billingNotifications", () => ({
  retryUnsentBillingNotifications: mocks.retryUnsentBillingNotifications,
}));

const { runViewsFlush } = await import("#jobs/viewsFlushJob");
const { runUsageMetricsFlush } = await import("#jobs/usageMetricsJob");
const { runCreditSweep } = await import("#jobs/creditSweepJob");
const { runPortfolioAccessSweep } = await import("#jobs/portfolioAccessJob");
const { runAnnualCreditJob } = await import("#jobs/annualCreditJob");

beforeEach(() => {
  mocks.portfolio.getPendingViewDates.mockResolvedValue(["2026-10-01", "2026-10-02"]);
  mocks.portfolio.flushViewsForDate.mockResolvedValue({ flushedCount: 1 });
  mocks.share.flushShareViews.mockResolvedValue({ flushedViews: 0, flushedLinks: 0 });
  mocks.share.pruneShareViews.mockResolvedValue(0);
  mocks.analytics.getPendingUsageMetricDates.mockResolvedValue(["2026-10-01"]);
  mocks.analytics.flushUsageMetricsForDate.mockResolvedValue({
    dateKey: "2026-10-01",
    flushedEvents: 1,
  });
});

describe("views flush", () => {
  it("records a success when every step worked", async () => {
    await runViewsFlush("cron");

    expect(mocks.recordJobSuccess).toHaveBeenCalledWith("views-flush");
  });

  it("still runs the other steps after one fails, then reports the run as failed", async () => {
    mocks.portfolio.flushViewsForDate.mockRejectedValueOnce(new Error("deadlock"));

    await runViewsFlush("cron");

    expect(mocks.portfolio.flushViewsForDate).toHaveBeenCalledTimes(2);
    expect(mocks.share.flushShareViews).toHaveBeenCalled();
    expect(mocks.share.pruneShareViews).toHaveBeenCalled();
    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Job views-flush (views:flush:lock) failed",
      expect.objectContaining({ error: expect.stringContaining("portfolio views") }),
    );
  });

  it.each([
    ["share views", () => mocks.share.flushShareViews.mockRejectedValueOnce(new Error("x"))],
    [
      "share view retention",
      () => mocks.share.pruneShareViews.mockRejectedValueOnce(new Error("x")),
    ],
  ])("is not a success when %s fails", async (_step, fail) => {
    fail();

    await runViewsFlush("cron");

    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
  });
});

describe("usage metrics flush", () => {
  it("records a success when the flush worked", async () => {
    await runUsageMetricsFlush("cron");

    expect(mocks.recordJobSuccess).toHaveBeenCalledWith("usage-metrics");
  });

  it("is not a success when a day's flush throws", async () => {
    mocks.analytics.flushUsageMetricsForDate.mockRejectedValueOnce(new Error("timeout"));

    await expect(runUsageMetricsFlush("cron")).resolves.toBeUndefined();

    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Job usage-metrics (usage:flush:lock) failed",
      expect.objectContaining({ error: "timeout" }),
    );
  });
});

describe("credit expiry sweep", () => {
  it("records a success when every wallet was swept", async () => {
    mocks.sweepExpiredCredits.mockResolvedValue({ wallets: 2, released: 1, expired: 1, failed: 0 });

    await runCreditSweep("cron");

    expect(mocks.recordJobSuccess).toHaveBeenCalledWith("credit-sweep");
  });

  it("is not a success when any wallet failed, after every wallet was processed", async () => {
    mocks.sweepExpiredCredits.mockResolvedValue({ wallets: 3, released: 1, expired: 0, failed: 2 });

    await expect(runCreditSweep("cron")).resolves.toBeUndefined();

    expect(mocks.sweepExpiredCredits).toHaveBeenCalledTimes(1);
    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Job credit-sweep (credits:sweep:lock) failed",
      expect.objectContaining({ error: expect.stringContaining("2 wallets failed") }),
    );
  });
});

describe("portfolio access sweep", () => {
  beforeEach(() => {
    mocks.portfolio.settleLapsedPortfolios.mockResolvedValue(undefined);
    mocks.cleanupStaleAssets.mockResolvedValue(undefined);
  });

  it("records a success when both tasks worked", async () => {
    await runPortfolioAccessSweep();

    expect(mocks.recordJobSuccess).toHaveBeenCalledWith("portfolio-access");
  });

  it("is not a success when the stale asset cleanup fails", async () => {
    mocks.cleanupStaleAssets.mockRejectedValueOnce(new Error("R2 down"));

    await expect(runPortfolioAccessSweep()).resolves.toBeUndefined();

    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Job portfolio-access (portfolio:suspension:lock) failed",
      expect.objectContaining({ error: expect.stringContaining("stale asset cleanup") }),
    );
  });

  it("still cleans up assets after the lapsed-portfolio step fails, and is not a success", async () => {
    mocks.portfolio.settleLapsedPortfolios.mockRejectedValueOnce(new Error("timeout"));

    await runPortfolioAccessSweep();

    expect(mocks.cleanupStaleAssets).toHaveBeenCalled();
    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
  });
});

describe("annual credits and billing email retries", () => {
  it("still retries billing emails when the annual grants throw, and is not a success", async () => {
    mocks.runAnnualCreditGrants.mockRejectedValueOnce(new Error("pool exhausted"));
    mocks.retryUnsentBillingNotifications.mockResolvedValue({ retried: 1, sent: 1, failed: 0 });

    await expect(runAnnualCreditJob("cron")).resolves.toBeUndefined();

    expect(mocks.retryUnsentBillingNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
  });

  it("still grants credits when the email retry throws, and is not a success", async () => {
    mocks.runAnnualCreditGrants.mockResolvedValue({ schedules: 1, granted: 1, failed: 0 });
    mocks.retryUnsentBillingNotifications.mockRejectedValueOnce(new Error("pool exhausted"));

    await runAnnualCreditJob("cron");

    expect(mocks.runAnnualCreditGrants).toHaveBeenCalledTimes(1);
    expect(mocks.recordJobSuccess).not.toHaveBeenCalled();
  });
});
