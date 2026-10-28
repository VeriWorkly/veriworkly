import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { appRoot, diskLoader, diskPages, type TreeName } from "./helpers/content";

/** The app-level checks from section E of the docs register. */

vi.mock("@/lib/source", async () => {
  const { diskLoader: load } = await import("./helpers/content");
  return { source: load("docs"), apiSource: load("api"), engineSource: load("engine") };
});
vi.mock("@/lib/og-card", () => ({
  renderOgCard: ({ title }: { title: string }) => new Response(title, { status: 200 }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the playground proxy (D-002)", () => {
  type Seen = { url: string; headers: Headers };

  async function call(target: string, init: RequestInit = {}) {
    const seen: Seen[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, options);
        seen.push({ url: request.url, headers: new Headers(options?.headers ?? request.headers) });
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    const { GET } = await import("@/app/api/proxy/route");
    const response = await GET(
      new Request(`https://docs.veriworkly.com/api/proxy?url=${encodeURIComponent(target)}`, init),
    );
    return { response, seen };
  }

  it("does not forward the visitor's cookies to the API", async () => {
    const { response, seen } = await call("https://api.veriworkly.com/api/v1/users/me", {
      headers: { cookie: "__Secure-veriworkly-auth.session_token=visitor-session" },
    });

    expect(response.status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe("https://api.veriworkly.com/api/v1/users/me");
    expect(seen[0]!.headers.get("cookie")).toBeNull();
  });

  it("refuses an origin outside the allow-list", async () => {
    const { response, seen } = await call("https://evil.example.com/api/v1/users/me");

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(seen).toHaveLength(0);
  });

  it("refuses a path outside the public API", async () => {
    const { response, seen } = await call("https://api.veriworkly.com/api/v1-internal/admin");

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(seen).toHaveLength(0);
  });
});

describe("the social card routes", () => {
  const ROUTES: { route: string; tree: TreeName }[] = [
    { route: "docs", tree: "docs" },
    { route: "api", tree: "api" },
    { route: "ats-engine", tree: "engine" },
  ];

  type OgRoute = {
    GET: (request: Request, context: { params: Promise<{ slug: string[] }> }) => Promise<Response>;
    generateStaticParams: () => { slug: string[] }[];
  };

  describe.each(ROUTES)("/og/$route", ({ route, tree }) => {
    const load = () => import(`../app/og/${route}/[...slug]/route.tsx`) as Promise<OgRoute>;
    const get = async (slug: string[]) => {
      const { GET } = await load();
      return GET(new Request("https://docs.veriworkly.com/"), {
        params: Promise.resolve({ slug }),
      });
    };
    const page = diskPages(tree).find((p) => p.slugs.length > 0)!;

    it("serves a page's card at image.png", async () => {
      expect((await get([...page.slugs, "image.png"])).status).toBe(200);
    });

    it("is 404 for any other suffix and for an unknown page", async () => {
      expect((await get([...page.slugs, "image.jpg"])).status).toBe(404);
      expect((await get(page.slugs)).status).toBe(404);
      expect((await get(["no-such-page", "image.png"])).status).toBe(404);
    });

    it("prerenders one card per page", async () => {
      const { generateStaticParams } = await load();
      expect(generateStaticParams()).toHaveLength(diskLoader(tree).getPages().length);
    });
  });
});

describe("Edit on GitHub links", () => {
  const prefix = "https://github.com/VeriWorkly/veriworkly/edit/master/apps/docs-platform/";
  const local = (href: string) => {
    expect(href.startsWith(prefix), href).toBe(true);
    return path.join(appRoot, href.slice(prefix.length));
  };

  it("every docs and ATS Engine page links to its own file", async () => {
    const { contentEditUrl } = await import("@/lib/edit-links");
    const generated = new Set(
      [
        ...fs
          .readFileSync(path.join(appRoot, "app/ats-engine/[[...slug]]/page.tsx"), "utf8")
          .matchAll(/^\s+"([\w/-]+\.mdx?)",$/gm),
      ].map((m) => m[1]!),
    );
    expect(generated.size).toBeGreaterThan(3);

    const missing = [
      ...diskPages("docs").map((page) => local(contentEditUrl("docs", page.path))),
      ...diskPages("engine")
        .filter((page) => !generated.has(page.path))
        .map((page) => local(contentEditUrl("ats-engine", page.path))),
    ].filter((file) => !fs.existsSync(file));

    expect(missing).toEqual([]);
    for (const file of generated)
      expect(fs.existsSync(path.join(appRoot, "content", "ats-engine", file)), file).toBe(true);
  });

  it("every operation page links to the spec file that defines it, and overviews to themselves", async () => {
    const { apiEditUrl } = await import("@/lib/edit-links");
    const problems: string[] = [];

    for (const page of diskPages("api")) {
      const href = apiEditUrl(page.path);
      const file = local(href);
      if (!fs.existsSync(file)) problems.push(`${page.url}: ${href}`);
      else if (page.data._openapi) {
        const operationId = page.slugs.at(-1)!;
        if (!href.includes("/specs/paths/")) problems.push(`${page.url}: not a spec file`);
        else if (!fs.readFileSync(file, "utf8").includes(`operationId: ${operationId}`))
          problems.push(`${page.url}: ${href} does not define ${operationId}`);
      }
    }

    expect(problems).toEqual([]);
  });
});

describe("folder redirects", () => {
  it("every folder without a page of its own redirects to a page that exists", async () => {
    const { folderRedirects } = await import("@/folder-redirects");
    const urls = new Set(
      (["docs", "api", "engine"] as const).flatMap((tree) =>
        diskLoader(tree)
          .getPages()
          .map((page) => page.url),
      ),
    );
    const redirects = folderRedirects();

    expect(redirects.length).toBeGreaterThan(5);
    expect(redirects.filter((r) => !urls.has(r.destination))).toEqual([]);
    expect(redirects.filter((r) => urls.has(r.source))).toEqual([]);
  });

  it("every section folder either has a page or a redirect", async () => {
    const { folderRedirects } = await import("@/folder-redirects");
    const sources = new Set(folderRedirects().map((r) => r.source));
    const urls = new Set(
      (["docs", "api", "engine"] as const).flatMap((tree) =>
        diskLoader(tree)
          .getPages()
          .map((page) => page.url),
      ),
    );
    const folders = new Set(
      [...urls].flatMap((url: string) =>
        url
          .split("/")
          .slice(2, -1)
          .map(
            (_: string, i: number, parts: string[]) =>
              `/${url.split("/")[1]}/${parts.slice(0, i + 1).join("/")}`,
          ),
      ),
    );

    expect([...folders].filter((folder) => !urls.has(folder) && !sources.has(folder))).toEqual([]);
  });
});
