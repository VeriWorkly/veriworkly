import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { UserService } from "#services/userService";

import { cacheGet, cacheSet, cacheDel } from "#utils/redis";
import { createSuccessResponse, handleValidationError } from "#utils/errors";

/**
 * Validation schemas for user-related requests
 */

const updateUserNameSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(255, "Name is too long"),
});

export class UserController {
  /**
   * Get the current authenticated user's information.
   * Leverages Redis caching for performance.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = requireAuthUser(req);

      const cacheKey = `user:me:${authUser.id}`;

      // Check cache first
      const cachedUser = await cacheGet(cacheKey);
      if (cachedUser) {
        return res.json(createSuccessResponse(cachedUser, "User information fetched from cache"));
      }

      // Fetch from database via UserService
      const user = await UserService.getUserById(authUser.id);

      // Cache the result for 30 minutes
      await cacheSet(cacheKey, user, 1800);

      res.json(createSuccessResponse(user, "User information fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the authenticated user's display name.
   * Invalidates and refreshes the user cache upon success.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async updateUserName(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      // Validate request body
      const { name } = updateUserNameSchema.parse(req.body);

      // Perform update via UserService
      const updated = await UserService.updateUserName(user.id, name);

      // Invalidate existing cache and set new data
      const cacheKey = `user:me:${user.id}`;

      await cacheDel(cacheKey);
      await cacheSet(cacheKey, updated, 1800);

      res.json(createSuccessResponse(updated, "User name updated successfully"));
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
