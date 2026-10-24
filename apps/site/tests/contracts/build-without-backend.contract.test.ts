import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A production build runs with the backend unreachable (CI builds against a dummy URL, and a
 * deploy can race a backend restart). These pin the behaviour that keeps such a build from
 * publishing a broken site: an outage must throw, not masquerade as "no such release", and
 * the sitemap must keep its last good copy instead of shrinking to the static routes.
 */

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

vi.mock("@/features/compare", () => ({ COMPETITORS: [] }));
vi.mock("@/config/templates", () => ({ documentTypeSummaries: [], templateSummaries: [] }));

function respond(status: number, body: unknown) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

const down = () => respond(503, { success: false, message: "upstream unavailable" });
const missing = () => respond(404, { success: false, message: "not found" });

describe("changelog fetchers with the backend unreachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchChangelogEntryById returns null only for a 404", async () => {
    const { fetchChangelogEntryById, ApiRequestError } = await load();

    vi.stubGlobal("fetch", missing());
    await expect(fetchChangelogEntryById("v9-9-9")).resolves.toBeNull();

    vi.stubGlobal("fetch", down());
    await expect(fetchChangelogEntryById("v3-24-3")).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("fetchChangelogIndex and fetchChangelogDetail throw instead of returning an empty index", async () => {
    const { fetchChangelogIndex, fetchChangelogDetail, ApiRequestError } = await load();

    vi.stubGlobal("fetch", down());

    await expect(fetchChangelogIndex()).rejects.toBeInstanceOf(ApiRequestError);
    await expect(fetchChangelogDetail("v3-24-3")).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("fetchRoadmapSitemapEntries throws instead of returning a partial list", async () => {
    const { fetchRoadmapSitemapEntries, ApiRequestError } = await load();

    vi.stubGlobal("fetch", down());

    await expect(fetchRoadmapSitemapEntries()).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("fetchRoadmapFeatureById returns null only for a 404", async () => {
    const { fetchRoadmapFeatureById, ApiRequestError } = await load();

    vi.stubGlobal("fetch", missing());
    await expect(fetchRoadmapFeatureById("nope")).resolves.toBeNull();

    vi.stubGlobal("fetch", down());
    await expect(fetchRoadmapFeatureById("dark-mode")).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("the detail pages do not turn a thrown fetch into a noindex 'not found' head", () => {
    for (const page of ["changelog", "roadmap"]) {
      const source = readFileSync(
        join(__dirname, "..", "..", "app", "(marketing)", page, "[id]", "page.tsx"),
        "utf8",
      );

      expect(source, `${page}/[id]/page.tsx swallows fetch errors`).not.toMatch(
        /\.catch\(\(\) => null\)/,
      );
    }
  });
});

describe("sitemap with the backend unreachable", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("at build time lists the static routes and nothing backend-driven", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubGlobal("fetch", down());

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/templates"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/changelog"))).toBe(true);
    expect(urls.some((url) => /\/changelog\/.+/.test(url))).toBe(false);
    expect(urls.some((url) => /\/roadmap\/(?!todo|in-progress|done).+/.test(url))).toBe(false);
  });

  it("leaves out closed programs and dates the pages that carry a date (W-012)", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("AFFILIATE_PROGRAM_ENABLED", "false");
    vi.stubEnv("AMBASSADOR_PROGRAM_ENABLED", "true");
    vi.stubGlobal("fetch", down());

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const byPath = new Map(entries.map((entry) => [new URL(entry.url).pathname, entry]));

    expect(byPath.has("/affiliate")).toBe(false);
    expect(byPath.has("/ambassador")).toBe(true);

    for (const path of ["/privacy", "/terms", "/security"])
      expect(byPath.get(path)?.lastModified, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("at runtime throws so ISR keeps the last good sitemap", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    vi.stubGlobal("fetch", down());

    const { default: sitemap } = await import("@/app/sitemap");

    await expect(sitemap()).rejects.toThrow();
  });
});

async function load() {
  const [changelog, roadmap, api] = await Promise.all([
    import("@/features/changelog/services/changelog-backend"),
    import("@/features/roadmap/services/roadmap-backend"),
    import("@/utils/fetchApiData"),
  ]);

  return { ...changelog, ...roadmap, ApiRequestError: api.ApiRequestError };
}
