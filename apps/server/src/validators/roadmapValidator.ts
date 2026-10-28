import { z } from "zod";

import { adminReasonSchema } from "#validators/admin/adminCommonValidator";
import {
  notBothPageAndOffset,
  notBothPageAndOffsetError,
  publicOffsetParam,
  publicPageParam,
} from "#utils/pagination";

// Strict: an unknown key (a typo, a filter this route does not have) is a 400, not ignored.
export const roadmapQuerySchema = z
  .object({
    status: z.enum(["todo", "in-progress", "done"]).optional(),
    sort: z.enum(["newest", "oldest", "recently-completed"]).optional(),
    page: publicPageParam,
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: publicOffsetParam,
    excludeId: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine(notBothPageAndOffset, notBothPageAndOffsetError);

const isoDateTime = z.string().datetime({ offset: true });

/** The whole `details` object serialized, in UTF-8 bytes: custom metadata is kept, so bounded. */
const ROADMAP_DETAILS_MAX_BYTES = 64 * 1024;

/**
 * The known sections are checked; any other top-level key is the "custom JSON metadata" the
 * studio form offers and is kept as sent (V-083), not silently dropped.
 */
const roadmapDetailsSchema = z
  .object({
    problem: z.string().nullable().optional(),
    solution: z.string().nullable().optional(),
    approach: z.string().nullable().optional(),

    keyImprovements: z.array(z.string()).nullable().optional(),

    beforeAfter: z
      .array(
        z.object({
          before: z.string(),
          after: z.string(),
        }),
      )
      .nullable()
      .optional(),

    technicalHighlights: z.array(z.string()).nullable().optional(),

    media: z
      .array(
        z.object({
          type: z.string().nullable().optional(),
          label: z.string().nullable().optional(),
          url: z.string().nullable().optional(),
        }),
      )
      .nullable()
      .optional(),

    impactMetrics: z.array(z.string()).nullable().optional(),

    githubRefs: z
      .array(
        z.object({
          number: z.number().int().positive(),
          kind: z.enum(["issue", "pull-request"]),
          title: z.string(),
          url: z.string(),
          state: z.enum(["open", "closed", "merged"]).nullable().optional(),
        }),
      )
      .nullable()
      .optional(),

    items: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().nullable().optional(),
          image: z.string().nullable().optional(),
        }),
      )
      .nullable()
      .optional(),
  })
  .passthrough()
  .refine(
    (details) => Buffer.byteLength(JSON.stringify(details), "utf8") <= ROADMAP_DETAILS_MAX_BYTES,
    {
      message: `Details must be at most ${ROADMAP_DETAILS_MAX_BYTES / 1024} KB`,
    },
  )
  .nullable()
  .optional();

/**
 * A roadmap feature as stored, without a request's audit reason: what `seed:roadmap` reads from
 * its JSON, which has no admin behind it.
 */
export const roadmapFeatureFieldsSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["todo", "in-progress", "done"]).default("todo"),
  eta: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  fullDescription: z.string().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  createdAt: isoDateTime.optional(),
  // The studio form always sends these, as null when unset.
  startedAt: isoDateTime.nullable().optional(),
  completedAt: isoDateTime.nullable().optional(),
  updatedAt: isoDateTime.optional(),
  completedQuarter: z.string().nullable().optional(),
  details: roadmapDetailsSchema,
});

/** `POST /admin/roadmap`: the feature, and the audit reason every admin write requires (V-081). */
export const roadmapAdminCreateSchema = roadmapFeatureFieldsSchema.extend({
  reason: adminReasonSchema,
});

export const roadmapAdminUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(["todo", "in-progress", "done"]).optional(),

    eta: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    fullDescription: z.string().nullable().optional(),
    whyItMatters: z.string().nullable().optional(),
    timeline: z.string().nullable().optional(),

    startedAt: isoDateTime.nullable().optional(),
    completedAt: isoDateTime.nullable().optional(),
    completedQuarter: z.string().nullable().optional(),

    details: roadmapDetailsSchema,
    reason: adminReasonSchema,
  })
  // The audit reason alone is not an edit.
  .refine((value) => Object.keys(value).some((key) => key !== "reason"), {
    message: "At least one field is required for update",
  });
