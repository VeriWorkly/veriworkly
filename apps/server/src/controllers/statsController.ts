import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import { createSuccessResponse } from "#utils/errors";

import { getGitHubStats } from "#services/githubService";
import { getAdminDashboardMetrics, incrementUsageMetric } from "#services/analyticsService";

/**
 * Validation schema for incoming usage metrics.
 * Ensures the event name is a non-empty string and the value is a positive integer.
 */

const usageMetricEventSchema = z.object({
  event: z.string().trim().min(1),
  value: z.number().int().positive().max(1000).optional(),
});

export class StatsController {
  /**
   * Record a single usage metric (e.g., resume_created) into Redis.
   * In development mode, metric recording is skipped.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async recordUsageMetric(req: Request, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === "development") {
        return res.status(202).json("Skipping metric recording in development mode");
      }

      const payload = usageMetricEventSchema.parse(req.body);

      await incrementUsageMetric(payload);

      res.status(202).json(createSuccessResponse({ accepted: true }, "Metric accepted"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch aggregated data for the Admin Dashboard.
   * Combines GitHub repository stats and internal usage metrics.
   * Protected by admin authentication middleware.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getAdminDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const [githubStats, usageMetrics] = await Promise.all([
        getGitHubStats(),
        getAdminDashboardMetrics(),
      ]);

      res.json(
        createSuccessResponse(
          { githubStats, usageMetrics },
          "Admin dashboard stats fetched successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }
}
