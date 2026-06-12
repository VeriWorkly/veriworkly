import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";

import { BillingService } from "#services/billingService";
import { CreditService } from "#services/creditService";

import { ApiError, createSuccessResponse, handleValidationError } from "#utils/errors";

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

      res.json(
        createSuccessResponse(
          await BillingService.createCheckout(
            requireAuthUser(req).id,
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

  static async portal(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await BillingService.createPortal(requireAuthUser(req).id)));
    } catch (error) {
      next(error);
    }
  }

  static async creditPackCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const input = creditPackCheckoutSchema.parse(req.body);
      res.json(
        createSuccessResponse(
          await BillingService.createCreditPackCheckout(
            requireAuthUser(req).id,
            input.packKey,
            input.redirectUrl,
          ),
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
