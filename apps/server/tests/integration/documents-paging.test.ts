import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";
import type { DocumentType } from "@prisma/client";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Keyset paging on `GET /api/v1/documents` (V-263), against real Postgres: walks that span
 * pages, an edit and a delete landing mid-walk, tombstones across pages, `total`, the request
 * limits, a bad cursor, and a request without `limit` paging 20 at a time (V-422).
 */

type ListBody = {
  data: Array<{ id: string; title: string; content?: unknown }>;
  deleted: Array<{ id: string; deletedAt: string }>;
  serverTime: string;
  nextCursor?: string | null;
  total?: number;
};

function asUser(user: TestUser) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    patch: (url: string) =>
      request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
    delete: (url: string) =>
      request(app).delete(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  };
}

const BASE = Date.UTC(2026, 0, 1);

/**
 * Inserts documents straight into Postgres (a free account may hold one per type through the
 * API) with the given `updatedAt` offsets in seconds, and `deletedAt` for tombstones.
 */
async function seed(
  userId: string,
  offsets: number[],
  options: { type?: DocumentType; deletedAtOffset?: number; prefix?: string } = {},
): Promise<string[]> {
  const ids: string[] = [];

  for (const [index, offset] of offsets.entries()) {
    const id = `${options.prefix ?? "doc"}-${index}-${randomBytes(3).toString("hex")}`;
    await prisma.document.create({
      data: {
        id,
        userId,
        type: options.type ?? "RESUME",
        title: id,
        slug: id,
        content: { basics: { name: id } },
        ...(options.deletedAtOffset !== undefined
          ? { deletedAt: new Date(BASE + (options.deletedAtOffset + index) * 1000) }
          : {}),
      },
    });
    await prisma.$executeRaw`UPDATE "Document" SET "updatedAt" = ${new Date(
      BASE + offset * 1000,
    )} WHERE id = ${id}`;
    ids.push(id);
  }

  return ids;
}

/** Follows `nextCursor` to the end, calling `between` after each page. */
async function walk(
  api: ReturnType<typeof asUser>,
  query: string,
  between?: (page: number, body: ListBody) => Promise<void>,
): Promise<ListBody[]> {
  const pages: ListBody[] = [];
  let cursor: string | null | undefined;

  do {
    const url = `/api/v1/documents?${query}${cursor ? `&cursor=${cursor}` : ""}`;
    const response = await api.get(url);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const body = response.body as ListBody;
    pages.push(body);
    cursor = body.nextCursor;
    await between?.(pages.length, body);
    expect(pages.length).toBeLessThan(50);
  } while (cursor);

  return pages;
}

