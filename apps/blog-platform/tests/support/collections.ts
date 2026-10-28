import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";

import { blogFrontmatterSchema } from "@/lib/blog-frontmatter";

/**
 * Stands in for the fumadocs-mdx generated `collections/server`, which imports compiled MDX that
 * plain Node cannot load. Entries have the shape `create.doc()` produces, so `lib/source.ts` runs
 * its real loader over them and URLs and slugs come from fumadocs, not from this file.
 */

export const appRoot = join(__dirname, "..", "..");
export const blogDir = join(appRoot, "content", "blog");

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

export type PostSource = {
  file: string;
  slug: string;
  raw: string;
  frontmatter: string;
  body: string;
};

export function readPostSources(): PostSource[] {
  return readdirSync(blogDir)
    .filter((file) => file.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const raw = readFileSync(join(blogDir, file), "utf8");
      const match = FRONTMATTER.exec(raw);

      if (!match) throw new Error(`${file} has no frontmatter block`);

      return {
        file,
        slug: file.replace(/\.mdx$/, ""),
        raw,
        frontmatter: match[1]!,
        body: raw.slice(match[0].length),
      };
    });
}

export const blogPosts = readPostSources().map((post) => {
  const fullPath = join(blogDir, post.file);

  return {
    ...blogFrontmatterSchema.parse(parse(post.frontmatter)),
    info: { path: post.file, fullPath },
    body: () => null,
    toc: [],
    structuredData: { headings: [], contents: [] },
    _exports: {},
    getText: async () => post.raw,
    getMDAST: async () => ({}),
  };
});
