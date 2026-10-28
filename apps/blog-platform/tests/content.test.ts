import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { getAuthor } from "@/lib/authors";
import { getPostStats } from "@/lib/read-time";
import { getRelatedPosts } from "@/lib/related";
import { blog } from "@/lib/source";
import { buildLlmsFull, buildLlmsIndex } from "@/lib/llms";

import { appRoot, readPostSources } from "./support/collections";

const sources = readPostSources();
const posts = blog.getPages();

/** Body text with fenced code removed, so a `# comment` in a code sample is not a heading. */
const prose = (body: string) => body.replace(/^(```|~~~)[\s\S]*?^\1/gm, "");

describe("the frontmatter contract", () => {
  const today = new Date();

  it("every post file is in the collection", () => {
    expect(posts).toHaveLength(sources.length);
    expect(sources.length).toBeGreaterThan(10);
  });

  for (const post of posts) {
    describe(post.url, () => {
      const { date, updated, author } = post.data;

      it("is dated no later than today, and updated no earlier than published", () => {
        expect(new Date(date).getTime()).toBeLessThanOrEqual(today.getTime());

        if (updated) {
          expect(new Date(updated).getTime()).toBeLessThanOrEqual(today.getTime());
          expect(new Date(updated).getTime()).toBeGreaterThanOrEqual(new Date(date).getTime());
        }
      });

      it("has a registered author", () => {
        expect(() => getAuthor(author)).not.toThrow();
      });

      it("has no H1 in its body: the page renders the title as the one H1", () => {
        const source = sources.find((item) => item.file === post.data.info.path)!;

        expect(prose(source.body)).not.toMatch(/^#\s/m);
      });
    });
  }
});

describe("internal linking", () => {
  /** Blog paths a post's body links to, relative or absolute. */
  function linkedPaths(body: string): Set<string> {
    const origin = siteConfig.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `\\]\\((?:${origin}|https://blog\\.veriworkly\\.com)?(/[a-z0-9-]+)(?:[#?][^)]*)?\\)`,
      "g",
    );

    return new Set([...prose(body).matchAll(pattern)].map((match) => match[1]!));
  }

  it("every post has at least one inbound link from another post's body or related footer", () => {
    const inbound = new Map(posts.map((post) => [post.url, 0]));

    for (const post of posts) {
      const source = sources.find((item) => item.file === post.data.info.path)!;
      const targets = new Set([
        ...linkedPaths(source.body),
        ...getRelatedPosts({ url: post.url, cluster: post.data.cluster, tags: post.data.tags }).map(
          (related) => related.url,
        ),
      ]);

      targets.delete(post.url);
      for (const target of targets)
        if (inbound.has(target)) inbound.set(target, inbound.get(target)! + 1);
    }

    const orphans = [...inbound].filter(([, count]) => count === 0).map(([url]) => url);

    expect(orphans).toEqual([]);
  });

  it("every internal body link points at a post that exists", () => {
    const urls = new Set([...posts.map((post) => post.url), "/archive"]);
    const broken = sources.flatMap((source) =>
      [...linkedPaths(source.body)]
        .filter((path) => !urls.has(path))
        .map((path) => `${source.file} -> ${path}`),
    );

    expect(broken).toEqual([]);
  });
});

describe("reading time", () => {
  it("counts the body of a real post", () => {
    const stats = getPostStats(posts[0]!.data.info.path);

    expect(stats.words).toBeGreaterThan(100);
    expect(stats.label).toBe(`${stats.minutes} min read`);
  });

  it("throws on a missing file instead of rendering a made-up figure", () => {
    expect(() => getPostStats("does-not-exist.mdx")).toThrow();
  });
});

describe("the generated llms files", () => {
  const index = buildLlmsIndex();
  const blogLinks = [...index.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)]
    .map((match) => match[1]!)
    .filter((url) => url.startsWith(siteConfig.url));

  it("llms.txt lists every post once, with its description, and nothing else", () => {
    expect(blogLinks.sort()).toEqual(posts.map((post) => `${siteConfig.url}${post.url}`).sort());

    for (const post of posts) expect(index).toContain(post.data.description);
  });

  it("llms.txt groups posts under their category and links the feeds and the full text", () => {
    for (const post of posts) {
      const heading = index.indexOf(`### ${post.data.category}`);
      expect(heading, `no section for ${post.data.category}`).toBeGreaterThan(-1);
    }

    for (const path of ["/rss.xml", "/atom.xml", "/llms-full.txt"])
      expect(index).toContain(`${siteConfig.url}${path}`);
  });

  it("llms-full.txt carries every post's body without its frontmatter", async () => {
    const full = await buildLlmsFull();

    for (const source of sources) {
      const firstParagraph = prose(source.body).trim().split(/\r?\n/)[0]!;

      expect(full).toContain(firstParagraph);
    }

    expect(full).not.toMatch(/^primaryKeyword:/m);
  });

  it("are served by static routes, with no public file shadowing them", () => {
    expect(existsSync(join(appRoot, "public", "llms.txt"))).toBe(false);
    expect(existsSync(join(appRoot, "public", "llms-full.txt"))).toBe(false);

    for (const route of ["llms.txt", "llms-full.txt"])
      expect(readFileSync(join(appRoot, "app", route, "route.ts"), "utf8")).toContain(
        'export const dynamic = "force-static"',
      );
  });
});
