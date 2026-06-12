import { z } from "zod";

export const referralCodeSchema = z.object({
  code: z.string().trim().min(4).max(32).regex(/^[a-z0-9-]+$/i),
});

export const clickSchema = referralCodeSchema.extend({
  referrerHost: z.string().trim().max(255).optional(),
});

export const withdrawalSchema = z.object({
  amountCents: z.number().int().min(2_500).max(10_000_000),
});

export const adminCreditAdjustmentSchema = z.object({
  userId: z.string().trim().min(1),
  amount: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(500),
});

export const adminEntitlementSchema = z.object({
  userId: z.string().trim().min(1),
  key: z.enum([
    "ai_credits",
    "portfolio_publish",
    "custom_subdomain",
    "seo_controls",
    "analytics",
    "watermark_removal",
  ]),
  endsAt: z.string().datetime().nullable().optional(),
  reason: z.string().trim().min(3).max(500),
});

export const adminCommissionSchema = z.object({
  referredUserId: z.string().trim().min(1),
  subscriptionId: z.string().trim().min(1).optional(),
  providerPaymentId: z.string().trim().min(1),
  purchaseAmountCents: z.number().int().min(1),
  status: z.enum(["PENDING", "AVAILABLE"]).default("PENDING"),
  reason: z.string().trim().max(500).optional(),
});

export const adminWithdrawalStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  payoutNote: z.string().trim().max(500).optional(),
});

export const adminAffiliateSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3"]).optional(),
}).refine((value) => value.status || value.tier, "Status or tier is required");

export const adminCommissionStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "REVERSED"]),
  reason: z.string().trim().max(500).optional(),
});
