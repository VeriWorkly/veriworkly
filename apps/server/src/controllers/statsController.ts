import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import { config } from "#config";
import { createSuccessResponse, createErrorResponse } from "#utils/errors";

import {
  KNOWN_EVENTS,
  incrementUsageMetric,
  getAdminDashboardMetrics,
} from "#services/analyticsService";
import { getGitHubStats } from "#services/githubService";

/**
 * Validation schema for incoming usage metrics.
 * Ensures the event name is a non-empty string with a maximum length of 64 characters,
 * and the value is a positive integer.
 */

const usageMetricEventSchema = z.object({
  event: z.string().trim().min(1).max(64),
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
      if (process.env.NODE_ENV === "development")
        return res.status(202).json("Skipping metric recording in development mode");

      const payload = usageMetricEventSchema.parse(req.body);

      const isInternal = !!(
        req.apiKey ||
        (req.headers["x-internal-key"] &&
          req.headers["x-internal-key"] === config.github.syncApiKey)
      );

      const normalizedEvent = payload.event.trim().toLowerCase().replace(/\s+/g, "_");

      if (!isInternal && !(KNOWN_EVENTS as readonly string[]).includes(normalizedEvent)) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              400,
              `Event '${payload.event}' is not allowlisted for public access.`,
            ),
          );
      }

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
