import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

/**
 * The server validates list queries with zod objects that strip unknown keys. A key the site
 * sends that the schema lacks is silently dropped, and the site renders unfiltered data as if
 * it were filtered: the /stats date filters did exactly that (W-045). This runs each site
 * fetcher with every option set, captures the query it sends, and checks each key against the
 * server's schema source.
 */

const serverSrc = join(__dirname, "..", "..", "..", "server", "src");

function schemaKeys(file: string, schema: string) {
  const source = readFileSync(join(serverSrc, file), "utf8");
  const body = new RegExp(`${schema} = z\\.object\\(\\{([\\s\\S]*?)\\n\\}\\)`).exec(source)?.[1];

  expect(body, `${schema} not found in ${file}`).toBeTruthy();

  return new Set([...body!.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]!));
}

function captureQueries() {
  const queries: URLSearchParams[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      queries.push(new URL(String(input)).searchParams);
      return Response.json({ success: false, message: "stub" }, { status: 503 });
    }),
  );

  return queries;
}

describe("site fetchers send only keys the server accepts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("GET /github/issues", () => {
    // The fetcher forwards every key of its query object, so its declared keys are what it sends.
    const accepted = schemaKeys("controllers/githubController.ts", "githubQuerySchema");
    const source = readFileSync(
      join(__dirname, "..", "..", "features", "github", "services", "github-backend.ts"),
      "utf8",
    );
    const declared = /fetchGitHubIssuesFromBackend\(query: \{([\s\S]*?)\}\)/.exec(source)?.[1];

    expect(declared).toBeTruthy();

    for (const [, key] of declared!.matchAll(/^\s*(\w+)\?:/gm))
      expect(accepted, key).toContain(key);
  });

  it("GET /changelog", async () => {
    const accepted = schemaKeys("validators/changelogValidator.ts", "changelogQuerySchema");
    const queries = captureQueries();
    const { fetchChangelogFromBackend } =
      await import("@/features/changelog/services/changelog-backend");

    vi.spyOn(console, "error").mockImplementation(() => {});
    await fetchChangelogFromBackend({ type: "minor", tag: "ats", search: "engine" }, 2);

    const list = queries.find((q) => q.has("limit"))!;
    for (const key of list.keys()) expect(accepted, key).toContain(key);
  });

  it("GET /roadmap", async () => {
    const accepted = schemaKeys("validators/roadmapValidator.ts", "roadmapQuerySchema");
    const queries = captureQueries();
    const { fetchRoadmapFromBackend } = await import("@/features/roadmap/services/roadmap-backend");

    vi.spyOn(console, "error").mockImplementation(() => {});
    await fetchRoadmapFromBackend({ status: "done", sort: "oldest" });

    for (const key of queries[0]!.keys()) expect(accepted, key).toContain(key);
  });
});
