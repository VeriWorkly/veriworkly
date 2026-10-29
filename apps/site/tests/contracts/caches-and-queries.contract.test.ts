import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Values a visitor chooses (search text, page numbers, ids, image URLs) must not grow the site's
 * caches without bound or spend the API's rate limit, which every server render shares.
 */

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

const require = createRequire(import.meta.url);
const source = (file: string) => readFileSync(join(__dirname, "..", "..", file), "utf8");

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const envelope = (data: unknown) =>
  vi.fn<Fetch>(async () => Response.json({ success: true, message: "ok", data }));
const down = () =>
  vi.fn<Fetch>(async () => Response.json({ success: false, message: "down" }, { status: 503 }));

describe("changelog and stats queries (W-104, W-105, W-117)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("a search is fetched per request, never written to the data cache", async () => {
    const fetchMock = envelope({ items: [], total: 0 });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchChangelogFromBackend } =
      await import("@/features/changelog/services/changelog-backend");

    await fetchChangelogFromBackend({ search: "engine" }, 1);
    const searched = fetchMock.mock.calls.find(([url]) => String(url).includes("search="))!;
    expect(searched[1]).toMatchObject({ cache: "no-store" });
    expect(searched[1]).not.toHaveProperty("next");

    fetchMock.mockClear();
    await fetchChangelogFromBackend({}, 1);
    const plain = fetchMock.mock.calls.find(([url]) => String(url).includes("limit=15"))!;
    expect(plain[1]).toMatchObject({ next: { tags: ["changelog"] } });
  });

  it("an outage is reported as failed, so a filtered view shows the outage state", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", down());
    const { fetchChangelogFromBackend } =
      await import("@/features/changelog/services/changelog-backend");

    expect((await fetchChangelogFromBackend({ type: "minor" }, 1)).failed).toBe(true);
    expect(source("features/changelog/components/list/ChangelogTimeline.tsx")).toContain(
      "entries.length === 0 && (failed || !filtered)",
    );
  });

  it("a failure is one log line with status and message, not the error object", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", down());
    const { fetchChangelogFromBackend } =
      await import("@/features/changelog/services/changelog-backend");
    const { fetchRoadmapFromBackend } = await import("@/features/roadmap/services/roadmap-backend");

    await fetchChangelogFromBackend({}, 1);
    await fetchRoadmapFromBackend({ status: "todo" });

    expect(log.mock.calls).toEqual([
      ["Failed to fetch changelog from backend: 503 down"],
      ['Roadmap column "todo" failed to load: 503 down'],
    ]);
  });

  it("the release index walks the API's largest page", async () => {
    const fetchMock = envelope({ items: [], total: 0 });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchChangelogIndex } = await import("@/features/changelog/services/changelog-backend");

    await fetchChangelogIndex();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("limit=50");
  });

  it("search is cut to the API's 120 characters and far pages 404 before any backend call", () => {
    const changelog = source("app/(marketing)/changelog/page.tsx");
    expect(changelog).toContain(".slice(0, CHANGELOG_SEARCH_MAX_LENGTH)");
    expect(changelog).toMatch(
      /if \(page > CHANGELOG_MAX_PAGE\) notFound\(\);\s+const data = await fetchChangelogFromBackend/,
    );

    const stats = source("app/(marketing)/stats/page.tsx");
    expect(stats).toMatch(
      /if \(page > MAX_PAGE\) notFound\(\);[\s\S]*fetchGitHubIssuesFromBackend/,
    );
    expect(stats).toContain(
      "if (issuePage && issuePage.total > 0 && page > totalPages) notFound();",
    );
  });
});

describe("backend URLs in release and roadmap data", () => {
  it("only http(s) URLs survive parsing", async () => {
    const { normalizeEntry } = await import("@/features/changelog/services/changelog-backend");

    const entry = normalizeEntry({
      id: "v1",
      version: "1",
      title: "t",
      summary: null,
      type: "patch",
      publishedAt: "2026-01-01T00:00:00Z",
      githubUrl: "javascript:alert(1)",
      added: [],
      improved: [],
      fixed: [],
      breaking: [],
      security: [],
      tags: [],
      prRefs: [
        {
          number: 1,
          title: "x",
          url: "javascript:alert(1)",
          author: { login: "a", avatarUrl: "data:x", htmlUrl: "https://github.com/a" },
        },
      ],
    });

    expect(entry.githubUrl).toBeNull();
    expect(entry.prRefs?.[0]?.url).toBeUndefined();
    expect(entry.prRefs?.[0]?.author).toBeNull();
  });
});

