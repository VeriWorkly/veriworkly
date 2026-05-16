import { z } from "zod";

export const roadmapQuerySchema = z.object({
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  sort: z.enum(["newest", "oldest", "recently-completed"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

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
  .nullable()
  .optional();

export const roadmapAdminCreateSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["todo", "in-progress", "done"]).default("todo"),
  eta: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  fullDescription: z.string().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  completedQuarter: z.string().optional(),
  details: roadmapDetailsSchema,
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

    startedAt: z.string().datetime().nullable().optional(),
    completedAt: z.string().datetime().nullable().optional(),
    completedQuarter: z.string().nullable().optional(),

    details: roadmapDetailsSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });
