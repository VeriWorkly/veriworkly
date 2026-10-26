import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

/**
 * V-096: `/ready` had no timeout, so on an exhausted pool `SELECT 1` waited up to the 30 s
 * connection timeout and the probe hung instead of failing. Each dependency check is now bounded
 * at 2 s and the 503 body names the dependency that timed out.
 */

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  ping: vi.fn(),
  getRedis: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("#lib/prisma", () => {
  const prisma = { $queryRaw: mocks.queryRaw };
  return { prisma, default: prisma };
});
vi.mock("#lib/redis", () => ({ getRedis: mocks.getRedis }));
vi.mock("#lib/logger", () => ({ logger: mocks.logger }));
// `ready` never touches these; the controller imports them for `/metrics` and `/jobs`. Left real,
// they pull in every scheduled job and service, and re-importing that graph per test (below)
// overran the 10 s hook timeout on a loaded machine.
vi.mock("#lib/metrics", () => ({
  getJobLastSuccess: vi.fn(),
  getJobsBaseline: vi.fn(),
  jobStatuses: vi.fn(),
  renderMetrics: vi.fn(),
}));
vi.mock("#services/ats/extractPool", () => ({ getExtractQueueStats: vi.fn() }));
vi.mock("#jobs/scheduledJobs", () => ({ enabledJobs: vi.fn(() => new Set()) }));

// Re-imported per test: the controller keeps the in-flight database probe in module state.
let HealthController: typeof import("#controllers/healthController").HealthController;

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(function (this: typeof res, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: typeof res, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  return res;
}

describe("HealthController.ready timeouts (V-096)", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ HealthController } = await import("#controllers/healthController"));
    vi.useFakeTimers();
    mocks.getRedis.mockReturnValue({ ping: mocks.ping });
    mocks.ping.mockResolvedValue("PONG");
    mocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 200 when both dependencies answer", async () => {
    const res = makeRes();

    await HealthController.ready({} as Request, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ data: { database: "connected", redis: "connected" } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns 503 naming the database when the query hangs, within ~2 s", async () => {
    mocks.queryRaw.mockReturnValue(new Promise(() => {}));
    const res = makeRes();

    const pending = HealthController.ready({} as Request, res as unknown as Response);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(res.json).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(101);
    await pending;

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 503,
      details: { database: "timeout", redis: "connected" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns 503 naming redis when ping hangs", async () => {
    mocks.ping.mockReturnValue(new Promise(() => {}));
    const res = makeRes();

    const pending = HealthController.ready({} as Request, res as unknown as Response);
    await vi.advanceTimersByTimeAsync(2_100);
    await pending;

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ details: { database: "connected", redis: "timeout" } });
  });

  it("reports a failed dependency without leaking the error message", async () => {
    mocks.queryRaw.mockRejectedValue(
      new Error("connect ECONNREFUSED postgres://admin:secret@db:5432/veriworkly"),
    );
    mocks.getRedis.mockImplementation(() => {
      throw new Error("Redis client not ready");
    });
    const res = makeRes();

    await HealthController.ready({} as Request, res as unknown as Response);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ details: { database: "error", redis: "error" } });
    expect(JSON.stringify(res.body)).not.toContain("secret");
    expect(JSON.stringify(res.body)).not.toContain("postgres://");
  });

  /**
   * The timeout answers the probe but cannot cancel the query: `SELECT 1` stays queued in the pool
   * until a connection frees. A balancer probing every few seconds against a saturated pool used
   * to queue one more query per probe, adding to the very backlog it was reporting. Probes that
   * arrive while one is in flight share it.
   */
  it("shares one database query between probes that overlap", async () => {
    mocks.queryRaw.mockReturnValue(new Promise(() => {}));

    const first = makeRes();
    const firstPending = HealthController.ready({} as Request, first as unknown as Response);
    await vi.advanceTimersByTimeAsync(1_000);
    const second = makeRes();
    const secondPending = HealthController.ready({} as Request, second as unknown as Response);

    // The shared query is bounded too: the later probe answers when it times out, not 2 s after
    // it arrived.
    await vi.advanceTimersByTimeAsync(1_100);
    await Promise.all([firstPending, secondPending]);

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(first.body).toMatchObject({ details: { database: "timeout" } });
    expect(second.json).toHaveBeenCalled();
    expect(second.body).toMatchObject({ details: { database: "timeout" } });
    expect(vi.getTimerCount()).toBe(0);
  });

  /**
   * A connection that hangs for good never settles its query. Waiting on it would hold every later
   * probe on a dead query and report the database down long after it recovered.
   */
  it("starts a fresh probe once the shared one has timed out, even if its query never settles", async () => {
    mocks.queryRaw.mockReturnValueOnce(new Promise(() => {}));

    const stuck = makeRes();
    const stuckPending = HealthController.ready({} as Request, stuck as unknown as Response);
    await vi.advanceTimersByTimeAsync(2_100);
    await stuckPending;
    expect(stuck.body).toMatchObject({ details: { database: "timeout" } });

    // The database recovered; the hung query from the first probe is still pending.
    const res = makeRes();
    const pending = HealthController.ready({} as Request, res as unknown as Response);
    await vi.advanceTimersByTimeAsync(2_100);
    await pending;

    expect(res.statusCode).toBe(200);
    expect(mocks.queryRaw).toHaveBeenCalledTimes(2);
  });
});
