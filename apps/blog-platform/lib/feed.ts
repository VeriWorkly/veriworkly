import type { BlogPost } from "@/lib/source";

import { toHtml } from "hast-util-to-html";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

/**
 * Feed generation for `/rss.xml` and `/atom.xml`.
 *
 * Both are advertised in `/llms.txt` and in the document head, so they have to
 * exist and stay in sync with the content collection rather than being hand-maintained.
 */

/** XML has five predefined entities; everything else in our content is valid UTF-8 already. */
/** Control characters XML 1.0 forbids even when escaped: one stray character would break the whole feed. */
function xmlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function escapeXml(value: string): string {
  return xmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** `]]>` ends a CDATA section, so any occurrence in the payload is split across two sections. */
function cdata(value: string): string {
  return `<![CDATA[${xmlChars(value).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

// An optional byte-order mark first, so a file saved with one does not leak its YAML into the feed.
const FRONTMATTER = /^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/;

/** A post's Markdown body as written, without its frontmatter. Posts are plain Markdown, no JSX. */
export async function postMarkdown(post: BlogPost): Promise<string> {
  return (await post.data.getText("raw")).replace(FRONTMATTER, "").trim();
}

type HastNode = {
  type: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const URL_ATTRIBUTES = ["href", "src"] as const;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Feed readers show content away from the site, so `/slug`, `#anchor` and image paths become absolute. */
function absolutiseUrls(node: HastNode, base: string): void {
  if (node.type === "element" && node.properties) {
    for (const attribute of URL_ATTRIBUTES) {
      const value = node.properties[attribute];

      if (typeof value === "string" && value !== "" && !HAS_SCHEME.test(value))
        node.properties[attribute] = new URL(value, base).href;
    }
  }

  for (const child of node.children ?? []) absolutiseUrls(child, base);
}

const markdownToHast = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

/**
 * Full article HTML for `<content:encoded>` and Atom `<content>`. Raw HTML in the Markdown is
 * dropped rather than passed through (remark-rehype's default), so no markup reaches readers unescaped.
 */
export function renderFeedHtml(markdown: string, url: string): string {
  const tree = markdownToHast.runSync(markdownToHast.parse(markdown));
  absolutiseUrls(tree as HastNode, url);

  return toHtml(tree);
}

export type FeedEntry = {
  url: string;
  title: string;
  description: string;
  /** The whole article as HTML, with absolute links. */
  content: string;
  author: string;
  category: string;
  published: Date;
  updated: Date;
  tags: string[];
};

/** Newest first. Shared by both feed formats so they can never disagree about ordering. */
export async function getFeedEntries(): Promise<FeedEntry[]> {
  const entries = await Promise.all(
    blog.getPages().map(async (page): Promise<FeedEntry> => {
      const { title, description, author, category, date, updated, tags } = page.data;
      const url = `${siteConfig.url}${page.url}`;

      return {
        url,
        title,
        description,
        content: renderFeedHtml(await postMarkdown(page), url),
        author,
        category,
        published: new Date(date),
        updated: new Date(updated ?? date),
        tags,
      };
    }),
  );

  return entries.sort((a, b) => b.published.getTime() - a.published.getTime());
}

/** Most recent revision across the collection, used as the feed-level timestamp. */
function latestUpdate(entries: FeedEntry[]): Date {
  return entries.reduce<Date>(
    (latest, entry) => (entry.updated > latest ? entry.updated : latest),
    new Date(0),
  );
}

export function buildRssFeed(entries: FeedEntry[]): string {
  const items = entries
    .map(
      (entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.url)}</link>
      <guid isPermaLink="true">${escapeXml(entry.url)}</guid>
      <description>${escapeXml(entry.description)}</description>
      <content:encoded>${cdata(entry.content)}</content:encoded>
      <pubDate>${entry.published.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(entry.author)}</dc:creator>
      <category>${escapeXml(entry.category)}</category>
${entry.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(siteConfig.url)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en</language>
    <lastBuildDate>${latestUpdate(entries).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(siteConfig.url)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

export function buildAtomFeed(entries: FeedEntry[]): string {
  const items = entries
    .map(
      (entry) => `  <entry>
    <title type="text">${escapeXml(entry.title)}</title>
    <link href="${escapeXml(entry.url)}" rel="alternate" type="text/html" />
    <id>${escapeXml(entry.url)}</id>
    <published>${entry.published.toISOString()}</published>
    <updated>${entry.updated.toISOString()}</updated>
    <summary type="text">${escapeXml(entry.description)}</summary>
    <content type="html">${escapeXml(entry.content)}</content>
    <author><name>${escapeXml(entry.author)}</name></author>
    <category term="${escapeXml(entry.category)}" />
${entry.tags.map((tag) => `    <category term="${escapeXml(tag)}" />`).join("\n")}
  </entry>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title type="text">${escapeXml(siteConfig.name)}</title>
  <subtitle type="text">${escapeXml(siteConfig.description)}</subtitle>
  <link href="${escapeXml(siteConfig.url)}/atom.xml" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(siteConfig.url)}" rel="alternate" type="text/html" />
  <id>${escapeXml(siteConfig.url)}/</id>
  <updated>${latestUpdate(entries).toISOString()}</updated>
${items}
</feed>
`;
}
