import { z } from "zod";

import { adminProvidedReasonSchema } from "#validators/admin/adminCommonValidator";
import {
  notBothPageAndOffset,
  notBothPageAndOffsetError,
  publicOffsetParam,
  publicPageParam,
} from "#utils/pagination";

// Strict: an unknown key (a typo, a filter this route does not have) is a 400, not ignored.
export const changelogQuerySchema = z
  .object({
    type: z.enum(["major", "minor", "patch"]).optional(),
    tag: z.string().trim().min(1).max(60).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    page: publicPageParam,
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: publicOffsetParam,
  })
  .strict()
  .refine(notBothPageAndOffset, notBothPageAndOffsetError);

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
  id: z.string().trim().min(1).max(64).optional(),
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
  // TODO(V-081): make required once the studio sends it
  reason: adminProvidedReasonSchema,
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
    // TODO(V-081): make required once the studio sends it
    reason: adminProvidedReasonSchema,
  })
  // The audit reason alone is not an edit.
  .refine((value) => Object.keys(value).some((key) => key !== "reason"), {
    message: "At least one field is required for update",
  });
