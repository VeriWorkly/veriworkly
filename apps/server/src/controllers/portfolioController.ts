import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import {
  portfolioPublishSchema,
  portfolioSaveDraftSchema,
  portfolioSubdomainParamsSchema,
} from "#validators/portfolioValidator";

import { requireAuthUser } from "#middleware/auth";

import { PortfolioService } from "#services/portfolioService";

import { ApiError, createSuccessResponse, handleValidationError } from "#utils/errors";

const publicPortfolioListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export class PortfolioController {
  static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = publicPortfolioListQuerySchema.parse(req.query);

      res.json(createSuccessResponse(await PortfolioService.listPublicPortfolios(limit, offset)));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const publication = await PortfolioService.getPublicPortfolio(req.params.subdomain);

      if (!publication) throw new ApiError(404, "Portfolio not found");

      res.json(createSuccessResponse(publication));
    } catch (error) {
      next(error);
    }
  }

  static async recordView(req: Request, res: Response, next: NextFunction) {
    try {
      await PortfolioService.recordView(req.params.subdomain, req.body?.referrer);

      res.status(202).json(createSuccessResponse(null));
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await PortfolioService.getMe(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        createSuccessResponse(
          await PortfolioService.getPreview(requireAuthUser(req).id, req.params.documentId),
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  static async subdomainAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = portfolioSubdomainParamsSchema.parse(req.params);

      res.json(
        createSuccessResponse(
          await PortfolioService.isSubdomainAvailable(requireAuthUser(req).id, slug),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const input = portfolioSaveDraftSchema.parse(req.body);

      res.json(
        createSuccessResponse(await PortfolioService.saveDraft(requireAuthUser(req).id, input)),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const input = portfolioPublishSchema.parse(req.body);

      res
        .status(201)
        .json(
          createSuccessResponse(await PortfolioService.publish(requireAuthUser(req).id, input)),
        );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async unpublish(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await PortfolioService.unpublish(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async analytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await PortfolioService.getAnalytics(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }
}
