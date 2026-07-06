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

export type OffsetPagination = {
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

export type CursorPaginationInput = {
  cursor?: unknown;
  limit?: unknown;
};

export type CursorPagination = {
  cursor: string | null;
  limit: number;
};

export function parseCursorPagination(
  query: CursorPaginationInput,
  config: PaginationConfig = {},
): CursorPagination {
  const defaultPageSize = config.defaultPageSize ?? 20;
  const maxPageSize = config.maxPageSize ?? 50;

  const parsedLimit = toPositiveInt(query.limit);
  const limit = Math.min(parsedLimit ?? defaultPageSize, maxPageSize);

  const cursor =
    typeof query.cursor === "string" && query.cursor.trim().length > 0 ? query.cursor.trim() : null;

  return { cursor, limit };
}

export function createCursorPaginationMeta<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
) {
  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor =
    hasMore && slicedItems.length > 0 ? getCursor(slicedItems[slicedItems.length - 1]) : null;

  return {
    limit,
    hasMore,
    nextCursor,
    pagination: {
      mode: "cursor" as const,
      nextOffset: null as number | null,
      nextCursor,
    },
    items: slicedItems,
  };
}
