import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { UserService } from "#services/userService";
import { invalidateSessionCache } from "#utils/authCache";

import {
  updateUserNameSchema,
  updateUsernameSchema,
  usernameAvailabilityParamsSchema,
} from "#validators/userValidator";
import { createSuccessResponse, handleValidationError } from "#utils/errors";

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
      const user = await UserService.getUserById(authUser.id);

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

      const { name } = updateUserNameSchema.parse(req.body);

      const updated = await UserService.updateUserName(user.id, name);

      const cookieHeader = req.headers.cookie || "";
      if (cookieHeader) {
        await invalidateSessionCache(cookieHeader);
      }

      res.json(createSuccessResponse(updated, "User name updated successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      next(error);
    }
  }

  static async updateUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { username } = updateUsernameSchema.parse(req.body);

      const updated = await UserService.updateUsername(user.id, username);

      const cookieHeader = req.headers.cookie || "";
      if (cookieHeader) {
        await invalidateSessionCache(cookieHeader);
      }

      res.json(createSuccessResponse(updated, "Username updated successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      next(error);
    }
  }

  static async checkUsernameAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = usernameAvailabilityParamsSchema.parse(req.params);

      const availability = await UserService.getUsernameAvailability(username);

      res.json(createSuccessResponse(availability, "Username availability fetched successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      next(error);
    }
  }

  static async updateAutoSync(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);

      const updated = await UserService.updateAutoSync(user.id, enabled);

      const cookieHeader = req.headers.cookie || "";
      if (cookieHeader) {
        await invalidateSessionCache(cookieHeader);
      }

      res.json(createSuccessResponse(updated, "Auto sync preference updated successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));

      next(error);
    }
  }
}
