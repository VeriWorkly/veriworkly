import { z } from "zod";

import {
  adminPaginationSchema,
  adminProvidedReasonSchema,
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
  /** Shown to the applicant; also the audit reason when `reason` is absent. */
  reviewNote: adminProvidedReasonSchema,
  /** The internal audit reason (V-081); never shown to the applicant. */
  // TODO(V-081): make required once the studio sends it
  reason: adminProvidedReasonSchema,
});

export const adminAmbassadorRosterQuerySchema = adminPaginationSchema.merge(adminSearchSchema);
