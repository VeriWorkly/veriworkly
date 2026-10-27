import { z } from "zod";

import {
  adminFlagParam,
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminDocumentListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  type: z.enum(["RESUME", "COVER_LETTER", "PORTFOLIO", "LINK_IN_BIO"]).optional(),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(),
  userId: z.string().trim().min(1).optional(),
  includeDeleted: adminFlagParam,
  sort: z.enum(["newest", "updated"]).default("updated"),
});

export type AdminDocumentListQuery = z.infer<typeof adminDocumentListQuerySchema>;

/**
 * Admins can only pull a document *back* toward private. Making someone else's private
 * document public is a disclosure an operator should never be able to perform silently,
 * so the enum stops at UNLISTED. UNLISTED on a PRIVATE document is allowed only as the lift of a
 * moderator's own "Make private"; the service refuses it otherwise (V-286).
 */
export const adminDocumentVisibilitySchema = z.object({
  visibility: z.enum(["PRIVATE", "UNLISTED"]),
  reason: adminReasonSchema,
});

export const adminDocumentDeleteSchema = z.object({
  reason: adminReasonSchema,
});

export const adminShareLinkListQuerySchema = adminPaginationSchema.merge(adminSearchSchema).extend({
  userId: z.string().trim().min(1).optional(),
  sort: z.enum(["newest", "views"]).default("newest"),
});

export const adminShareLinkRevokeSchema = z.object({
  reason: adminReasonSchema,
});
