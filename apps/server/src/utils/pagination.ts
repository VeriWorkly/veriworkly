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
