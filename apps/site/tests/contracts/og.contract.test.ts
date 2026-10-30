import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { documentTypeSummaries } from "@/config/templates";
import { COMPETITORS } from "@/features/compare/data/competitors";
import { OG_PAGES, ogPageCard } from "@/features/og/cards";

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

/** /api/og draws only cards our pages define, so it cannot mint a branded card with someone else's words (W-080). */

// Imported late: the backend URL above must be set before the fetchers read it.
const resolve = async (query: string) =>
  (await import("@/features/og/resolve")).resolveOgCard(new URLSearchParams(query));

describe("the share-card route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ignores free text", async () => {
    expect(await resolve("title=Your+account+is+locked&description=Log+in+here")).toBeNull();
  });

  it("draws a registered page and nothing else", async () => {
    expect(await resolve("page=pricing")).toEqual(OG_PAGES.pricing);
    expect(await resolve("page=toString")).toBeNull();
    expect(await resolve("page=compare:nobody")).toBeNull();
  });

  it("draws every competitor and template type the pages link to", () => {
    for (const competitor of COMPETITORS)
      expect(ogPageCard(`compare:${competitor.id}`)?.title).toContain(competitor.name);
    for (const docType of documentTypeSummaries)
      expect(ogPageCard(`templates:${docType.id}`)?.title).toBe(docType.pluralLabel);
  });

  it("draws a release from the backend's entry, not from the query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: { id: "v3-31-0", version: "3.31.0", title: "Faster pages", summary: null },
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    expect((await resolve("changelog=v3-31-0&title=Evil"))?.title).toBe("v3.31.0 - Faster pages");
  });

  it("no page builds a card from free text any more", () => {
    const appDir = join(__dirname, "..", "..", "app");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : /\.tsx?$/.test(entry.name)
            ? [join(dir, entry.name)]
            : [],
      );

    const offenders = walk(appDir).filter((file) =>
      /\/api\/og\?(?:title|description)=/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("gives every query string one canonical form, so extra params cannot mint new cache entries", async () => {
    const { canonicalOgQuery } = await import("@/features/og/resolve");
    const canonical = (query: string) => canonicalOgQuery(new URLSearchParams(query));

    expect(canonical("page=pricing")).toBe("page=pricing");
    expect(canonical("page=pricing&theme=dark")).toBe("page=pricing&theme=dark");
    expect(canonical("theme=dark&page=pricing")).toBe("page=pricing&theme=dark");
    expect(canonical("page=pricing&cachebust=1")).toBe("page=pricing");
    expect(canonical("theme=light&page=pricing")).toBe("page=pricing");
    expect(canonical("changelog=v1-0-0")).toBe("changelog=v1-0-0");
    expect(canonical("x=1")).toBe("");

    const route = readFileSync(
      join(__dirname, "..", "..", "app", "api", "og", "route.tsx"),
      "utf8",
    );
    expect(route).toContain("if (canonical !== searchParams.toString())");
    expect(route).not.toContain("public, immutable");
  });
});
