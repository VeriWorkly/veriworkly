import { z } from "zod";

import {
  adminConfirmSchema,
  adminOptionalFlagParam,
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminApiKeyListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  userId: z.string().trim().min(1).optional(),
  active: adminOptionalFlagParam,
  sort: z.enum(["newest", "lastUsed"]).default("newest"),
});

/**
 * The key material itself is never readable here — only the stored prefix/suffix are ever
 * returned, and `keyHash` is excluded from every selection in the admin service.
 */
export const adminApiKeyUpdateSchema = z
  .object({
    isActive: z.boolean().optional(),
    rateLimit: z.number().int().min(1).max(10_000).optional(),
    reason: adminReasonSchema,
  })
  .refine(
    (value) => value.isActive !== undefined || value.rateLimit !== undefined,
    "At least one field must be provided",
  );

export const adminApiKeyRevokeSchema = z.object({
  reason: adminReasonSchema,
  /** The key's `keyPrefix`, retyped (V-082); not its name, which the owner chose and may repeat. */
  // TODO(V-082): make required once the studio sends it
  confirm: adminConfirmSchema,
});
