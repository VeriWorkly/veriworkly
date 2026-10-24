import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every root-relative link the site renders must land on a page, a public file, or a
 * redirect that exists. The Search Console 404 report of 2026-10-15 was eight footer
 * links to pages that never existed (W-003); this keeps that list from growing back.
 */

const root = join(__dirname, "..", "..");

function walk(dir: string, exts: string[], skip = ["node_modules", ".next", "audit", "tests"]) {
  const out: string[] = [];

  for (const name of readdirSync(dir)) {
    if (skip.includes(name)) continue;

    const full = join(dir, name);

    if (statSync(full).isDirectory()) out.push(...walk(full, exts, skip));
    else if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }

  return out;
}

const appDir = join(root, "app");

const routePatterns = walk(appDir, ["page.tsx", "route.ts"]).map((file) =>
  relative(appDir, dirname(file))
    .split(sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
    .join("/"),
);

/** Metadata routes: app/sitemap.ts serves /sitemap.xml, app/robots.ts /robots.txt. */
for (const [file, route] of [
  ["sitemap.ts", "sitemap.xml"],
  ["robots.ts", "robots.txt"],
] as const)
  if (existsSync(join(appDir, file))) routePatterns.push(route);

function matchesRoute(path: string) {
  const segments = path.split("/").filter(Boolean);

  return routePatterns.some((pattern) => {
    const parts = pattern.split("/").filter(Boolean);

    if (parts.length !== segments.length) return false;

    return parts.every((part, index) => part.startsWith("[") || part === segments[index]);
  });
}

const isPublicFile = (path: string) => existsSync(join(root, "public", path));

async function loadRedirects() {
  const { default: config } = await import("@/next.config");
  const redirects = await config.redirects!();

  return redirects.filter((redirect) => !redirect.source.includes(":"));
}

const HREF = /\bhref(?:=|:)\s*["'](\/[^"'#?\s]*)/g;

const links = walk(root, [".ts", ".tsx"])
  .filter((file) => !/[\\/](scripts|audit|tests)[\\/]/.test(file))
  .flatMap((file) => {
    const source = readFileSync(file, "utf8");

    return [...source.matchAll(HREF)].map((match) => ({
      path: match[1].replace(/\/+$/, "") || "/",
      file: relative(root, file),
    }));
  });

/** Paths the Search Console 404 report listed for veriworkly.com (2026-10-15). */
const KNOWN_INBOUND_404S = [
  "/blog",
  "/docs",
  "/dashboard",
  "/support",
  "/integrations",
  "/careers",
  "/cookies",
  "/partners",
  "/tutorials",
  "/Free",
];

describe("internal links", () => {
  it("finds the routes and the links it is about to check", () => {
    expect(routePatterns).toContain("");
    expect(routePatterns).toContain("changelog/[id]");
    expect(links.length).toBeGreaterThan(50);
  });

  it("every static root-relative href is a page or a public file", () => {
    const broken = links.filter(({ path }) => !matchesRoute(path) && !isPublicFile(path));

    expect(
      broken.map(({ path, file }) => `${path} (${file})`),
      "links must point at the final page, not at a path that 404s or redirects",
    ).toEqual([]);
  });
});

describe("redirects", () => {
  it("cover every path the Search Console 404 report listed", async () => {
    const sources = (await loadRedirects()).map((redirect) => redirect.source);

    for (const path of KNOWN_INBOUND_404S) expect(sources, path).toContain(path);
  });

  it("send every static source to an external URL or an existing page", async () => {
    for (const redirect of await loadRedirects()) {
      const destination = redirect.destination;

      if (/^https?:\/\//.test(destination)) continue;

      const path = destination.replace(/[#?].*$/, "");

      expect(
        matchesRoute(path) || isPublicFile(path),
        `${redirect.source} -> ${destination} does not resolve`,
      ).toBe(true);
    }
  });
});

describe("llms.txt", () => {
  const llms = readFileSync(join(root, "public", "llms.txt"), "utf8");

  it("uses llmstxt.org markdown links, not backticked URLs (W-018)", () => {
    expect(llms).toMatch(/^# VeriWorkly\r?\n\r?\n> /);
    expect(llms).not.toMatch(/`https?:\/\//);
    expect([...llms.matchAll(/\]\(https:\/\//g)].length).toBeGreaterThan(40);
  });

  it("links only to pages and files that exist on veriworkly.com", () => {
    const paths = [...llms.matchAll(/\]\(https:\/\/veriworkly\.com(\/[^)#?]*)?\)/g)].map(
      (m) => (m[1] ?? "/").replace(/\/+$/, "") || "/",
    );

    const broken = paths.filter((path) => !matchesRoute(path) && !isPublicFile(path));

    expect(paths.length).toBeGreaterThan(30);
    expect(broken).toEqual([]);
  });
});
