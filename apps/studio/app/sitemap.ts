import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const baseUrl = siteConfig.url;

  const publicRoutes = [
    {
      url: `${baseUrl}/login`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },

    {
      url: "https://blog.veriworkly.com",
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },

    {
      url: "https://docs.veriworkly.com",
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ] satisfies MetadataRoute.Sitemap;

  return publicRoutes.map((route) => ({
    ...route,
    lastModified,
  }));
}
