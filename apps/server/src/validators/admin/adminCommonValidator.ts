import { z } from "zod";

/**
 * Shared primitives for every admin list endpoint.
 *
 * Admin tables are read by a human paging through a browser, not by a batch job, so the
 * page size is capped low enough that a mistyped `limit` can never turn one click into a
 * full-table scan against production.
 */

const ADMIN_PAGE_SIZE_DEFAULT = 25;
const ADMIN_PAGE_SIZE_MAX = 100;

const numericString = (fallback: number, min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return fallback;

      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) return fallback;

      return Math.min(Math.max(Math.trunc(parsed), min), max);
    });

/** A `?days=` window: absent or non-numeric is 30, anything else is truncated and clamped. */
export const adminDaysParam = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      const parsed = value === undefined ? 30 : Number(value);
      if (!Number.isFinite(parsed)) return 30;

      return Math.min(Math.max(Math.trunc(parsed), min), max);
    });

/** A query flag: `true`/`"true"` is true, anything else false (absent included). */
export const adminFlagParam = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "true");

/** As `adminFlagParam`, but absent stays `undefined` (no filter) instead of false. */
export const adminOptionalFlagParam = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === true || value === "true"));

export const adminPaginationSchema = z.object({
  limit: numericString(ADMIN_PAGE_SIZE_DEFAULT, 1, ADMIN_PAGE_SIZE_MAX),
  offset: numericString(0, 0, 1_000_000),
});

export const adminSearchSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
});

/** ISO date window used by the audit log and every "activity between X and Y" report. */
export const adminDateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

/**
 * Every mutating admin action is written to `AdminAuditEntry`, and an entry without a
 * reason is useless three months later when someone asks why a user lost access. The
 * minimum length exists to reject placeholder reasons like "x".
 */
export const adminReasonSchema = z.string().trim().min(3).max(500);

/**
 * An optional admin-written note the other party reads (a withdrawal's `payoutNote`, an ambassador
 * review's `reviewNote`): when present it meets the same 3-character minimum as
 * `adminReasonSchema`. A blank value counts as absent. Never the audit reason, which is required.
 */
export const adminOptionalNoteSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || value.length >= 3, {
    message: "Reason must be at least 3 characters",
  });

/** A write whose only admin input is its audit reason (a delete, a sync trigger), V-081. */
export const adminReasonOnlySchema = z.object({
  reason: adminReasonSchema,
});

/**
 * The identifier an admin retypes before a destructive action (V-082): the portfolio's subdomain,
 * the share link's slug, the API key's prefix. Required: a blank value parses as absent, and
 * `assertConfirmation` refuses an absent one as CONFIRMATION_REQUIRED (with the error code the
 * studio reads, which a schema-level "Required" would not carry). The comparison itself is exact,
 * after trimming.
 */
export const adminConfirmSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((value) => (value ? value : undefined));

export const adminIdParamSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

/** Turns the validated `from`/`to` pair into a Prisma `createdAt` filter, or nothing. */
export function toCreatedAtFilter(range: { from?: string; to?: string }) {
  if (!range.from && !range.to) return undefined;

  return {
    createdAt: {
      ...(range.from ? { gte: new Date(range.from) } : {}),
      ...(range.to ? { lte: new Date(range.to) } : {}),
    },
  };
}
