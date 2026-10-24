import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { COMPETITORS } from "@/features/compare";
import { documentTypeSummaries, templateSummaries } from "@/config/templates";

import {
  type ChangelogIndexItem,
  fetchChangelogIndex,
  fetchLatestChangelogPublishedAt,
} from "@/features/changelog/services/changelog-backend";
import {
  type RoadmapSitemapEntry,
  fetchRoadmapSitemapEntries,
} from "@/features/roadmap/services/roadmap-backend";

export const revalidate = 604800;

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
    url: `${siteConfig.url}/pricing`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  },

  {
    url: `${siteConfig.url}/ats-checker`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  },

  {
    url: `${siteConfig.url}/ats-engine`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
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
    url: `${siteConfig.url}/changelog`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },

  {
    url: `${siteConfig.url}/compare`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  },

  {
    url: `${siteConfig.url}/brand-kit`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },

  {
    url: `${siteConfig.url}/about`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },

  {
    url: `${siteConfig.url}/features`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },

  {
    url: `${siteConfig.url}/how-it-works`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },

  {
    url: `${siteConfig.url}/affiliate`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },

  {
    url: `${siteConfig.url}/ambassador`,
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
] satisfies MetadataRoute.Sitemap;

/**
 * The backend-driven rows. At build time an unreachable backend yields the static routes
 * only, and the first ISR revalidation fills the rest in. At runtime the error is rethrown
 * on purpose: a revalidation that throws keeps the last successfully generated sitemap, which
 * is better than publishing one that silently lost every roadmap and changelog URL for a week.
 */
async function fetchDynamicEntries(): Promise<
  [RoadmapSitemapEntry[], Date | null, ChangelogIndexItem[]]
> {
  try {
    return await Promise.all([
      fetchRoadmapSitemapEntries(),
      fetchLatestChangelogPublishedAt(),
      fetchChangelogIndex(),
    ]);
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw err;

    console.error("Sitemap: backend unreachable at build, listing static routes only:", err);

    return [[], null, []];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const [roadmapEntries, changelogLastModified, changelogEntries] = await fetchDynamicEntries();

  const roadmapItemRoutes = roadmapEntries.map((entry) => {
    const updatedAt = new Date(entry.updatedAt);

    return {
      url: `${siteConfig.url}/roadmap/${entry.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.65,
      ...(Number.isNaN(updatedAt.getTime()) ? {} : { lastModified: updatedAt }),
    };
  });

  const changelogItemRoutes = changelogEntries.map((entry) => {
    const publishedAt = new Date(entry.publishedAt);

    return {
      url: `${siteConfig.url}/changelog/${entry.id}`,
      changeFrequency: "yearly" as const,
      priority: 0.6,
      ...(Number.isNaN(publishedAt.getTime()) ? {} : { lastModified: publishedAt }),
    };
  });

  const compareRoutes = COMPETITORS.map((competitor) => ({
    url: `${siteConfig.url}/compare/${competitor.id}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const changelogIndexRoute = {
    url: `${siteConfig.url}/changelog`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    ...(changelogLastModified ? { lastModified: changelogLastModified } : {}),
  };

  return [
    ...publicRoutes.filter((route) => route.url !== changelogIndexRoute.url),
    changelogIndexRoute,
    ...templateRoutes,
    ...templateDetailRoutes,
    ...roadmapItemRoutes,
    ...changelogItemRoutes,
    ...compareRoutes,
  ];
}
