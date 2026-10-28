import type { MetadataRoute } from "next";

import { templates } from "@/templates/catalog/templates";
import { portfolioPublicUrl, siteConfig } from "@/config/site";

import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";

export const revalidate = 3600;

type PublicListItem = { subdomain: string; updatedAt: string };

/** What the server returns for a page with no `limit`. */
const PAGE_SIZE = 1000;
/** The sitemap protocol's limit, minus the fixed routes above. */
const MAX_SITEMAP_PORTFOLIOS = 49_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },

    {
      url: `${siteConfig.url}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    {
      url: `${siteConfig.url}/templates`,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    {
      url: `${siteConfig.url}/faq`,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    ...templates.map((template) => ({
      url: `${siteConfig.url}/templates/${template.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  const publications: PublicListItem[] = [];

  try {
    // One page is 1,000 sites; past the first page the list used to stop there (V-310). Paged up
    // to the sitemap protocol's 50,000 URLs, in id order (`order=stable`): the default order moves
    // with every republish and billing change, so cached pages could skip or repeat a site. A page
    // that fails keeps what came before it.
    for (let offset = 0; offset < MAX_SITEMAP_PORTFOLIOS; offset += PAGE_SIZE) {
      const response = await fetch(
        backendApiUrl(`/portfolios/public?order=stable&offset=${offset}`, true),
        {
          headers: firstPartyServerHeaders(),
          next: { revalidate, tags: ["portfolios-list"] },
        },
      );

      if (!response.ok) break;

      const page = ((await response.json()) as { data?: PublicListItem[] }).data ?? [];
      publications.push(...page);

      if (page.length < PAGE_SIZE) break;
    }
  } catch {
    // Whatever was fetched is still listed.
  }

  return [
    ...routes,
    ...publications.map((publication) => {
      const updatedAt = new Date(publication.updatedAt);

      return {
        url: portfolioPublicUrl(publication.subdomain),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(Number.isNaN(updatedAt.getTime()) ? {} : { lastModified: updatedAt }),
      };
    }),
  ];
}
