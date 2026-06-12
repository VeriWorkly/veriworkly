import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AffiliateService } from "#services/affiliateService";
import { CreditService } from "#services/creditService";
import { prisma } from "#utils/prisma";
import { createSuccessResponse, handleValidationError } from "#utils/errors";
import {
  adminCommissionSchema,
  adminCreditAdjustmentSchema,
  adminEntitlementSchema,
  adminWithdrawalStatusSchema,
  adminAffiliateSchema,
  adminCommissionStatusSchema,
} from "#validators/affiliateValidator";

async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | undefined,
  reason: string | undefined,
  metadata?: object,
) {
  await prisma.adminAuditEntry.create({ data: { actorId, action, targetType, targetId, reason, metadata } });
}

export class AdminMonetizationController {
  static async overview(_req: Request, res: Response, next: NextFunction) {
    try {
      const [affiliate, audits] = await Promise.all([
        AffiliateService.adminOverview(),
        prisma.adminAuditEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      ]);
      res.json(createSuccessResponse({ affiliate, audits }));
    } catch (error) { next(error); }
  }

  static async grantCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminCreditAdjustmentSchema.parse(req.body);
      const transaction = await CreditService.adjust(input.userId, input.amount, {
        requestId: `admin-credit:${randomUUID()}`,
        reason: input.reason,
        action: "admin_adjustment",
      });
      await audit(actor.id, "credit.grant", "User", input.userId, input.reason, { amount: input.amount });
      res.json(createSuccessResponse(transaction));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }

  static async grantEntitlement(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminEntitlementSchema.parse(req.body);
      const grant = await prisma.entitlementGrant.create({
        data: {
          userId: input.userId,
          key: input.key,
          source: "MANUAL",
          sourceId: randomUUID(),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          metadata: { reason: input.reason, actorId: actor.id },
        },
      });
      await audit(actor.id, "entitlement.grant", "User", input.userId, input.reason, { key: input.key });
      res.json(createSuccessResponse(grant));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }

  static async createCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminCommissionSchema.parse(req.body);
      const commission = await AffiliateService.createCommission(input);
      await audit(actor.id, "affiliate.commission.create", "AffiliateCommission", commission.id, input.reason);
      res.json(createSuccessResponse(commission));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }

  static async updateWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminWithdrawalStatusSchema.parse(req.body);
      const withdrawal = await AffiliateService.updateWithdrawal(req.params.id, input.status, input.payoutNote);
      await audit(actor.id, `affiliate.withdrawal.${input.status.toLowerCase()}`, "AffiliateWithdrawal", withdrawal.id, input.payoutNote);
      res.json(createSuccessResponse(withdrawal));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }

  static async updateAffiliate(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminAffiliateSchema.parse(req.body);
      const affiliate = await AffiliateService.updateAffiliate(req.params.id, input);
      await audit(actor.id, "affiliate.update", "User", affiliate.id, undefined, input);
      res.json(createSuccessResponse(affiliate));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }

  static async updateCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = requireAuthUser(req);
      const input = adminCommissionStatusSchema.parse(req.body);
      const commission = await AffiliateService.updateCommission(req.params.id, input.status, input.reason);
      await audit(actor.id, `affiliate.commission.${input.status.toLowerCase()}`, "AffiliateCommission", commission.id, input.reason);
      res.json(createSuccessResponse(commission));
    } catch (error) { next(error instanceof z.ZodError ? handleValidationError(error) : error); }
  }
}
