import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import {
  type ChangelogType,
  getChangelogStats,
  getChangelogEntries,
  getChangelogEntryById,
} from "#services/changelog/index";

import { changelogQuerySchema } from "#validators/changelogValidator";

import { ApiError, createSuccessResponse, handleValidationError } from "#lib/errors";
import { parseOffsetPagination, createOffsetPaginationMeta } from "#utils/pagination";

export class ChangelogController {
  /**
   * Get changelog entries with filtering, search, and pagination.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const query = changelogQuerySchema.parse(req.query);
      const pagination = parseOffsetPagination(query, { defaultPageSize: 20, maxPageSize: 50 });

      const result = await getChangelogEntries({
        type: query.type as ChangelogType | undefined,
        tag: query.tag,
        search: query.search,
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
          "Changelog entries fetched successfully",
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Get aggregated changelog statistics (counts by type, latest version).
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await getChangelogStats();
      res.json(createSuccessResponse(stats, "Changelog stats fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get details of a specific changelog entry by its id.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getEntryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) throw new ApiError(400, "Changelog entry ID is required");

      const entry = await getChangelogEntryById(id);
      res.json(createSuccessResponse(entry, "Changelog entry fetched successfully"));
    } catch (error) {
      next(error);
    }
  }
}
