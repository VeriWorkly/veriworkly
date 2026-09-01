import { z } from "zod";

import {
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminUserListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  role: z.enum(["USER", "AMBASSADOR", "ADMIN"]).optional(),
  affiliateStatus: z.enum(["NOT_ENROLLED", "PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  ambassadorStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
  subscription: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "NONE"]).optional(),
  sort: z.enum(["newest", "oldest", "name", "email"]).default("newest"),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

/**
 * Role is deliberately the only privilege field an admin can write here. Affiliate status
 * and ambassador status have their own review endpoints that also move wallets, roles and
 * cached entitlements — editing them through a generic user PATCH would skip that work.
 */
export const adminUserUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).nullable().optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(39)
      .regex(/^[a-z0-9][a-z0-9-]*$/i, "Username may only contain letters, numbers and hyphens")
      .nullable()
      .optional(),
    role: z.enum(["USER", "AMBASSADOR", "ADMIN"]).optional(),
    emailVerified: z.boolean().optional(),
    autoSyncEnabled: z.boolean().optional(),
    reason: adminReasonSchema,
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.username !== undefined ||
      value.role !== undefined ||
      value.emailVerified !== undefined ||
      value.autoSyncEnabled !== undefined,
    "At least one field must be provided",
  );

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

/**
 * Deleting a user cascades across documents, portfolios, wallets and commissions, so the
 * caller must retype the account's email. A stray click on a row action cannot satisfy this.
 */
export const adminUserDeleteSchema = z.object({
  confirmEmail: z.string().trim().email(),
  reason: adminReasonSchema,
});

export const adminUserSessionRevokeSchema = z.object({
  reason: adminReasonSchema,
});
