import type { MetadataRoute } from "next";

export const revalidate = 86400;

const publicRoutes = [
  {
    url: "https://blogs.veriworkly.com",
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },
  {
    url: "https://docs.veriworkly.com",
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },
] satisfies MetadataRoute.Sitemap;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    ...route,
    lastModified,
  }));
}
