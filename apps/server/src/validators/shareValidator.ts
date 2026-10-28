import { z } from "zod";

import { normalizeSlug, normalizeUsername } from "#utils/slugs";

/**
 * Validation schemas for sharing-related requests
 */

/**
 * Expiry (V-412; the owner's rule is 7, 14, 30 or 90 days, or never, and 7 by default):
 * `noExpiry: true` is never; `expiresAt` must be 7, 14, 30 or 90 days out, or the link's stored
 * date; with neither, a new link lasts 7 days and a refresh keeps its expiry. The service checks
 * the date.
 *
 * `allowDownload` (V-421) is whether the public page shows a Download button; true for a new
 * link, and a refresh without it keeps the stored value.
 */
export const shareLinkCreateSchema = z
  .object({
    documentId: z.string().min(1),
    snapshot: z.record(z.string(), z.any()),
    password: z.string().min(1).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    noExpiry: z.boolean().optional(),
    updateSlug: z.boolean().optional(),
    removePassword: z.boolean().optional(),
    allowDownload: z.boolean().optional(),
  })
  .refine((body) => !(body.noExpiry && body.expiresAt), {
    message: "Send either noExpiry or expiresAt, not both.",
    path: ["expiresAt"],
  });

export const shareLinkPasswordSchema = z.object({
  password: z.string().min(1),
});

export const sharedDocumentIdsQuerySchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
});

export const publicReadableParamsSchema = z.object({
  username: z.string().transform((value) => normalizeUsername(value)),
  slug: z.string().transform((value) => normalizeSlug(value)),
});
