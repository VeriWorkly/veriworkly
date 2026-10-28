import { z } from "zod";

import {
  adminOptionalNoteSchema,
  adminPaginationSchema,
  adminReasonSchema,
  adminSearchSchema,
} from "#validators/admin/adminCommonValidator";

export const adminAmbassadorListQuerySchema = adminPaginationSchema
  .merge(adminSearchSchema)
  .extend({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    graduationYear: z
      .string()
      .trim()
      .regex(/^\d{4}$/)
      .optional(),
    sort: z.enum(["newest", "oldest"]).default("newest"),
  });

export type AdminAmbassadorListQuery = z.infer<typeof adminAmbassadorListQuerySchema>;

export const adminAmbassadorReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  /** Shown to the applicant; optional, and never the audit reason. */
  reviewNote: adminOptionalNoteSchema,
  /** The internal audit reason (V-081), required; never shown to the applicant. */
  reason: adminReasonSchema,
});

export const adminAmbassadorRosterQuerySchema = adminPaginationSchema.merge(adminSearchSchema);
