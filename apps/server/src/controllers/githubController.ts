import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import * as githubService from "#services/githubService";

import { createSuccessResponse, handleValidationError } from "#utils/errors";

/**
 * Validation schema for GitHub query parameters.
 */

const githubQuerySchema = z.object({
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  kind: z.enum(["issue", "pull-request", "all"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export class GithubController {
  /**
   * Get GitHub project statistics (stars, forks, issues count, etc.).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await githubService.getGitHubStats();

      res.json(createSuccessResponse(stats, "GitHub stats fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get GitHub issues with filtering, pagination, and status tracking.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getIssues(req: Request, res: Response, next: NextFunction) {
    try {
      const query = githubQuerySchema.parse(req.query);
      const result = await githubService.getGitHubIssues(query);

      res.json(createSuccessResponse(result, "GitHub issues fetched successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Trigger a manual sync of GitHub data (Admin only).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async syncStats(req: Request, res: Response, next: NextFunction) {
    try {
      const syncResult = await githubService.syncGitHubStatsFromGitHub();

      res.json(createSuccessResponse(syncResult, "Manual GitHub sync completed successfully"));
    } catch (error) {
      next(error);
    }
  }
}
