import { z } from "zod";

import {
  adminPaginationSchema,
  adminProvidedReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminAffiliateListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  status: z.enum(["NOT_ENROLLED", "PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  tier: z.enum(["TIER_1", "TIER_2", "TIER_3"]).optional(),
  sort: z.enum(["newest", "earnings", "referrals"]).default("newest"),
});

export const adminAffiliateSchema = z
  .object({
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
    tier: z.enum(["TIER_1", "TIER_2", "TIER_3"]).optional(),
    // TODO(V-081): make required once the studio sends it
    reason: adminProvidedReasonSchema,
  })
  .refine((value) => value.status || value.tier, "Status or tier is required");

/** `affiliateId` and `userId` name the same filter; two different ids would match nothing. */
const sameAffiliate = (query: { affiliateId?: string; userId?: string }) =>
  !query.affiliateId || !query.userId || query.affiliateId === query.userId;
const sameAffiliateError = {
  message: "affiliateId and userId name the same affiliate; send one, or the same id in both",
  path: ["userId"],
};

export const adminCommissionListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    status: z.enum(["PENDING", "AVAILABLE", "REVERSED", "PAID"]).optional(),
    affiliateId: z.string().trim().min(1).optional(),
    /** Same as `affiliateId`, named as the withdrawals list names it (V-272). */
    userId: z.string().trim().min(1).optional(),
  })
  .refine(sameAffiliate, sameAffiliateError);

export const adminCommissionSchema = z.object({
  referredUserId: z.string().trim().min(1),
  subscriptionId: z.string().trim().min(1).optional(),
  providerPaymentId: z.string().trim().min(1),
  purchaseAmountCents: z.number().int().min(1),
  status: z.enum(["PENDING", "AVAILABLE"]).default("PENDING"),
  // TODO(V-081): make required once the studio sends it
  reason: adminProvidedReasonSchema,
  /** ISO 4217 code of `purchaseAmountCents`; defaults to USD, the wallet currency. */
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a three-letter ISO 4217 code")
    .transform((value) => value.toUpperCase())
    .optional(),
  /** Manual conversion: the pending non-USD commission this USD commission replaces. */
  convertedFromId: z.string().trim().min(1).optional(),
});

export const adminCommissionStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "REVERSED"]),
  // TODO(V-081): make required once the studio sends it
  reason: adminProvidedReasonSchema,
});

export const adminWithdrawalListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "PAID"]).optional(),
    /**
     * One affiliate's withdrawals, by exact id (V-272); `query` is a substring search, so ann@x.com
     * also matched joann@x.com. Either name works.
     */
    affiliateId: z.string().trim().min(1).optional(),
    userId: z.string().trim().min(1).optional(),
  })
  .refine(sameAffiliate, sameAffiliateError);

export const adminWithdrawalStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  /** The audit reason for the transition (V-081); shown to the affiliate as the payout note. */
  // TODO(V-081): make required once the studio sends it
  payoutNote: adminProvidedReasonSchema,
});

export const adminReferralListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  status: z.enum(["SIGNED_UP", "CONVERTED", "REJECTED"]).optional(),
  affiliateId: z.string().trim().min(1).optional(),
});
