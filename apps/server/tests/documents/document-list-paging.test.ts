import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Keyset paging on `GET /documents` (V-263): the cursor format, the request limits, which pages
 * may be cached and the order each walk uses. Postgres-backed behaviour (an edit mid-walk,
 * tombstones across pages, `total`) is in `tests/integration/documents-paging.test.ts`.
 */

const { prismaMock, cacheGetMock, cacheSetMock } = vi.hoisted(() => ({
  prismaMock: {
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
  cacheGetMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null),
  cacheSetMock: vi.fn<(...args: unknown[]) => Promise<undefined>>(async () => undefined),
}));

// `#auth/index` wraps the client with `$extends` at import (V-265).
vi.mock("#lib/prisma", () => ({
  prisma: Object.assign(prismaMock, { $extends: () => prismaMock }),
}));

vi.mock("#lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  cacheDel: vi.fn(async () => undefined),
}));

vi.mock("#lib/cacheGeneration", () => ({
  resolveGenerationalKey: vi.fn(async (namespace: string, ...parts: string[]) =>
    [namespace, "g0", ...parts].join(":"),
  ),
  bumpGeneration: vi.fn(async () => undefined),
}));

vi.mock("#services/entitlementService", () => ({
  EntitlementService: { has: vi.fn(async () => true), isPaid: vi.fn(async () => true) },
}));

import { ApiError } from "../../src/lib/errors.js";
import { DocumentService } from "../../src/services/documentService.js";
import {
  INVALID_DOCUMENT_CURSOR,
  decodeDocumentListCursor,
  encodeDocumentListCursor,
  type DocumentListCursor,
} from "../../src/services/documentListCursor.js";
import { documentListQuerySchema } from "../../src/validators/documentValidator.js";

const LIBRARY = { type: null, updatedSince: null, includeContent: false };

function cursorFor(overrides: Partial<DocumentListCursor> = {}): DocumentListCursor {
  return {
    v: 1,
    filter: LIBRARY,
    serverTime: "2026-10-01T00:00:00.000Z",
    documents: { at: "2026-09-01T00:00:00.000Z", id: "doc-5" },
    deleted: null,
    ...overrides,
  };
}

function expectInvalidCursor(run: () => unknown) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(400);
    expect((error as ApiError).details).toEqual({ code: INVALID_DOCUMENT_CURSOR });
    return;
  }
  throw new Error("expected the cursor to be refused");
}

function rows(count: number, start = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `doc-${start + index}`,
    type: "RESUME",
    updatedAt: new Date(Date.UTC(2026, 8, 1, 0, 0, start + index)),
  }));
}

beforeEach(() => {
  prismaMock.document.findMany.mockReset();
  prismaMock.document.count.mockReset().mockResolvedValue(0);
  cacheGetMock.mockReset().mockResolvedValue(null);
  cacheSetMock.mockClear();
});

describe("document list cursor", () => {
  it("round-trips through an opaque base64url string", () => {
    const cursor = cursorFor();
    const encoded = encodeDocumentListCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDocumentListCursor(encoded, LIBRARY)).toEqual(cursor);
  });

  it("refuses garbage, a wrong shape and a bad timestamp with INVALID_DOCUMENT_CURSOR", () => {
    expectInvalidCursor(() => decodeDocumentListCursor("not a cursor!", LIBRARY));
    expectInvalidCursor(() => decodeDocumentListCursor("bm90LWpzb24", LIBRARY));
    expectInvalidCursor(() =>
      decodeDocumentListCursor(
        Buffer.from(JSON.stringify({ v: 1 })).toString("base64url"),
        LIBRARY,
      ),
    );
    expectInvalidCursor(() =>
      decodeDocumentListCursor(
        encodeDocumentListCursor(cursorFor({ serverTime: "yesterday" })),
        LIBRARY,
      ),
    );
  });

  it("refuses a cursor minted for other filters", () => {
    const library = encodeDocumentListCursor(cursorFor());

    expectInvalidCursor(() =>
      decodeDocumentListCursor(library, { ...LIBRARY, includeContent: true }),
    );
    expectInvalidCursor(() => decodeDocumentListCursor(library, { ...LIBRARY, type: "RESUME" }));
    expectInvalidCursor(() =>
      decodeDocumentListCursor(library, {
        ...LIBRARY,
        updatedSince: "2026-01-01T00:00:00.000Z",
      }),
    );
  });
});

