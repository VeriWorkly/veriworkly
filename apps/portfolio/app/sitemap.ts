import type { MetadataRoute } from "next";

import { templates } from "@/templates/catalog/templates";
import { portfolioPublicUrl, siteConfig } from "@/config/site";

import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },

    {
      url: `${siteConfig.url}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },

    {
      url: `${siteConfig.url}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },

    ...templates.map((template) => ({
      url: `${siteConfig.url}/templates/${template.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  try {
    const response = await fetch(backendApiUrl("/portfolios/public", true), {
      headers: firstPartyServerHeaders(),
      next: { revalidate, tags: ["portfolios-list"] },
    });

    if (!response.ok) return routes;

    const payload = (await response.json()) as {
      data?: Array<{ subdomain: string; updatedAt: string }>;
    };

    return [
      ...routes,
      ...(payload.data ?? []).map((publication) => ({
        url: portfolioPublicUrl(publication.subdomain),
        lastModified: new Date(publication.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return routes;
  }
}
