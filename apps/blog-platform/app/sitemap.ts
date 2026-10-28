import type { MetadataRoute } from "next";

import { blog } from "@/lib/source";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPages = blog.getPages().map((page) => ({
    url: `${siteConfig.url}${page.url}`,
    // Real revision dates. Stamping every URL with "today" is a freshness signal
    // crawlers learn to discount.
    lastModified: new Date(page.data.updated ?? page.data.date),
    changeFrequency: page.data.pillar ? ("monthly" as const) : ("yearly" as const),
    priority: page.data.pillar ? 0.9 : 0.7,
  }));

  // Derived rather than `new Date()` for the same reason: the index and archive only
  // genuinely change when a post does.
  const lastPublished = blogPages.reduce<Date>(
    (latest, page) => (page.lastModified > latest ? page.lastModified : latest),
    new Date(0),
  );

  return [
    {
      url: siteConfig.url,
      lastModified: lastPublished,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      // Lists every post and sets its own canonical, so it is an indexable page.
      url: `${siteConfig.url}/archive`,
      lastModified: lastPublished,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    ...blogPages,
  ];
}
