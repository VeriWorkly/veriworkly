import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { termsLastUpdated } from "@/features/legal/termsContent";
import { privacyLastUpdated } from "@/features/legal/privacyContent";
import { SECURITY_LAST_UPDATED } from "@/features/security/data/lastUpdated";
import { isAffiliateProgramEnabled, isAmbassadorProgramEnabled } from "@/lib/feature-flags";
import { COMPETITORS } from "@/features/compare/data/competitors";
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

// Hourly: a build made with the backend down lists static routes only, and the data fetches
// underneath are cached for a week, so a short window costs nothing.
export const revalidate = 3600;

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

  // Only pages that state their own date carry lastmod: one that moves every deploy teaches Google to ignore it.
  {
    url: `${siteConfig.url}/privacy`,
    lastModified: privacyLastUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },

  {
    url: `${siteConfig.url}/security`,
    lastModified: SECURITY_LAST_UPDATED,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },

  {
    url: `${siteConfig.url}/terms`,
    lastModified: termsLastUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  },
] satisfies MetadataRoute.Sitemap;

/** At runtime errors are rethrown on purpose: a failed ISR revalidation keeps the last good sitemap instead of one missing every backend URL. */
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

  // Closed programs' pages only say so; they should not be submitted for indexing.
  const closed = new Set([
    ...(isAffiliateProgramEnabled() ? [] : [`${siteConfig.url}/affiliate`]),
    ...(isAmbassadorProgramEnabled() ? [] : [`${siteConfig.url}/ambassador`]),
  ]);

  return [
    ...publicRoutes.filter(
      (route) => route.url !== changelogIndexRoute.url && !closed.has(route.url),
    ),
    changelogIndexRoute,
    ...templateRoutes,
    ...templateDetailRoutes,
    ...roadmapItemRoutes,
    ...changelogItemRoutes,
    ...compareRoutes,
  ];
}
