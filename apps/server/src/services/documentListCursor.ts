import { z } from "zod";

import { ApiError } from "#lib/errors";

/** The `details.code` of the 400 a cursor this server did not mint (or minted for another walk) gets. */
export const INVALID_DOCUMENT_CURSOR = "INVALID_DOCUMENT_CURSOR";

/** The last row a page returned: the walk resumes strictly after it. */
const positionSchema = z.object({
  at: z.string().datetime(),
  id: z.string().min(1).max(64),
});

/** The request filters a walk was started with. A cursor is only good for the same filters. */
const filterSchema = z.object({
  type: z.string().nullable(),
  updatedSince: z.string().datetime().nullable(),
  includeContent: z.boolean(),
});

const cursorSchema = z.object({
  v: z.literal(1),
  filter: filterSchema,
  /** The first page's `serverTime`; every later page repeats it (the client's next `updatedSince`). */
  serverTime: z.string().datetime(),
  /**
   * Live documents: the last one returned, or null before the first. Kept (never marked done)
   * until the whole walk ends, so a document edited after its list ran dry still comes round.
   */
  documents: positionSchema.nullable(),
  /** Tombstones (sync walks with `updatedSince` only): same, walked beside the documents. */
  deleted: positionSchema.nullable(),
});

export type DocumentListFilter = z.infer<typeof filterSchema>;
export type DocumentListPosition = z.infer<typeof positionSchema>;
export type DocumentListCursor = z.infer<typeof cursorSchema>;

/**
 * Opaque to clients: base64url of the JSON above. It is not signed, and does not need to be: the
 * walk is always scoped to the caller's own documents, so a hand-made cursor can only skip or
 * repeat rows the caller is allowed to read anyway.
 */
export function encodeDocumentListCursor(cursor: DocumentListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function invalidCursor(): ApiError {
  return new ApiError(400, "Invalid cursor", { code: INVALID_DOCUMENT_CURSOR });
}

/**
 * Reads a cursor back, refusing anything malformed and any cursor minted for different filters
 * (a library cursor sent on a sync walk would otherwise resume in the wrong order).
 */
export function decodeDocumentListCursor(
  value: string,
  filter: DocumentListFilter,
): DocumentListCursor {
  let parsed: unknown;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalidCursor();
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw invalidCursor();
  }

  const result = cursorSchema.safeParse(parsed);
  if (!result.success) throw invalidCursor();

  const cursor = result.data;
  if (
    cursor.filter.type !== filter.type ||
    cursor.filter.updatedSince !== filter.updatedSince ||
    cursor.filter.includeContent !== filter.includeContent
  ) {
    throw invalidCursor();
  }

  return cursor;
}
