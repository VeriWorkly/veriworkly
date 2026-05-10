import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { ProfileService } from "#services/profileService";

import { masterProfilePayloadSchema } from "#validators/masterProfileValidator";

import { cacheDel, cacheGet, cacheSet } from "#utils/redis";
import { createSuccessResponse, handleValidationError } from "#utils/errors";

export class ProfileController {
  /**
   * Get the authenticated user's master profile and summary.
   * Leverages Redis caching for optimized performance.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getMasterProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = requireAuthUser(req);

      const cacheKey = `profile:${authUser.id}`;

      // Try fetching from cache
      const cachedData = await cacheGet(cacheKey);

      if (cachedData) {
        return res.json(createSuccessResponse(cachedData, "Master profile fetched from cache"));
      }

      // Fetch from service
      const responseData = await ProfileService.getMasterProfile(authUser.id);

      // Cache the result for 1 hour
      await cacheSet(cacheKey, responseData, 3600);

      res.json(createSuccessResponse(responseData, "Master profile fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the authenticated user's master profile.
   * Includes optimistic concurrency control and invalidates cache.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async updateMasterProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      // Validate request body
      const { expectedUpdatedAt, profile } = masterProfilePayloadSchema.parse(req.body);

      // Perform update via service (which handles conflicts and size checks)
      const updated = await ProfileService.updateMasterProfile(user.id, profile, expectedUpdatedAt);

      // Invalidate the cache
      await cacheDel(`profile:${user.id}`);

      res.json(createSuccessResponse(updated, "Master profile updated successfully"));
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
