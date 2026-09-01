import { z } from "zod";

import {
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const ENTITLEMENT_KEYS = [
  "ai_credits",
  "portfolio_publish",
  "custom_subdomain",
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
 * A manual subscription edit only ever writes fields VeriWorkly owns — never the provider's
 * ids. The provider (Dodo) remains the source of truth for billing itself; this exists so
 * support can unblock an account whose webhook was lost, and the next webhook will correct it.
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

export const adminCreditAdjustmentSchema = z.object({
  userId: z.string().trim().min(1),
  amount: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((value) => value !== 0, "Amount must be non-zero"),
  reason: adminReasonSchema,
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

export const adminEntitlementListQuerySchema = adminPaginationSchema.extend({
  userId: z.string().trim().min(1).optional(),
  key: z.enum(ENTITLEMENT_KEYS).optional(),
  active: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === true || value === "true")),
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