describe("GET /documents keyset paging (V-263)", () => {
  it("walks the library newest first across pages, with total on every page", async () => {
    const user = await createUserWithSession();
    const ids = await seed(user.id, [10, 20, 30, 40, 50]);

    const pages = await walk(asUser(user), "limit=2");

    expect(pages.map((page) => page.data.length)).toEqual([2, 2, 1]);
    expect(pages.flatMap((page) => page.data.map((d) => d.id))).toEqual([...ids].reverse());
    expect(pages.every((page) => page.total === 5)).toBe(true);
    expect(pages.at(-1)?.nextCursor).toBeNull();
    expect(pages[0].data[0]).not.toHaveProperty("content");
  });

  it("breaks updatedAt ties by id, so no row is skipped or repeated", async () => {
    const user = await createUserWithSession();
    const ids = await seed(user.id, [5, 5, 5, 5]);

    const pages = await walk(asUser(user), "limit=1&includeContent=true");

    expect(pages.flatMap((page) => page.data.map((d) => d.id))).toEqual([...ids].sort());
  });

  it("returns a document edited mid-walk again later in the same sync walk", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const ids = await seed(user.id, [10, 20, 30, 40, 50]);

    const pages = await walk(api, "limit=2&includeContent=true", async (page, body) => {
      if (page !== 1) return;
      const edited = body.data[0];
      const current = await prisma.document.findUniqueOrThrow({ where: { id: edited.id } });
      const patched = await api
        .patch(`/api/v1/documents/${edited.id}`)
        .send({ title: "Edited mid-walk", revision: current.revision });
      expect(patched.status).toBe(200);
    });

    const seen = pages.flatMap((page) => page.data);
    // Oldest first, then the edited one again at the end with its new title.
    expect(seen.map((d) => d.id)).toEqual([...ids, ids[0]]);
    expect(seen.at(-1)?.title).toBe("Edited mid-walk");
    expect(seen[0].content).toBeDefined();
    // Every page repeats the first page's serverTime.
    expect(new Set(pages.map((page) => page.serverTime)).size).toBe(1);
  });

  it("pages tombstones beside the documents until both run out", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const live = await seed(user.id, [100, 110, 120], { prefix: "live" });
    const deleted = await seed(user.id, [1, 2, 3, 4, 5], { prefix: "gone", deletedAtOffset: 200 });

    const pages = await walk(api, "limit=2&updatedSince=2025-12-31T00:00:00.000Z");

    expect(pages.flatMap((page) => page.data.map((d) => d.id))).toEqual(live);
    expect(pages.flatMap((page) => page.deleted.map((d) => d.id))).toEqual(deleted);
    expect(pages.every((page) => page.deleted.length <= 2)).toBe(true);
    expect(pages.every((page) => page.total === 3)).toBe(true);
    expect(new Set(pages.map((page) => page.serverTime)).size).toBe(1);
  });

  it("returns a document deleted mid-walk as a tombstone in the same walk", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const ids = await seed(user.id, [100, 110, 120, 130]);

    let removed = "";
    const pages = await walk(api, "limit=1&updatedSince=2025-12-31T00:00:00.000Z", async (page) => {
      if (page !== 1) return;
      removed = ids[3];
      expect((await api.delete(`/api/v1/documents/${removed}`)).status).toBe(200);
    });

    expect(pages.flatMap((page) => page.data.map((d) => d.id))).toEqual(ids.slice(0, 3));
    expect(pages.flatMap((page) => page.deleted.map((d) => d.id))).toEqual([removed]);
  });

  it("counts only this user's live documents of the requested type", async () => {
    const user = await createUserWithSession();
    const other = await createUserWithSession();
    await seed(user.id, [1, 2, 3]);
    await seed(user.id, [4], { type: "COVER_LETTER" });
    await seed(user.id, [5], { deletedAtOffset: 6 });
    await seed(other.id, [7, 8]);

    const api = asUser(user);
    expect((await api.get("/api/v1/documents?limit=1&type=RESUME")).body.total).toBe(3);
    expect((await api.get("/api/v1/documents?limit=1")).body.total).toBe(4);
  });

  it("refuses limits past the caps", async () => {
    const api = asUser(await createUserWithSession());

    expect((await api.get("/api/v1/documents?limit=51")).status).toBe(400);
    expect((await api.get("/api/v1/documents?limit=0")).status).toBe(400);
    expect((await api.get("/api/v1/documents?limit=21&includeContent=true")).status).toBe(400);
    expect((await api.get("/api/v1/documents?limit=50")).status).toBe(200);
    expect((await api.get("/api/v1/documents?limit=20&includeContent=true")).status).toBe(200);
  });

  it("refuses a bad cursor, or one from another walk, with INVALID_DOCUMENT_CURSOR", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    await seed(user.id, [1, 2, 3]);

    const garbage = await api.get("/api/v1/documents?limit=1&cursor=not-a-cursor");
    expect(garbage.status).toBe(400);
    expect(garbage.body.details).toEqual({ code: "INVALID_DOCUMENT_CURSOR" });

    const library = (await api.get("/api/v1/documents?limit=1")).body.nextCursor as string;
    const crossed = await api.get(
      `/api/v1/documents?limit=1&includeContent=true&cursor=${library}`,
    );
    expect(crossed.status).toBe(400);
    expect(crossed.body.details).toEqual({ code: "INVALID_DOCUMENT_CURSOR" });
  });

  it("serves the first metadata page from cache and every later page fresh", async () => {
    const user = await createUserWithSession();
    const api = asUser(user);
    const ids = await seed(user.id, [10, 20, 30]);

    const first = (await api.get("/api/v1/documents?limit=2")).body as ListBody;
    // A write that bypasses the service does not bump the cache generation, so a cached page
    // still shows the old title while an uncached one shows the new.
    await prisma.$executeRaw`UPDATE "Document" SET title = 'Renamed' WHERE true`;

    const again = (await api.get("/api/v1/documents?limit=2")).body as ListBody;
    expect(again.data.map((d) => d.title)).toEqual(first.data.map((d) => d.title));

    const second = (await api.get(`/api/v1/documents?limit=2&cursor=${first.nextCursor}`))
      .body as ListBody;
    expect(second.data.map((d) => [d.id, d.title])).toEqual([[ids[0], "Renamed"]]);
  });
});

describe("GET /documents without limit pages 20 at a time (V-422)", () => {
  it("returns the first 20, newest first, with nextCursor and total", async () => {
    const user = await createUserWithSession();
    const ids = await seed(
      user.id,
      Array.from({ length: 25 }, (_, index) => index),
    );

    const response = await asUser(user).get("/api/v1/documents");

    expect(response.status).toBe(200);
    expect(response.body.data.map((d: { id: string }) => d.id)).toEqual(
      [...ids].reverse().slice(0, 20),
    );
    expect(typeof response.body.nextCursor).toBe("string");
    expect(response.body.total).toBe(25);
    expect(response.body.deleted).toEqual([]);
  });

  it("follows nextCursor through more than 20 documents without ever sending limit", async () => {
    const user = await createUserWithSession();
    const ids = await seed(
      user.id,
      Array.from({ length: 45 }, (_, index) => index),
    );

    const pages = await walk(asUser(user), "");

    expect(pages.map((page) => page.data.length)).toEqual([20, 20, 5]);
    expect(pages.flatMap((page) => page.data.map((d) => d.id))).toEqual([...ids].reverse());
    expect(pages.at(-1)?.nextCursor).toBeNull();
  });

  it("no longer answers with the old single response of up to 500", async () => {
    const user = await createUserWithSession();
    await seed(
      user.id,
      Array.from({ length: 30 }, (_, index) => index),
    );

    const metadata = await asUser(user).get("/api/v1/documents");
    expect(metadata.body.data).toHaveLength(20);
    expect(metadata.body).toHaveProperty("nextCursor");
    expect(metadata.body).toHaveProperty("total", 30);

    // The sync walk pages too: bodies and `updatedSince` without a limit.
    const withBodies = await asUser(user).get("/api/v1/documents?includeContent=true");
    expect(withBodies.body.data).toHaveLength(20);
    expect(typeof withBodies.body.nextCursor).toBe("string");

    const since = new Date(BASE).toISOString();
    const incremental = await asUser(user).get(`/api/v1/documents?updatedSince=${since}`);
    expect(incremental.body.data).toHaveLength(20);
    expect(typeof incremental.body.nextCursor).toBe("string");
  });
});
