import { z } from "zod";

import {
  adminOptionalFlagParam,
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const ENTITLEMENT_KEYS = [
  "ai_credits",
  "portfolio_publish",
  "seo_controls",
  "analytics",
  "watermark_removal",
] as const;

export const adminSubscriptionListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    status: z.enum(["INACTIVE", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
    productKey: z.string().trim().min(1).max(64).optional(),
    interval: z.enum(["ONE_DAY", "SEVEN_DAY", "MONTHLY", "ANNUAL"]).optional(),
    sort: z.enum(["newest", "updated", "periodEnd"]).default("updated"),
  });

/**
 * A manual subscription edit never writes the provider's ids. `cancelAtPeriodEnd` is applied at
 * the provider first (V-169) and the row takes the provider's answer; status, period and grace
 * are local overrides for an account whose webhook was lost, and move the entitlements with them
 * (V-170). The provider (Dodo) remains the source of truth; its next webhook overwrites the row.
 */
export const adminSubscriptionUpdateSchema = z
  .object({
    status: z.enum(["INACTIVE", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
    currentPeriodEnd: z.string().datetime().nullable().optional(),
    graceEndsAt: z.string().datetime().nullable().optional(),
    reason: adminReasonSchema,
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.cancelAtPeriodEnd !== undefined ||
      value.currentPeriodEnd !== undefined ||
      value.graceEndsAt !== undefined,
    "At least one field must be provided",
  );

export const adminCreditAdjustmentSchema = z
  .object({
    userId: z.string().trim().min(1),
    amount: z
      .number()
      .int()
      .min(-1_000_000)
      .max(1_000_000)
      .refine((value) => value !== 0, "Amount must be non-zero"),
    /** The admin's internal reason: kept in the admin audit log only, never shown to the user. */
    reason: adminReasonSchema,
    /**
     * What the customer's credit history says about the adjustment (V-229). Optional: without it
     * the history shows a plain label for the kind of adjustment.
     */
    customerNote: z.string().trim().min(1).max(200).optional(),
    /**
     * What the credits are (V-230): `goodwill` (never expire, not paid; the only kind that can
     * remove credits), `pack` (a lost credit pack: paid, 90-day expiry), `subscription_month` (a
     * lost month of a credits plan: paid, expires with the current credit month, replaced by the
     * next month like any allowance; at most one month's 1,000).
     */
    kind: z.enum(["goodwill", "pack", "subscription_month"]).default("goodwill"),
    /** Body alternative to the `Idempotency-Key` header; the header wins when both are sent. */
    idempotencyKey: z.string().trim().min(1).max(128).optional(),
  })
  .refine((value) => value.kind === "goodwill" || value.amount > 0, {
    message: "Only a goodwill adjustment can remove credits.",
    path: ["amount"],
  })
  .refine((value) => value.kind !== "subscription_month" || value.amount <= 1_000, {
    message: "A restored subscription month is at most 1,000 credits.",
    path: ["amount"],
  });

export const adminCreditWalletListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    sort: z.enum(["balance", "updated", "lifetime"]).default("updated"),
  });

export const adminEntitlementSchema = z.object({
  userId: z.string().trim().min(1),
  key: z.enum(ENTITLEMENT_KEYS),
  endsAt: z.string().datetime().nullable().optional(),
  reason: adminReasonSchema,
});

export const adminEntitlementListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    userId: z.string().trim().min(1).optional(),
    key: z.enum(ENTITLEMENT_KEYS).optional(),
    active: adminOptionalFlagParam,
  });

export const adminEntitlementRevokeSchema = z.object({
  reason: adminReasonSchema,
});

export const adminWebhookListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  status: z.enum(["PROCESSING", "PROCESSED", "FAILED"]).optional(),
  type: z.string().trim().min(1).max(120).optional(),
});

export const adminWebhookReplaySchema = z.object({
  reason: adminReasonSchema,
});
