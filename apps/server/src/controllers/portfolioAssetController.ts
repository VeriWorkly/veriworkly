import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";

import { PortfolioAssetService } from "#services/portfolioAssetService";

import { createSuccessResponse, handleValidationError } from "#utils/errors";

const uploadSchema = z.object({
  kind: z.enum(["AVATAR", "PROJECT_COVER", "SOCIAL_IMAGE"]),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const completeSchema = z.object({
  assetId: z.string().min(1),
  checksum: z.string().max(256).optional(),
});

export class PortfolioAssetController {
  static async uploadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        createSuccessResponse(
          await PortfolioAssetService.createUploadUrl(
            requireAuthUser(req).id,
            uploadSchema.parse(req.body),
          ),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const input = completeSchema.parse(req.body);

      res.json(
        createSuccessResponse(
          await PortfolioAssetService.complete(
            requireAuthUser(req).id,
            input.assetId,
            input.checksum,
          ),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await PortfolioAssetService.delete(requireAuthUser(req).id, req.params.id);

      res.json(createSuccessResponse(null));
    } catch (error) {
      next(error);
    }
  }
}
