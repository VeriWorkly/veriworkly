import { z } from "zod";
import { NextFunction, Request, Response } from "express";

import { requireAuthUser } from "#middleware/auth";

import { ProfileService } from "#services/profileService";
import { ProfileImportService } from "#services/profileImportService";
import { ProfileImportQuotaService } from "#services/profileImportQuotaService";

import { createSuccessResponse, handleValidationError } from "#lib/errors";

import { masterProfilePayloadSchema } from "#validators/masterProfileValidator";
import { importGithubSchema, importLinkedinSchema } from "#validators/profileImportValidator";

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

  /**
   * Fetch current profile import quotas for LinkedIn and GitHub.
   */
  static async getImportQuota(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const githubQuota = await ProfileImportQuotaService.checkQuota(user.id, "github");
      const linkedinQuota = await ProfileImportQuotaService.checkQuota(user.id, "linkedin");

      res.json(
        createSuccessResponse(
          { github: githubQuota, linkedin: linkedinQuota },
          "Quota status fetched successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import GitHub profile data.
   */
  static async importGithub(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { usernameOrUrl, replaceMaster } = importGithubSchema.parse(req.body);

      const doc = await ProfileImportService.importFromGithub(
        user.id,
        usernameOrUrl,
        replaceMaster,
      );

      res.json(createSuccessResponse(doc, "GitHub profile imported successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }

  /**
   * Import LinkedIn profile data.
   */
  static async importLinkedin(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const { profileText, replaceMaster } = importLinkedinSchema.parse(req.body);

      const doc = await ProfileImportService.importFromLinkedin(
        user.id,
        profileText,
        replaceMaster,
      );

      res.json(createSuccessResponse(doc, "LinkedIn profile imported successfully"));
    } catch (error) {
      if (error instanceof z.ZodError) return next(handleValidationError(error));
      next(error);
    }
  }
}
