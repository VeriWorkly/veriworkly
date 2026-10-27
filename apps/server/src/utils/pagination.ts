import { z } from "zod";

/**
 * The deepest row any offset list serves (V-064). Past it a page is refused with a 400: an
 * unbounded `page=1e300` overflowed the query's OFFSET and answered 500.
 */
export const MAX_LIST_OFFSET = 1_000_000;

/**
 * `page`/`offset` for the public list schemas. A blank value (`?offset=`) counts as absent, so it
 * neither coerces to 0 nor trips the both-sent rule below.
 */
const blankAsAbsent = (value: unknown) => (value === "" ? undefined : value);

export const publicPageParam = z.preprocess(
  blankAsAbsent,
  z.coerce.number().int().min(1).max(MAX_LIST_OFFSET).optional(),
);
export const publicOffsetParam = z.preprocess(
  blankAsAbsent,
  z.coerce.number().int().min(0).max(MAX_LIST_OFFSET).optional(),
);

/**
 * Both name a position; when both were sent, offset's rows went out under page's meta (V-064).
 * Applied with `.refine` on the public query schemas only.
 */
export const notBothPageAndOffset = (query: { page?: number; offset?: number }) =>
  query.page === undefined || query.offset === undefined;

export const notBothPageAndOffsetError = {
  message: "Send either page or offset, not both",
  path: ["offset"],
};

/**
 * Public list responses past this offset are served from Postgres, not cached: any offset is
 * allowed (the site and studio walk whole lists), but each one would otherwise be its own
 * long-lived Redis key (V-061).
 */
export const MAX_CACHED_OFFSET = 200;

type PaginationInput = {
  page?: unknown;
  pageSize?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type PaginationConfig = {
  defaultPageSize?: number;
  maxPageSize?: number;
};

type OffsetPagination = {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
};

function toPositiveInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;

  return num;
}

function toNonNegativeInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return null;

  return num;
}

export function parseOffsetPagination(
  query: PaginationInput,
  config: PaginationConfig = {},
): OffsetPagination {
  const defaultPageSize = config.defaultPageSize ?? 20;
  const maxPageSize = config.maxPageSize ?? 50;

  const parsedPage = toPositiveInt(query.page);
  const parsedPageSize = toPositiveInt(query.pageSize);

  const parsedLimit = toPositiveInt(query.limit);
  const parsedOffset = toNonNegativeInt(query.offset);

  const pageSize = Math.min(parsedPageSize ?? parsedLimit ?? defaultPageSize, maxPageSize);
  const page = parsedPage ?? (parsedOffset != null ? Math.floor(parsedOffset / pageSize) + 1 : 1);

  const limit = pageSize;
  const offset = parsedOffset ?? (page - 1) * pageSize;

  // A validation error (400 with the field named), like the public params' `.max()`. Not an
  // ApiError: the studio's contract tests load this module with only zod available.
  if (offset > MAX_LIST_OFFSET)
    throw new z.ZodError([
      {
        code: "custom",
        path: [parsedOffset != null ? "offset" : "page"],
        message: `Must not reach past row ${MAX_LIST_OFFSET}`,
        input: parsedOffset ?? parsedPage,
      },
    ]);

  return { page, pageSize, limit, offset };
}

export function createOffsetPaginationMeta(total: number, pagination: OffsetPagination) {
  const hasMore = pagination.offset + pagination.limit < total;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  return {
    total,
    limit: pagination.limit,
    offset: pagination.offset,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
    hasMore,
    pagination: {
      mode: "offset" as const,
      nextOffset: hasMore ? pagination.offset + pagination.limit : null,
      nextCursor: null as string | null,
    },
  };
}

/**
 * The admin list envelope: the page plus the window it was read with. Lists that report an extra
 * total (amount, size) spread this and add their own field.
 */
export function listPage<T>(items: T[], total: number, query: { limit: number; offset: number }) {
  return { items, total, limit: query.limit, offset: query.offset };
}
