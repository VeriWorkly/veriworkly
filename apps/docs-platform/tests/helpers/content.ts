import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { loader, type MetaData, type Source } from "fumadocs-core/source";

import { buildLlmsIndex, readOpenApiSpec, sectionsInSidebarOrder, type LlmsPage } from "@/lib/llms";

export const appRoot = path.join(__dirname, "..", "..");
export const repoRoot = path.join(appRoot, "..", "..");

export const TREES = {
  docs: { dir: "content/docs", baseUrl: "/docs" },
  api: { dir: "content/api-reference", baseUrl: "/api-reference" },
  engine: { dir: "content/ats-engine", baseUrl: "/ats-engine" },
} as const;

export type TreeName = keyof typeof TREES;

export function walk(dir: string, pattern: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

export const rel = (file: string) => path.relative(appRoot, file).replace(/\\/g, "/");

export function frontmatter(file: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(file, "utf8"));
  return match ? (parse(match[1]!) ?? {}) : {};
}

export type DiskPage = LlmsPage & {
  slugs: string[];
  path: string;
  absolutePath: string;
  data: LlmsPage["data"] & { metaTitle?: string; lastModified?: Date };
};

/**
 * The same `loader` the app runs, fed from the files on disk instead of the compiled MDX
 * collections (which need the fumadocs-mdx bundler plugin), so URLs and sidebar order match.
 */
export function diskLoader(tree: TreeName) {
  const { dir, baseUrl } = TREES[tree];
  const root = path.join(appRoot, dir);

  const files = walk(root, /\.(mdx?|json)$/).map((file) => {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    return file.endsWith(".json")
      ? { type: "meta" as const, path: relative, data: JSON.parse(fs.readFileSync(file, "utf8")) }
      : {
          type: "page" as const,
          path: relative,
          absolutePath: file,
          data: { ...frontmatter(file), lastModified: new Date(0) },
        };
  });

  return loader({
    baseUrl,
    source: { files } as unknown as Source<{ pageData: DiskPage["data"]; metaData: MetaData }>,
  });
}

export function diskPages(tree: TreeName): DiskPage[] {
  return diskLoader(tree)
    .getPages()
    .map((page) => page as unknown as DiskPage);
}

/** What `/llms.txt` serves, built by the route's own function from the disk loaders. */
export function llmsIndexText(siteUrl = "https://docs.veriworkly.com") {
  const section = (tree: TreeName) => {
    const source = diskLoader(tree);
    return sectionsInSidebarOrder(
      source.getPageTree() as Parameters<typeof sectionsInSidebarOrder>[0],
      source.getPages() as unknown as LlmsPage[],
    );
  };

  return buildLlmsIndex({
    siteUrl,
    spec: readOpenApiSpec(appRoot),
    docs: section("docs"),
    engine: section("engine"),
    api: section("api"),
    apiPages: diskLoader("api").getPages() as unknown as LlmsPage[],
  });
}

/** Server source text. Importing the services would pull in config and Prisma. */
export function serverSource(relative: string) {
  return fs.readFileSync(path.join(repoRoot, "apps", "server", "src", relative), "utf8");
}

/** The capture groups of an anchored regex over server source. */
export function serverMatch(source: string, pattern: RegExp, label: string): string[] {
  const match = pattern.exec(source);
  if (!match) {
    throw new Error(
      `${label} was not found in the server source with ${pattern}; the code changed, update the regex in this test.`,
    );
  }
  return match.slice(1);
}

export function serverNumbers(source: string, pattern: RegExp, label: string): number[] {
  return serverMatch(source, pattern, label).map((value) => Number(value.replace(/[_,]/g, "")));
}
