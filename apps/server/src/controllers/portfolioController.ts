import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import {
  portfolioPublishSchema,
  portfolioSaveDraftSchema,
  portfolioSubdomainParamsSchema,
  portfolioViewBeaconSchema,
  publicPortfolioListQuerySchema,
} from "#validators/portfolioValidator";

import { requireAuthUser } from "#middleware/auth";
import { isProduction } from "#config";

import { PortfolioService } from "#services/portfolioService";

import { ApiError, createSuccessResponse, handleValidationError } from "#lib/errors";
import { isAdminUser } from "#lib/isAdminUser";

/**
 * The view body as either parser left it (V-131): JSON from `fetch`, or the JSON string a
 * `sendBeacon` sends as `text/plain`, which is what a portfolio subdomain can send without a
 * preflight. No body at all is an empty view.
 */
function parseViewBeacon(body: unknown) {
  let value: unknown = body ?? {};

  if (typeof value === "string") {
    try {
      value = value.trim() ? JSON.parse(value) : {};
    } catch {
      throw new ApiError(400, "Validation failed", [{ path: "", message: "Expected JSON" }]);
    }
  }

  return portfolioViewBeaconSchema.parse(value);
}

export class PortfolioController {
  static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset, order } = publicPortfolioListQuerySchema.parse(req.query);

      res.json(
        createSuccessResponse(await PortfolioService.listPublicPortfolios(limit, offset, order)),
      );
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
      const { referrer } = parseViewBeacon(req.body);

      await PortfolioService.recordView(req.params.subdomain, referrer, req.ip);

      res.status(202).json(createSuccessResponse(null));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
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
      // Publishing is blocked in production for everyone except the configured admin, who can
      // still exercise the full publish flow for testing. Dashboard/editor access, drafts, and
      // previews all keep working for regular users; only making a portfolio public is disabled.
      const user = requireAuthUser(req);

      if (isProduction && !isAdminUser(user.email))
        throw new ApiError(403, "Publishing is disabled in production during this phase.");

      const input = portfolioPublishSchema.parse(req.body);

      res.status(201).json(createSuccessResponse(await PortfolioService.publish(user.id, input)));
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
