import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { ProfileService } from "#services/profileService";

import { createSuccessResponse, handleValidationError } from "#utils/errors";

import { masterProfilePayloadSchema } from "#validators/masterProfileValidator";

export const hasMasterProfileConflict = ProfileService.hasConflict;

export class ProfileController {
  /**
   * Get the authenticated user's master profile and summary.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async getMasterProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = requireAuthUser(req);

      const responseData = await ProfileService.getMasterProfile(authUser.id);

      res.json(createSuccessResponse(responseData, "Master profile fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the authenticated user's master profile.
   * Includes optimistic concurrency control.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async updateMasterProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      const { expectedUpdatedAt, profile } = masterProfilePayloadSchema.parse(req.body);

      const updated = await ProfileService.updateMasterProfile(user.id, profile, expectedUpdatedAt);

      res.json(createSuccessResponse(updated, "Master profile updated successfully"));
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
