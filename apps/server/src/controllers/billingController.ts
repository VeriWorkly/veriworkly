import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { isProduction } from "#config";

import { BillingService } from "#services/billingService";
import { CreditService } from "#services/creditService";

import { ApiError, createSuccessResponse, handleValidationError } from "#lib/errors";
import { isAdminUser } from "#lib/isAdminUser";

import {
  checkoutSchema,
  creditPackCheckoutSchema,
  dodoWebhookHeaderSchema,
  planChangeSchema,
} from "#validators/billingValidator";

export class BillingController {
  // Blocked in production for everyone except the configured admin, who can still exercise
  // payments end-to-end for testing. Regular users only get payments in development/staging.
  private static assertPaymentsEnabled(user: { email: string | null }) {
    if (isProduction && !isAdminUser(user.email))
      throw new ApiError(
        403,
        "Payments are disabled in production during this phase. Only administrators can perform payments.",
        { code: "PAYMENTS_DISABLED" },
      );
  }

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

      const user = requireAuthUser(req);
      BillingController.assertPaymentsEnabled(user);

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

  /**
   * Not behind the payments gate (V-182): the portal is where an existing customer cancels,
   * downloads receipts and fixes a failed card, and the delete-blocked 409 sends them here. It
   * sells nothing new.
   */
  static async portal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);

      res.json(createSuccessResponse(await BillingService.createPortal(user.id)));
    } catch (error) {
      next(error);
    }
  }

  /** V-202: what an upgrade of the live subscription would cost now and from the next bill. */
  static async previewPlanChange(req: Request, res: Response, next: NextFunction) {
    try {
      const input = planChangeSchema.parse(req.body);

      const user = requireAuthUser(req);
      BillingController.assertPaymentsEnabled(user);

      res.json(
        createSuccessResponse(
          await BillingService.previewPlanChange(user.id, input.productKey, input.interval),
        ),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  /**
   * V-202: upgrades the live subscription. An idempotency key is required, from the
   * `Idempotency-Key` header or the body (the header wins), so a retried click never asks the
   * provider twice. Answers 200 `{ status: "pending", confirmed: true, ... }` once the provider
   * accepted the change, or 202 with `confirmed: false` when its answer never arrived.
   */
  static async changePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const input = planChangeSchema.parse(req.body);

      const user = requireAuthUser(req);
      BillingController.assertPaymentsEnabled(user);

      const idempotencyKey =
        req.get("Idempotency-Key")?.trim().slice(0, 128) || input.idempotencyKey;
      if (!idempotencyKey)
        throw new ApiError(400, "An idempotency key is required to change plans.", {
          code: "IDEMPOTENCY_KEY_REQUIRED",
        });

      const result = await BillingService.changePlan(
        user.id,
        input.productKey,
        input.interval,
        idempotencyKey,
      );
      // 202 when the provider call timed out or failed in transit: the change may have applied
      // and is held as pending (`confirmed: false`); `/billing/me` shows when it lands.
      res.status(result.confirmed ? 200 : 202).json(createSuccessResponse(result));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async creditPackCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const input = creditPackCheckoutSchema.parse(req.body);

      const user = requireAuthUser(req);
      BillingController.assertPaymentsEnabled(user);

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

      // The socket peer, not a forwarded header: the unsigned bypass must only honour a true loopback caller.
      const event = BillingService.unwrapWebhook(rawBody, headers, req.socket?.remoteAddress);

      res.json(createSuccessResponse(await BillingService.processWebhook(providerEventId, event)));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
