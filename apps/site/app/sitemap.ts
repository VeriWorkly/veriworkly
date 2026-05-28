import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { documentTypeSummaries, templateSummaries } from "@/config/templates";

export const revalidate = 86400;

const publicRoutes = [
  {
    url: siteConfig.url,
    changeFrequency: "weekly" as const,
    priority: 1,
  },
  {
    url: `${siteConfig.url}/templates`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  },
  {
    url: `${siteConfig.url}/roadmap`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  },
  {
    url: `${siteConfig.url}/roadmap/todo`,
    changeFrequency: "daily" as const,
    priority: 0.75,
  },
  {
    url: `${siteConfig.url}/roadmap/in-progress`,
    changeFrequency: "daily" as const,
    priority: 0.75,
  },
  {
    url: `${siteConfig.url}/roadmap/done`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },
  {
    url: `${siteConfig.url}/stats`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  },
  {
    url: `${siteConfig.url}/about`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    url: `${siteConfig.url}/contact`,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  },
  {
    url: `${siteConfig.url}/faq`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  },
  {
    url: `${siteConfig.url}/style-guide`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
  {
    url: `${siteConfig.url}/privacy`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
  {
    url: `${siteConfig.url}/security`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
  {
    url: `${siteConfig.url}/terms`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },

  { url: siteConfig.links.app, changeFrequency: "weekly", priority: 0.8 },
  { url: siteConfig.links.blog, changeFrequency: "weekly", priority: 0.7 },
  { url: siteConfig.links.docs, changeFrequency: "weekly", priority: 0.7 },
] satisfies MetadataRoute.Sitemap;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const templateRoutes = documentTypeSummaries
    .filter((docType) => docType.status === "available")
    .map((docType) => ({
      url: `${siteConfig.url}${docType.href}`,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  const templateDetailRoutes = templateSummaries.map((template) => ({
    url: `${siteConfig.url}/templates/${template.documentType}/${template.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...publicRoutes, ...templateRoutes, ...templateDetailRoutes].map((route) => ({
    ...route,
    lastModified,
  }));
}
