import type { MetadataRoute } from "next";
import { portfolioPublicUrl, portfolioSiteConfig } from "@/config/site";
import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: portfolioSiteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${portfolioSiteConfig.url}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
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
