import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { config } from "#config";

import { BillingService } from "#services/billingService";
import { CreditService } from "#services/creditService";

import { ApiError, createSuccessResponse, handleValidationError } from "#lib/errors";

import {
  checkoutSchema,
  creditPackCheckoutSchema,
  dodoWebhookHeaderSchema,
} from "#validators/billingValidator";

export class BillingController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await BillingService.getSummary(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await BillingService.getHistory(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async credits(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await CreditService.getWallet(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async creditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await CreditService.getHistory(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const input = checkoutSchema.parse(req.body);

      const isProd = config.nodeEnv === "production";
      const user = requireAuthUser(req);
      const isAdmin = config.admin.email && user.email?.toLowerCase() === config.admin.email;

      if (isProd && !isAdmin)
        throw new ApiError(
          403,
          "Payments are disabled in production during this phase. Only administrators can perform payments.",
        );

      res.json(
        createSuccessResponse(
          await BillingService.createCheckout(
            user.id,
            input.productKey,
            input.interval,
            input.redirectUrl,
          ),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async cancelCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await BillingService.cancelCheckout(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async portal(req: Request, res: Response, next: NextFunction) {
    try {
      const isProd = config.nodeEnv === "production";
      const user = requireAuthUser(req);
      const isAdmin = config.admin.email && user.email?.toLowerCase() === config.admin.email;

      if (isProd && !isAdmin)
        throw new ApiError(
          403,
          "Payments are disabled in production during this phase. Only administrators can perform payments.",
        );

      res.json(createSuccessResponse(await BillingService.createPortal(user.id)));
    } catch (error) {
      next(error);
    }
  }

  static async creditPackCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const input = creditPackCheckoutSchema.parse(req.body);

      const isProd = config.nodeEnv === "production";
      const user = requireAuthUser(req);
      const isAdmin = config.admin.email && user.email?.toLowerCase() === config.admin.email;

      if (isProd && !isAdmin)
        throw new ApiError(
          403,
          "Payments are disabled in production during this phase. Only administrators can perform payments.",
        );

      res.json(
        createSuccessResponse(
          await BillingService.createCreditPackCheckout(user.id, input.packKey, input.redirectUrl),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async dodoWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

      if (!rawBody) throw new ApiError(400, "Webhook body is required.");

      const headers = Object.fromEntries(
        Object.entries(req.headers).flatMap(([key, value]) =>
          typeof value === "string" ? [[key, value]] : [],
        ),
      );

      const parsedHeaders = dodoWebhookHeaderSchema.parse(headers);
      const providerEventId = parsedHeaders["webhook-id"];

      const event = BillingService.unwrapWebhook(rawBody, headers);

      res.json(createSuccessResponse(await BillingService.processWebhook(providerEventId, event)));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
