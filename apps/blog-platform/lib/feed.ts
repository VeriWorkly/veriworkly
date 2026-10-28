import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

/**
 * Feed generation for `/rss.xml` and `/atom.xml`.
 *
 * Both are advertised in `/llms.txt` and in the document head, so they have to
 * exist and stay in sync with the content collection rather than being hand-maintained.
 */

/** XML has five predefined entities; everything else in our content is valid UTF-8 already. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type FeedEntry = {
  url: string;
  title: string;
  description: string;
  author: string;
  category: string;
  published: Date;
  updated: Date;
  tags: string[];
};

/** Newest first. Shared by both feed formats so they can never disagree about ordering. */
export function getFeedEntries(): FeedEntry[] {
  return blog
    .getPages()
    .map((page) => {
      const { title, description, author, category, date, updated, tags } = page.data;
      const published = new Date(date);

      return {
        url: `${siteConfig.url}${page.url}`,
        title,
        description,
        author,
        category,
        published,
        updated: new Date(updated ?? date),
        tags,
      };
    })
    .sort((a, b) => b.published.getTime() - a.published.getTime());
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
      <pubDate>${entry.published.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(entry.author)}</dc:creator>
      <category>${escapeXml(entry.category)}</category>
${entry.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
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
