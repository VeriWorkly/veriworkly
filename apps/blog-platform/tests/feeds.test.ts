import { DOMParser } from "@xmldom/xmldom";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { blog } from "@/lib/source";
import {
  buildAtomFeed,
  buildRssFeed,
  getFeedEntries,
  postMarkdown,
  renderFeedHtml,
  type FeedEntry,
} from "@/lib/feed";

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
  // xmldom accepts a bare "&" without complaint; XML does not (outside CDATA, where it is literal).
  const outsideCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  expect(
    outsideCdata.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)[^\s]{0,20}/gi) ?? [],
  ).toEqual([]);

  return document;
}

const texts = (document: Document, tag: string) =>
  Array.from(document.getElementsByTagName(tag)).map((node) => node.textContent ?? "");

const posts = blog.getPages();

describe("the RSS feed", () => {
  it("parses, lists every post once and is newest first", async () => {
    const response = await rssRoute();
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
    const response = await atomRoute();
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

const CONTENT_NS = "http://purl.org/rss/1.0/modules/content/";

/** Every href and src in a fragment of article HTML. */
const urlsIn = (html: string) =>
  Array.from(html.matchAll(/\s(?:href|src)="([^"]*)"/g), (match) => match[1]!);

describe("full article content", () => {
  it("RSS declares the content namespace and every item carries the whole article", async () => {
    const document = parseXml(await (await rssRoute()).text());

    expect(document.documentElement.getAttribute("xmlns:content")).toBe(CONTENT_NS);

    const items = Array.from(document.getElementsByTagName("item"));
    for (const item of items) {
      const encoded = item.getElementsByTagNameNS(CONTENT_NS, "encoded");
      const description = item.getElementsByTagName("description")[0]!.textContent ?? "";

      expect(encoded).toHaveLength(1);
      expect(encoded[0]!.textContent).toMatch(/<p>/);
      expect(encoded[0]!.textContent!.length).toBeGreaterThan(description.length * 4);
    }
  });

  it("Atom carries the whole article as escaped HTML beside the summary", async () => {
    const document = parseXml(await (await atomRoute()).text());

    for (const entry of Array.from(document.getElementsByTagName("entry"))) {
      const content = entry.getElementsByTagName("content");

      expect(content).toHaveLength(1);
      expect(content[0]!.getAttribute("type")).toBe("html");
      expect(content[0]!.textContent).toMatch(/<p>/);
      expect(entry.getElementsByTagName("summary")[0]!.textContent).toBeTruthy();
    }
  });

  it("uses only absolute links and image sources, rewriting the site-relative ones", async () => {
    const entries = await getFeedEntries();
    const urls = entries.flatMap((entry) => urlsIn(entry.content));

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => !/^(?:https?:|mailto:)/.test(url))).toEqual([]);
    expect(urls.some((url) => url.startsWith(`${siteConfig.url}/`))).toBe(true);

    const html = renderFeedHtml(
      "[a](/other-post) [b](#section) ![c](/diagram.svg) [d](https://example.com/x)",
      `${siteConfig.url}/this-post`,
    );
    expect(urlsIn(html)).toEqual([
      `${siteConfig.url}/other-post`,
      `${siteConfig.url}/this-post#section`,
      `${siteConfig.url}/diagram.svg`,
      "https://example.com/x",
    ]);
  });

  it("finds no raw HTML or MDX components in any post, which the renderer would silently drop", async () => {
    type MdastNode = { type: string; value?: string; children?: MdastNode[] };
    // Plain remark reads MDX imports, exports, {expressions} and {/* comments */} as paragraph text,
    // which feed readers would then show literally.
    const mdxAsText = /^(?:import|export)\s|[{}]/;
    const rawHtml = (node: MdastNode): string[] => [
      ...(node.type === "html" ? [node.value ?? ""] : []),
      ...(node.type === "text" && mdxAsText.test(node.value ?? "") ? [node.value ?? ""] : []),
      ...(node.children ?? []).flatMap(rawHtml),
    ];

    for (const post of posts) {
      const tree = unified()
        .use(remarkParse)
        .parse(await postMarkdown(post)) as MdastNode;

      expect(rawHtml(tree), post.url).toEqual([]);
    }
  });
});

describe("feed escaping", () => {
  const hostile: FeedEntry = {
    url: `${siteConfig.url}/a?b=1&c=2`,
    title: `Tom & Jerry's <script>"quoted"</script>`,
    description: "1 < 2 & 3 > 2",
    content: `<p>Ends early ]]><script>alert(1)</script> and again ]]]]> & <a href="/x">x</a></p>`,
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
    }
  });

  it("keeps article HTML intact when it contains ]]>, so it cannot close the CDATA section early", () => {
    const rss = buildRssFeed([hostile]);
    const atom = buildAtomFeed([hostile]);

    expect(parseXml(rss).getElementsByTagNameNS(CONTENT_NS, "encoded")[0]!.textContent).toBe(
      hostile.content,
    );
    expect(texts(parseXml(atom), "content")).toEqual([hostile.content]);
    expect(atom).not.toContain("<script>");
  });

  it("drops control characters XML cannot carry, so one stray character cannot break the feed", () => {
    const stray = { ...hostile, title: "Bell\u0007 title", content: "<p>Form\u000Cfeed</p>" };

    for (const xml of [buildRssFeed([stray]), buildAtomFeed([stray])]) {
      expect(xml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
      expect(texts(parseXml(xml), "title")).toContain("Bell title");
    }
  });

  it("orders entries by publication date, newest first", async () => {
    const entries = await getFeedEntries();

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