describe("roadmap detail sidebar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a failed suggested list is flagged and retried with a one-minute window", async () => {
    const fetchMock = vi.fn<Fetch>(async () =>
      Response.json({ success: false, message: "busy" }, { status: 429 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchSuggestedRoadmapItems } =
      await import("@/features/roadmap/services/roadmap-backend");

    const feature = { id: "x", status: "todo" } as Parameters<typeof fetchSuggestedRoadmapItems>[0];
    expect(await fetchSuggestedRoadmapItems(feature, 60)).toEqual({ items: [], failed: true });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ next: { revalidate: 60 } });

    expect(source("app/(marketing)/roadmap/[id]/page.tsx")).toContain(
      "if (suggested.failed) suggested = await fetchSuggestedRoadmapItems(feature, 60);",
    );
  });
});

describe("unknown release and roadmap ids", () => {
  it("their 404 renders stay in memory; real pages still go to disk", async () => {
    const SiteCacheHandler = (await import("@/cache-handler.mjs")).default as unknown as new (
      ctx: object,
    ) => { set(key: string, data: object, ctx: object): Promise<void> };
    const writes: string[] = [];
    const fs = {
      existsSync: () => false,
      readFile: async () => {
        throw new Error("none");
      },
      readFileSync: () => {
        throw new Error("none");
      },
      stat: async () => ({ mtime: new Date() }),
      mkdir: async () => undefined,
      writeFile: async (path: string) => void writes.push(path),
    };
    const cache = new SiteCacheHandler({
      fs,
      dev: false,
      flushToDisk: true,
      serverDistDir: "/dist/server",
      revalidatedTags: [],
      _requestHeaders: {},
    });
    const page = (status: number) => ({
      kind: "APP_PAGE",
      html: "<p>x</p>",
      rscData: Buffer.from("x"),
      headers: {},
      status,
    });
    const ctx = { cacheControl: { revalidate: 60, expire: undefined }, isRoutePPREnabled: false };

    await cache.set("/roadmap/unknown", page(404), ctx);
    expect(writes).toEqual([]);

    await cache.set("/roadmap/real", page(200), ctx);
    expect(writes.some((path) => path.includes("real"))).toBe(true);
  });

  it("next.config.ts installs the handler", () => {
    expect(source("next.config.ts")).toContain(
      'cacheHandler: join(__dirname, "cache-handler.mjs")',
    );
  });
});

describe("image optimizer", () => {
  it("accepts the avatar URLs the API sends and nothing looser", async () => {
    const { default: config } = await import("@/next.config");
    const { matchRemotePattern } = require("next/dist/shared/lib/match-remote-pattern");
    const allowed = (href: string) =>
      config.images!.remotePatterns!.some((pattern) => matchRemotePattern(pattern, new URL(href)));

    expect(allowed("https://avatars.githubusercontent.com/u/63155224?v=4")).toBe(true);
    expect(allowed("https://avatars.githubusercontent.com/in/29110?v=4")).toBe(true);
    expect(allowed("https://github.com/Gautam25Raj.png")).toBe(true);

    expect(allowed("https://avatars.githubusercontent.com/u/1?v=4&x=1")).toBe(false);
    expect(allowed("https://avatars.githubusercontent.com/u/1")).toBe(false);
    expect(allowed("https://avatars.githubusercontent.com:8443/u/1?v=4")).toBe(false);
    expect(allowed("https://avatars.githubusercontent.com/x/y/z?v=4")).toBe(false);
    expect(allowed("https://github.com/a.png?x=1")).toBe(false);

    expect(config.images!.maximumDiskCacheSize).toBeGreaterThan(0);
  });
});
