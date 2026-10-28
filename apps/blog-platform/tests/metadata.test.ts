import type { Metadata } from "next";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { blog } from "@/lib/source";
import { siteConfig, titleTemplate } from "@/config/site";

import sitemap from "@/app/sitemap";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as archiveMetadata } from "@/app/archive/page";
import { generateMetadata, generateStaticParams } from "@/app/[slug]/page";

import { appRoot } from "./support/collections";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

/** The `<title>` Next renders: a string under the root layout gets the template; `absolute` does not. */
function renderedTitle(title: Metadata["title"], inRootSegment = false): string {
  if (typeof title === "string") return inRootSegment ? title : titleTemplate.replace("%s", title);
  if (title && typeof title === "object" && "absolute" in title) return title.absolute;

  throw new Error(`unexpected title shape: ${JSON.stringify(title)}`);
}

const robotsText = (metadata: Metadata) => JSON.stringify(metadata.robots ?? "");

type Page = { path: string; metadata: Metadata; inRootSegment?: boolean };

const pages: Page[] = [
  { path: "", metadata: homeMetadata, inRootSegment: true },
  { path: "/archive", metadata: archiveMetadata },
  ...(await Promise.all(
    blog.getPages().map(async (post) => ({
      path: post.url,
      metadata: await generateMetadata({ params: Promise.resolve({ slug: post.slugs[0]! }) }),
    })),
  )),
];

describe("every page's metadata", () => {
  it("covers every post", () => {
    expect(pages.length).toBe(blog.getPages().length + 2);
    expect(
      generateStaticParams()
        .map((params) => `/${params.slug}`)
        .sort(),
    ).toEqual(
      blog
        .getPages()
        .map((post) => post.url)
        .sort(),
    );
  });

  for (const page of pages) {
    describe(page.path || "/", () => {
      it("is canonical to its own URL", () => {
        expect(page.metadata.alternates?.canonical).toBe(`${siteConfig.url}${page.path}`);
      });

      it(`renders a title of at most ${TITLE_LIMIT} characters`, () => {
        const title = renderedTitle(page.metadata.title, page.inRootSegment);

        expect(title.length, `"${title}" is ${title.length} characters`).toBeLessThanOrEqual(
          TITLE_LIMIT,
        );
      });

      it(`has a description of at most ${DESCRIPTION_LIMIT} characters`, () => {
        const description = page.metadata.description ?? "";

        expect(description.length).toBeGreaterThan(50);
        expect(
          description.length,
          `${description.length} characters: ${description}`,
        ).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
      });

      it("is not noindex", () => {
        expect(robotsText(page.metadata)).not.toMatch(/noindex|"index":false/);
      });

      it("keeps the feed links its alternates would otherwise drop", () => {
        expect(Object.keys(page.metadata.alternates?.types ?? {})).toEqual([
          "application/rss+xml",
          "application/atom+xml",
        ]);
      });
    });
  }

  it("the root layout sets no noindex and declares the title template", () => {
    expect(robotsText(rootMetadata)).not.toMatch(/noindex|"index":false/);
    expect(rootMetadata.title).toMatchObject({ template: titleTemplate });
  });

  it("posts are articles with ISO times and same-origin share images", () => {
    for (const page of pages.slice(2)) {
      const og = page.metadata.openGraph as Record<string, unknown>;
      const image = (og.images as { url: string }[])[0]!.url;

      expect(og.type).toBe("article");
      expect(og.publishedTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(og.modifiedTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(image).toBe(`${siteConfig.url}/og${page.path}/image.png`);
    }
  });
});

describe("the sitemap", () => {
  const entries = sitemap();
  const expected = [
    siteConfig.url,
    `${siteConfig.url}/archive`,
    ...blog.getPages().map((post) => `${siteConfig.url}${post.url}`),
  ];

  it("lists exactly the home page, the archive and every post", () => {
    expect(entries.map((entry) => entry.url).sort()).toEqual([...expected].sort());
  });

  it("gives every URL a real lastModified", () => {
    for (const entry of entries) {
      expect(entry.lastModified, entry.url).toBeInstanceOf(Date);
      expect((entry.lastModified as Date).getTime(), entry.url).toBeGreaterThan(0);
    }

    for (const post of blog.getPages()) {
      const entry = entries.find((item) => item.url === `${siteConfig.url}${post.url}`)!;

      expect(entry.lastModified).toEqual(new Date(post.data.updated ?? post.data.date));
    }
  });

  it("lists no redirect source", () => {
    const config = readFileSync(join(appRoot, "next.config.ts"), "utf8");
    const sources = [...config.matchAll(/source: "(\/[^"]*)",\s*destination/g)].map((m) => m[1]!);

    expect(
      sources.length,
      "no redirects parsed from next.config.ts; update the regex",
    ).toBeGreaterThan(0);

    for (const source of sources) expect(expected).not.toContain(`${siteConfig.url}${source}`);
  });
});
