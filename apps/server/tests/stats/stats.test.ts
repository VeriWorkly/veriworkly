import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatsController } from "../../src/controllers/statsController.js";
import type { Request, Response, NextFunction } from "express";

const { mockIncrementUsageMetric } = vi.hoisted(() => {
  return {
    mockIncrementUsageMetric: vi.fn(),
  };
});

vi.mock("#services/analyticsService", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    incrementUsageMetric: mockIncrementUsageMetric,
  };
});

vi.mock("#config", () => ({
  config: {
    github: {
      syncApiKey: "secret-sync-key",
    },
    metrics: {
      statsInternalKey: "stats-internal-key-0123456789abcdef0123",
    },
    rateLimit: {
      authWindowMs: 60000,
      authMaxRequests: 20,
      windowMs: 900000,
      maxRequests: 100,
      globalWindowMs: 900000,
      globalMaxRequests: 1000,
    },
    // Present because this module graph transitively imports #lib/prisma, which sizes the
    // connection pool from the cluster worker count at load time.
    server: {
      clusteringEnabled: false,
      workers: 1,
    },
  },
  isProduction: false,
}));

describe("stats events endpoint validation and auth", () => {
  // Only the fields the controller reads: an API key's id and scopes, not the whole stored row.
  let req: Partial<Omit<Request, "apiKey" | "headers">> & {
    headers: Record<string, string>;
    apiKey?: Pick<NonNullable<Request["apiKey"]>, "id" | "scopes">;
  };
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockIncrementUsageMetric.mockReset();
    req = {
      body: {},
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.stubEnv("NODE_ENV", "production"); // ensures metric recording runs (not skipped in dev mode check)
  });

  it("allows allowlisted events for public requests", async () => {
    req.body = { event: "resume_created" };
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith(
      { event: "resume_created", value: 1 },
      { allowCustom: false },
    );
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("forces value to 1 for public requests (V-024)", async () => {
    req.body = { event: "resume_created", value: 1000 };
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith(
      { event: "resume_created", value: 1 },
      { allowCustom: false },
    );
  });

  it("rejects non-allowlisted event for public requests", async () => {
    req.body = { event: "malicious_untracked_event" };
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("not allowlisted"),
      }),
    );
  });

  it("allows custom events and a value with x-internal-key = STATS_INTERNAL_KEY", async () => {
    req.body = { event: "custom_funnel_event", value: 5 };
    req.headers["x-internal-key"] = "stats-internal-key-0123456789abcdef0123";
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith(
      { event: "custom_funnel_event", value: 5 },
      { allowCustom: true },
    );
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("does not treat the GitHub sync key as the stats key (V-151)", async () => {
    req.body = { event: "custom_funnel_event" };
    req.headers["x-internal-key"] = "secret-sync-key";
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("treats an API key of any scope as a public caller (V-024)", async () => {
    req.body = { event: "another_custom_event" };
    req.apiKey = { id: "key_1", scopes: ["user:read"] };
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects events with names exceeding 64 characters", async () => {
    req.body = { event: "a".repeat(65) };
    await StatsController.recordUsageMetric(req as Request, res as Response, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
