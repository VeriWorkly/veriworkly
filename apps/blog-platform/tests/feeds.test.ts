import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { blog } from "@/lib/source";
import { buildAtomFeed, buildRssFeed, getFeedEntries, type FeedEntry } from "@/lib/feed";

import robots from "@/app/robots";
import { GET as rssRoute } from "@/app/rss.xml/route";
import { GET as atomRoute } from "@/app/atom.xml/route";
import { GET as ogRedirect } from "@/app/api/og/route";

/** Strict parse: any well-formedness warning or error fails the test. */
function parseXml(xml: string) {
  const problems: string[] = [];
  const document = new DOMParser({
    errorHandler: {
      warning: (message) => problems.push(`warning: ${message}`),
      error: (message) => problems.push(`error: ${message}`),
      fatalError: (message) => problems.push(`fatal: ${message}`),
    },
  }).parseFromString(xml, "text/xml");

  expect(problems).toEqual([]);
  // xmldom accepts a bare "&" without complaint; XML does not.
  expect(xml.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)[^\s]{0,20}/gi) ?? []).toEqual(
    [],
  );

  return document;
}

const texts = (document: Document, tag: string) =>
  Array.from(document.getElementsByTagName(tag)).map((node) => node.textContent ?? "");

const posts = blog.getPages();

describe("the RSS feed", () => {
  it("parses, lists every post once and is newest first", async () => {
    const response = rssRoute();
    expect(response.headers.get("Content-Type")).toMatch(/application\/rss\+xml/);

    const document = parseXml(await response.text());
    const items = Array.from(document.getElementsByTagName("item"));

    expect(items).toHaveLength(posts.length);
    expect(texts(document, "guid").sort()).toEqual(
      posts.map((post) => `${siteConfig.url}${post.url}`).sort(),
    );

    const dates = items.map((item) =>
      Date.parse(item.getElementsByTagName("pubDate")[0]!.textContent ?? ""),
    );
    expect(dates.every(Number.isFinite)).toBe(true);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));

    for (const item of items)
      for (const tag of ["title", "link", "description", "pubDate"])
        expect(item.getElementsByTagName(tag)[0]?.textContent, tag).toBeTruthy();
  });
});

describe("the Atom feed", () => {
  it("parses, lists every post once and is newest first", async () => {
    const response = atomRoute();
    expect(response.headers.get("Content-Type")).toMatch(/application\/atom\+xml/);

    const document = parseXml(await response.text());
    const entries = Array.from(document.getElementsByTagName("entry"));

    expect(entries).toHaveLength(posts.length);

    const published = entries.map((entry) =>
      Date.parse(entry.getElementsByTagName("published")[0]!.textContent ?? ""),
    );
    expect(published.every(Number.isFinite)).toBe(true);
    expect(published).toEqual([...published].sort((a, b) => b - a));

    for (const entry of entries)
      for (const tag of ["title", "id", "updated", "summary"])
        expect(entry.getElementsByTagName(tag)[0]?.textContent, tag).toBeTruthy();
  });
});

describe("feed escaping", () => {
  const hostile: FeedEntry = {
    url: `${siteConfig.url}/a?b=1&c=2`,
    title: `Tom & Jerry's <script>"quoted"</script>`,
    description: "1 < 2 & 3 > 2",
    author: "A & B",
    category: "Q&A",
    published: new Date("2026-01-02T00:00:00Z"),
    updated: new Date("2026-01-03T00:00:00Z"),
    tags: ["<tag>"],
  };

  it("round-trips titles and text with XML specials in both formats", () => {
    for (const xml of [buildRssFeed([hostile]), buildAtomFeed([hostile])]) {
      const document = parseXml(xml);

      expect(texts(document, "title")).toContain(hostile.title);
      expect(xml).not.toContain("<script>");
    }
  });

  it("orders entries by publication date, newest first", () => {
    const entries = getFeedEntries();

    for (let index = 1; index < entries.length; index++)
      expect(entries[index - 1]!.published.getTime()).toBeGreaterThanOrEqual(
        entries[index]!.published.getTime(),
      );
  });
});

describe("robots.txt", () => {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];

  it("never disallows /_next/, which holds the CSS and JS crawlers render with", () => {
    for (const rule of list) {
      const disallow = [rule.disallow ?? []].flat();

      expect(disallow.some((path) => "/_next/static/x.js".startsWith(path) && path !== "")).toBe(
        false,
      );
    }
  });

  it("points at the sitemap", () => {
    expect(robots().sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });
});

describe("the legacy /api/og route", () => {
  it("never renders the text it is handed: an unknown 10k-character title gets the default card", () => {
    const response = ogRedirect(
      new Request(`${siteConfig.url}/api/og?title=${encodeURIComponent("x".repeat(10_000))}`),
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(`${siteConfig.url}/og/blog-page-og.png`);
  });

  it("sends a post's own title to that post's card", () => {
    const post = posts[0]!;
    const response = ogRedirect(
      new Request(`${siteConfig.url}/api/og?title=${encodeURIComponent(post.data.title)}`),
    );

    expect(response.headers.get("Location")).toBe(
      `${siteConfig.url}/og/${post.slugs[0]}/image.png`,
    );
  });
});
