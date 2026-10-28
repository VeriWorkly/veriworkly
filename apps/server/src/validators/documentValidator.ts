import { z } from "zod";
import { DocumentType, Visibility } from "@prisma/client";

import { normalizeSlug, normalizeTags } from "#utils/slugs";

/** `GET /documents` page sizes (V-263): full bodies are large, so a page of them is smaller. */
export const DOCUMENT_PAGE_DEFAULT_LIMIT = 20;
export const DOCUMENT_PAGE_MAX_LIMIT = 50;
export const DOCUMENT_PAGE_MAX_LIMIT_WITH_CONTENT = 20;

const documentTypeSchema = z.nativeEnum(DocumentType);
const visibilitySchema = z.nativeEnum(Visibility);

const documentTitleSchema = z.string().trim().min(1).max(255);

const documentSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform((value) => normalizeSlug(value));

const documentTagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((tags) => normalizeTags(tags));

/**
 * A client-chosen document id (V-303). Bounded like a paging cursor's position id
 * (`documentListCursor.ts`, at most 64): a longer one minted a cursor the server then refused, so
 * every paged walk ending on that document failed. The studio's ids (`resume-<time>-<random>`)
 * and cuids fit.
 */
const documentIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Use 1 to 64 letters, digits, '-' or '_' for a document id.");

export const documentCreateSchema = z.object({
  id: documentIdSchema.optional(),
  type: documentTypeSchema,
  title: documentTitleSchema.optional(),
  slug: documentSlugSchema.optional(),
  tags: documentTagsSchema.optional(),
  content: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  templateId: z.string().min(1).max(64).optional(),
  visibility: visibilitySchema.optional(),
});

export const documentUpdateSchema = z.object({
  title: documentTitleSchema.optional(),
  slug: documentSlugSchema.optional(),
  updateShareSlug: z.boolean().optional(),
  tags: documentTagsSchema.optional(),
  content: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  templateId: z.string().min(1).max(64).optional(),
  visibility: visibilitySchema.optional(),
  revision: z.number().int().min(1),
});

export const documentListQuerySchema = z
  .object({
    type: z.nativeEnum(DocumentType).optional(),
    /**
     * Incremental hydrate cursor. The client has always sent this; it used to be
     * dropped silently here, so every hydrate re-downloaded the whole library.
     */
    updatedSince: z
      .string()
      .datetime()
      .optional()
      .transform((value) => (value ? new Date(value) : undefined)),
    /**
     * Document bodies are omitted by default — the client library renders from
     * metadata. Only sync, which needs to merge content, asks for them.
     */
    includeContent: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    /**
     * Page size (V-263). Every request is one keyset page, 20 by default (V-422); the unpaged
     * single response of up to 500 documents is gone.
     */
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(DOCUMENT_PAGE_MAX_LIMIT)
      .optional()
      .default(DOCUMENT_PAGE_DEFAULT_LIMIT),
    /** The previous page's `nextCursor`, sent back unchanged with the same filters. */
    // Room for a cursor naming a document id stored before ids were bounded (V-303).
    cursor: z.string().min(1).max(8192).optional(),
  })
  .refine((query) => !query.includeContent || query.limit <= DOCUMENT_PAGE_MAX_LIMIT_WITH_CONTENT, {
    message: `limit can be at most ${DOCUMENT_PAGE_MAX_LIMIT_WITH_CONTENT} when includeContent=true`,
    path: ["limit"],
  });
