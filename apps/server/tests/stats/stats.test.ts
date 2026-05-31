import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatsController } from "../../src/controllers/statsController";
import type { Request, Response, NextFunction } from "express";

const { mockIncrementUsageMetric } = vi.hoisted(() => {
  return {
    mockIncrementUsageMetric: vi.fn(),
  };
});

vi.mock("../../src/services/analyticsService", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    incrementUsageMetric: mockIncrementUsageMetric,
  };
});

vi.mock("../../src/config", () => ({
  config: {
    github: {
      syncApiKey: "secret-sync-key",
    },
    rateLimit: {
      authWindowMs: 60000,
      authMaxRequests: 20,
      windowMs: 900000,
      maxRequests: 100,
    },
  },
}));

describe("stats events endpoint validation and auth", () => {
  let req: Partial<Request> & { apiKey?: unknown };
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
    process.env.NODE_ENV = "production"; // ensures metric recording runs (not skipped in dev mode check)
  });

  it("allows allowlisted events for public requests", async () => {
    req.body = { event: "resume_created" };
    await StatsController.recordUsageMetric(req, res, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith({ event: "resume_created" });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("rejects non-allowlisted event for public requests", async () => {
    req.body = { event: "malicious_untracked_event" };
    await StatsController.recordUsageMetric(req, res, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("not allowlisted"),
      }),
    );
  });

  it("allows non-allowlisted custom events for internal requests with x-internal-key", async () => {
    req.body = { event: "custom_funnel_event" };
    req.headers["x-internal-key"] = "secret-sync-key";
    await StatsController.recordUsageMetric(req, res, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith({ event: "custom_funnel_event" });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("allows non-allowlisted custom events when authenticated via API Key", async () => {
    req.body = { event: "another_custom_event" };
    req.apiKey = { id: "key_1", scopes: ["user:read"] };
    await StatsController.recordUsageMetric(req, res, next);

    expect(mockIncrementUsageMetric).toHaveBeenCalledWith({ event: "another_custom_event" });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it("rejects events with names exceeding 64 characters", async () => {
    req.body = { event: "a".repeat(65) };
    await StatsController.recordUsageMetric(req, res, next);

    expect(mockIncrementUsageMetric).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