describe("document list query limits", () => {
  it("defaults limit to 20 when the caller sends none (V-422)", () => {
    expect(documentListQuerySchema.parse({}).limit).toBe(20);
    expect(documentListQuerySchema.parse({ includeContent: "true" }).limit).toBe(20);
  });

  it("accepts up to 50 for metadata and up to 20 with bodies", () => {
    expect(documentListQuerySchema.parse({ limit: "50" }).limit).toBe(50);
    expect(documentListQuerySchema.parse({ limit: "20", includeContent: "true" }).limit).toBe(20);
  });

  it("refuses 0, more than 50, and more than 20 with bodies", () => {
    expect(documentListQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(documentListQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(documentListQuerySchema.safeParse({ limit: "21", includeContent: "true" }).success).toBe(
      false,
    );
  });
});

describe("DocumentService.listDocumentPage", () => {
  it("caches the first page of the plain metadata list, with its cursor and total", async () => {
    prismaMock.document.findMany.mockResolvedValueOnce(rows(3));
    prismaMock.document.count.mockResolvedValue(7);

    const page = await DocumentService.listDocumentPage("user-1", undefined, { limit: 2 });

    expect(page.total).toBe(7);
    expect(page.documents).toHaveLength(2);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(cacheSetMock).toHaveBeenCalledTimes(1);
    expect(cacheSetMock.mock.calls[0][1]).toMatchObject({
      nextCursor: page.nextCursor,
      total: 7,
    });
  });

  it("serves a cached first page without touching Postgres", async () => {
    cacheGetMock.mockResolvedValueOnce({
      documents: [],
      serverTime: "2026-10-01T00:00:00.000Z",
      nextCursor: null,
      total: 0,
    });

    const page = await DocumentService.listDocumentPage("user-1", undefined, { limit: 20 });

    expect(page.serverTime.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(prismaMock.document.findMany).not.toHaveBeenCalled();
  });

  it("never caches a later page, a page with bodies or a sync page", async () => {
    prismaMock.document.findMany.mockResolvedValue([]);

    await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      cursor: encodeDocumentListCursor(cursorFor()),
    });
    await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      includeContent: true,
    });
    await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      updatedSince: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it("walks the library newest first and a sync oldest first, by (updatedAt, id)", async () => {
    prismaMock.document.findMany.mockResolvedValue([]);

    await DocumentService.listDocumentPage("user-1", undefined, { limit: 20 });
    await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      includeContent: true,
    });

    const [library, sync] = prismaMock.document.findMany.mock.calls.map(
      ([args]) => (args as { orderBy: unknown }).orderBy,
    );
    expect(library).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
    expect(sync).toEqual([{ updatedAt: "asc" }, { id: "asc" }]);
  });

  it("drops the live copy of a document that is also a tombstone on the same page", async () => {
    // The two lists are read by separate queries, so a delete landing between them can put one
    // document in both. The tombstone is newer, so it wins.
    const [kept, removed] = rows(2);
    prismaMock.document.findMany
      .mockResolvedValueOnce([kept, removed])
      .mockResolvedValueOnce([
        { id: removed.id, deletedAt: new Date(removed.updatedAt.getTime() + 1000) },
      ]);

    const page = await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      updatedSince: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(page.documents.map((document) => document.id)).toEqual([kept.id]);
    expect(page.deleted.map((tombstone) => tombstone.id)).toEqual([removed.id]);
  });

  it("keeps the live copy when it is newer than the tombstone (a restore)", async () => {
    const [restored] = rows(1);
    prismaMock.document.findMany
      .mockResolvedValueOnce([restored])
      .mockResolvedValueOnce([
        { id: restored.id, deletedAt: new Date(restored.updatedAt.getTime() - 1000) },
      ]);

    const page = await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 20,
      updatedSince: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(page.documents.map((document) => document.id)).toEqual([restored.id]);
  });

  it("repeats the first page's serverTime on every later page", async () => {
    prismaMock.document.findMany.mockResolvedValueOnce(rows(3));
    const first = await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 2,
      includeContent: true,
    });

    prismaMock.document.findMany.mockResolvedValueOnce(rows(1, 3));
    const second = await DocumentService.listDocumentPage("user-1", undefined, {
      limit: 2,
      includeContent: true,
      cursor: first.nextCursor ?? undefined,
    });

    expect(second.serverTime.toISOString()).toBe(first.serverTime.toISOString());
    expect(second.nextCursor).toBeNull();
  });
});
