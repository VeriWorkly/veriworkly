import { afterEach, describe, expect, it, vi } from "vitest";

import { sortOrders } from "@/features/roadmap/sort-orders";

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

describe("roadmap client-side sort orders match the server's", () => {
  const item = (id: string, createdAt: string, completedAt?: string, updatedAt = createdAt) => ({
    id,
    title: id,
    status: "done",
    createdAt,
    completedAt,
    updatedAt,
  });

  const items = [
    item("c", "2026-03-01", undefined, "2026-09-01"),
    item("b", "2026-02-01", "2026-08-01"),
    item("a", "2026-01-01", "2026-09-01"),
    item("d", "2026-04-01", undefined, "2026-10-01"),
  ];

  it("oldest is createdAt ascending", () => {
    expect(sortOrders(items).oldest).toEqual(["a", "b", "c", "d"]);
  });

  it("recently completed is completedAt descending, never-completed last by updatedAt", () => {
    expect(sortOrders(items)["recently-completed"]).toEqual(["a", "b", "d", "c"]);
  });
});

describe("roadmap status walk", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the pages after the first in parallel and keeps every item once", async () => {
    const total = 120;
    const urls: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        urls.push(url.search);
        const offset = Number(url.searchParams.get("offset"));
        const limit = Number(url.searchParams.get("limit"));
        const ids = Array.from(
          { length: Math.max(Math.min(limit, total - offset), 0) },
          (_, i) => `item-${offset + i}`,
        );

        return Response.json({
          success: true,
          message: "ok",
          data: {
            items: ids.map((id) => ({
              id,
              title: id,
              status: "todo",
              createdAt: "2026-01-01",
              updatedAt: "2026-01-01",
            })),
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
            pagination: { mode: "offset", nextOffset: null, nextCursor: null },
          },
        });
      }),
    );

    const { fetchRoadmapFromBackend } = await import("@/features/roadmap/services/roadmap-backend");
    const data = await fetchRoadmapFromBackend({ status: "todo" });
    const todo = data.sections.find((section) => section.status === "todo")!;

    expect(todo.items).toHaveLength(total);
    expect(urls.filter((search) => search.includes("status=todo"))).toHaveLength(3);
    expect(data.failedStatuses).toEqual([]);
  });

  it("reports a column the backend could not deliver instead of showing it as empty", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("status=done")
          ? Response.json({ success: false, message: "down" }, { status: 503 })
          : Response.json({
              success: true,
              message: "ok",
              data: {
                items: [],
                total: 0,
                limit: 50,
                offset: 0,
                hasMore: false,
                pagination: { mode: "offset", nextOffset: null, nextCursor: null },
              },
            }),
      ),
    );

    const { fetchRoadmapFromBackend } = await import("@/features/roadmap/services/roadmap-backend");

    expect((await fetchRoadmapFromBackend()).failedStatuses).toEqual(["done"]);
  });
});
