import { z } from "zod";

export const changelogQuerySchema = z.object({
  type: z.enum(["major", "minor", "patch"]).optional(),
  tag: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const prRefAuthorSchema = z.object({
  login: z.string().trim().min(1),
  avatarUrl: z.string().trim().url(),
  htmlUrl: z.string().trim().url(),
});

const prRefsSchema = z
  .array(
    z.object({
      number: z.number().int().positive(),
      title: z.string().trim().min(1),
      url: z.string().trim().url().optional(),
      author: prRefAuthorSchema.nullable().optional(),
    }),
  )
  .nullable()
  .optional();

export const changelogAdminCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  version: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().nullable().optional(),
  type: z.enum(["major", "minor", "patch"]).default("minor"),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  githubUrl: z.string().trim().url().nullable().optional(),
  added: z.array(z.string().trim()).default([]),
  improved: z.array(z.string().trim()).default([]),
  fixed: z.array(z.string().trim()).default([]),
  breaking: z.array(z.string().trim()).default([]),
  security: z.array(z.string().trim()).default([]),
  tags: z.array(z.string().trim()).default([]),
  prRefs: prRefsSchema,
});

export const changelogAdminUpdateSchema = z
  .object({
    version: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().nullable().optional(),
    type: z.enum(["major", "minor", "patch"]).optional(),
    publishedAt: z.string().datetime({ offset: true }).optional(),
    githubUrl: z.string().trim().url().nullable().optional(),
    added: z.array(z.string().trim()).optional(),
    improved: z.array(z.string().trim()).optional(),
    fixed: z.array(z.string().trim()).optional(),
    breaking: z.array(z.string().trim()).optional(),
    security: z.array(z.string().trim()).optional(),
    tags: z.array(z.string().trim()).optional(),
    prRefs: prRefsSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });
