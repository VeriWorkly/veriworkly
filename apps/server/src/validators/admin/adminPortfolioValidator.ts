import { z } from "zod";

import {
  adminConfirmSchema,
  adminDaysParam,
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminPortfolioListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  status: z.enum(["LIVE", "GRACE", "SUSPENDED"]).optional(),
  templateId: z.string().trim().min(1).max(64).optional(),
  sort: z.enum(["newest", "updated", "views"]).default("updated"),
});

export type AdminPortfolioListQuery = z.infer<typeof adminPortfolioListQuerySchema>;

/**
 * Suspending takes a live portfolio off the public internet, so the reason is mandatory and
 * is stored on the publication itself (`suspensionReason`) as well as in the audit log. The
 * owner's `GET /portfolios/me` does not return it today; it is for admins and the moderation lock.
 */
export const adminPortfolioStatusSchema = z
  .object({
    status: z.enum(["LIVE", "GRACE", "SUSPENDED"]),
    reason: adminReasonSchema,
  })
  .refine(
    (value) => value.status !== "SUSPENDED" || value.reason.length >= 10,
    "A suspension reason of at least 10 characters is required",
  );

export const adminPortfolioUnpublishSchema = z.object({
  reason: adminReasonSchema,
  /** The publication's `subdomain`, retyped (V-082). */
  // TODO(V-082): make required once the studio sends it
  confirm: adminConfirmSchema,
});

export const adminPortfolioViewsQuerySchema = z.object({
  days: adminDaysParam(1, 365),
});

export const adminPortfolioAssetListQuerySchema = adminPaginationSchema.extend({
  status: z.enum(["PENDING", "READY", "DELETED"]).optional(),
  kind: z.enum(["AVATAR", "PROJECT_COVER", "SOCIAL_IMAGE"]).optional(),
  userId: z.string().trim().min(1).optional(),
});
