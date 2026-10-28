import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { source, apiSource, engineSource } from "@/lib/source";

type Page = { url: string; data: { lastModified?: Date } };

function entry(page: Page, priority: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteConfig.url}${page.url}`,
    lastModified: page.data.lastModified,
    changeFrequency: "weekly",
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    ...source.getPages().map((page) => entry(page, 0.8)),
    ...engineSource.getPages().map((page) => entry(page, 0.8)),
    ...apiSource.getPages().map((page) => entry(page, 0.7)),
  ];

  const latest = pages.reduce<Date | undefined>((max, { lastModified }) => {
    const date = lastModified ? new Date(lastModified) : undefined;
    return date && (!max || date > max) ? date : max;
  }, undefined);

  return [
    { url: siteConfig.url, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    ...pages,
  ];
}
