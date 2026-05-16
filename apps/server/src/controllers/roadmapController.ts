import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import {
  type RoadmapSort,
  type RoadmapStatus,
  getRoadmapStats,
  getRoadmapFeatures,
  getRoadmapFeatureById,
} from "#services/roadmapService";

import { roadmapQuerySchema } from "#validators/roadmapValidator";

import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";
import { ApiError, createSuccessResponse, handleValidationError } from "#utils/errors";

export class RoadmapController {
  /**
   * Get roadmap features with filtering, sorting, and pagination.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getFeatures(req: Request, res: Response, next: NextFunction) {
    try {
      const query = roadmapQuerySchema.parse(req.query);
      const pagination = parseOffsetPagination(query, { defaultPageSize: 20, maxPageSize: 50 });

      const result = await getRoadmapFeatures({
        status: query.status as RoadmapStatus | undefined,
        sort: query.sort as RoadmapSort | undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      const meta = createOffsetPaginationMeta(result.total, pagination);

      res.json(
        createSuccessResponse(
          {
            items: result.items,
            ...meta,
          },
          "Roadmap features fetched successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Get aggregated roadmap statistics (counts by status).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await getRoadmapStats();
      res.json(createSuccessResponse(stats, "Roadmap stats fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get details of a specific roadmap feature by its ID.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getFeatureById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, "Feature ID is required");
      }

      const feature = await getRoadmapFeatureById(id);
      res.json(createSuccessResponse(feature, "Feature fetched successfully"));
    } catch (error) {
      next(error);
    }
  }
}
