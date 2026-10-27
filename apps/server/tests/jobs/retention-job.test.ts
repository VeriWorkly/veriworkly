import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * V-116: the retention job's wiring. The rules themselves run against a real Postgres in
 * tests/integration/retention.test.ts; here only the schedule, the lock and the failure contract.
 */

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(() => ({ stop: vi.fn() })),
  executeRaw: vi.fn(),
  withJobLock: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("node-cron", () => ({ default: { schedule: mocks.schedule } }));
vi.mock("#config", () => ({ config: { logging: { auditRetentionDays: 90 } } }));
vi.mock("#lib/logger", () => ({ logger: mocks.logger }));
vi.mock("#lib/prisma", () => ({ prisma: { $executeRaw: mocks.executeRaw } }));
vi.mock("#lib/jobLock", () => ({
  withJobLock: mocks.withJobLock,
  createRunTracker: () => ({ track: vi.fn(), idle: async () => undefined }),
}));

const { applyRetention, readRetentionSettings, runRetention, startRetentionJob, stopRetentionJob } =
  await import("#jobs/retentionJob");

beforeEach(() => {
  mocks.withJobLock.mockImplementation(async (_name, _options, fn) => fn(async () => true));
});

describe("retention job", () => {
  it("is scheduled daily at 03:15 UTC with no startup run", async () => {
    startRetentionJob();

    expect(mocks.schedule).toHaveBeenCalledWith("15 3 * * *", expect.any(Function), {
      timezone: "UTC",
    });
    expect(mocks.withJobLock).not.toHaveBeenCalled();
    await stopRetentionJob();
  });

  it("is not scheduled when every rule is 0", () => {
    const keys = [
      "RETENTION_EXPIRED_SESSION_DAYS",
      "RETENTION_EXPIRED_VERIFICATION_DAYS",
      "RETENTION_WEBHOOK_PAYLOAD_DAYS",
      "RETENTION_AUDIT_LOG_DAYS",
      "RETENTION_ADMIN_AUDIT_DAYS",
      "RETENTION_ADMIN_MONEY_AUDIT_DAYS",
      "RETENTION_CREDIT_RESERVATION_DAYS",
      "RETENTION_CREDIT_REPLAY_DAYS",
      "RETENTION_FLUSH_BATCH_DAYS",
      "RETENTION_AFFILIATE_CLICK_DAYS",
      "RETENTION_PORTFOLIO_VIEW_DAYS",
      "RETENTION_DELETED_DOCUMENT_DAYS",
    ];
    for (const key of keys) vi.stubEnv(key, "0");
    mocks.schedule.mockClear();

    try {
      startRetentionJob();
      expect(mocks.schedule).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps going after one rule throws and reports it as failed", async () => {
    mocks.executeRaw.mockRejectedValueOnce(new Error("deadlock")).mockResolvedValue(0);

    const summary = await applyRetention({ settings: readRetentionSettings({}) });

    expect(summary.failed).toEqual(["expiredSessions"]);
    expect(summary.affected.expiredSessions).toBe(0);
    // Every other enabled rule still ran: 14 statements (portfolio views and affiliate clicks are
    // off by default; admin audit has a money class, V-207; the purge has share and publication
    // snapshot rules and the audit title rule, V-206).
    expect(mocks.executeRaw).toHaveBeenCalledTimes(14);
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "Retention rule expiredSessions failed",
      expect.objectContaining({ error: "deadlock" }),
    );
  });

  it("runs under the shared job lock and logs one summary line", async () => {
    mocks.executeRaw.mockResolvedValue(0);

    await runRetention("manual");

    expect(mocks.withJobLock).toHaveBeenCalledWith(
      "retention:lock",
      expect.objectContaining({ ttlMs: expect.any(Number), renewEveryMs: expect.any(Number) }),
      expect.any(Function),
    );
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "Retention run (manual) completed",
      expect.objectContaining({ affected: expect.any(Object), failed: [], incomplete: [] }),
    );
  });

  it("throws out of the locked run when a rule failed, so it is not recorded as a success", async () => {
    mocks.executeRaw.mockRejectedValueOnce(new Error("deadlock")).mockResolvedValue(0);
    let outcome: unknown = "resolved";
    mocks.withJobLock.mockImplementationOnce(async (_name, _options, fn) => {
      try {
        await fn(async () => true);
      } catch (error) {
        outcome = error;
      }
    });

    await runRetention("cron");

    expect(outcome).toEqual(
      expect.objectContaining({ message: expect.stringMatching(/expiredSessions/) }),
    );
  });

  it("treats 0 or a malformed value as disabled", async () => {
    mocks.executeRaw.mockResolvedValue(0);
    const settings = readRetentionSettings({
      RETENTION_EXPIRED_SESSION_DAYS: "0",
      RETENTION_AUDIT_LOG_DAYS: "-3",
    });

    const summary = await applyRetention({ settings });

    expect(settings.expiredSessions).toBe(0);
    expect(summary.affected).not.toHaveProperty("expiredSessions");
    expect(summary.affected).not.toHaveProperty("auditLogs");
    expect(readRetentionSettings({ RETENTION_FLUSH_BATCH_DAYS: "7days" }).flushBatches).toBe(7);
  });
});
