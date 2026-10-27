import { Request, Response, NextFunction } from "express";

import { config } from "#config";
import { createSuccessResponse, createErrorResponse } from "#lib/errors";
import { matchesSharedSecret } from "#utils/requestIp";

import {
  KNOWN_EVENTS,
  incrementUsageMetric,
  getAdminDashboardMetrics,
} from "#services/analyticsService";
import { getGitHubStats } from "#services/github/index";
import { usageMetricEventSchema } from "#validators/statsValidator";

/**
 * Events the server itself records authoritatively when the underlying action actually happens
 * (e.g. auth_login_success is incremented from the session-creation hook in auth/index.ts).
 * Public callers can't self-report these — there's no per-session dedup on this endpoint, so an
 * unauthenticated client could otherwise replay a login-success event indefinitely within the
 * rate limit and inflate the admin dashboard without ever logging in.
 */
const SERVER_ONLY_EVENTS = new Set(["auth_login_success"]);

/**
 * An internal `/stats/events` caller is identified only by `x-internal-key` equal to
 * `STATS_INTERNAL_KEY`, compared in constant time (V-024, V-151). An API key of any scope is a
 * public caller here: holding one says nothing about being trusted to write metrics.
 */
export function isInternalStatsRequest(req: Request): boolean {
  return matchesSharedSecret(req.headers["x-internal-key"], config.metrics.statsInternalKey);
}

export class StatsController {
  /**
   * Record a single usage metric (e.g., resume_created) into Redis.
   * In development mode, metric recording is skipped.
   *
   * Public callers: allow-listed events only, and every call counts as 1 whatever `value` says.
   * Internal callers: may send a `value` and `custom_*` events, within the daily custom-name cap.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async recordUsageMetric(req: Request, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === "development")
        return res
          .status(202)
          .json(
            createSuccessResponse(
              { accepted: false },
              "Skipping metric recording in development mode",
            ),
          );

      const payload = usageMetricEventSchema.parse(req.body);

      const isInternal = isInternalStatsRequest(req);

      const normalizedEvent = payload.event.trim().toLowerCase().replace(/\s+/g, "_");

      if (!isInternal) {
        if (!(KNOWN_EVENTS as readonly string[]).includes(normalizedEvent)) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                400,
                `Event '${payload.event}' is not allowlisted for public access.`,
              ),
            );
        }

        if (SERVER_ONLY_EVENTS.has(normalizedEvent)) {
          return res
            .status(400)
            .json(
              createErrorResponse(400, `Event '${payload.event}' cannot be reported directly.`),
            );
        }
      }

      await incrementUsageMetric(
        { event: payload.event, value: isInternal ? payload.value : 1 },
        { allowCustom: isInternal },
      );

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
