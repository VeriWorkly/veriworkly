import { Metadata } from "next";
import { connection } from "next/server";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { fetchRoadmapFromBackend } from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "@/features/roadmap/components/RoadmapPageShell";
import RoadmapSEOContent from "@/features/roadmap/components/RoadmapSEOContent";

const pageUrl = `${siteConfig.url}/roadmap`;

export const metadata: Metadata = buildPageMetadata({
  path: "/roadmap",
  title: `Product Roadmap: AI Career Builder Updates | ${siteConfig.shortName}`,
  description:
    "Explore upcoming AI features, ATS improvements, resume and cover letter templates, and completed platform updates.",
  ogTitle: "See Exactly What We're Building Next",
  ogDescription:
    "A public, filterable roadmap covering AI features, the ATS checker, portfolio publishing, and every shipped update.",
  twitterTitle: "Our roadmap is public. No secrets.",
  twitterDescription:
    "Planned, in-progress, and shipped features across resumes, ATS scoring, portfolios, and AI tools.",
  image: "/og/roadmap-page-og.png",
  imageAlt: `${siteConfig.shortName} | Product Roadmap`,
  keywords: [
    "VeriWorkly roadmap",
    "AI resume builder roadmap",
    "upcoming features",
    "product changelog",
    "career workspace updates",
  ],
});

const RoadmapPage = async () => {
  const data = await fetchRoadmapFromBackend({});

  // A failed column is not cached as the page for a week; render per request instead.
  if (data.failedStatuses.length > 0) await connection();

  const allItems = data?.sections.flatMap((section) => section.items) ?? [];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Roadmap", item: pageUrl },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Product Roadmap: AI Career Builder Updates | ${siteConfig.shortName}`,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: allItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `${siteConfig.url}/roadmap/${item.id}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(itemListSchema)}
      />

      <RoadmapPageShell
        data={data}
        activeStatus="all"
        basePath="/roadmap"
        title="Product Roadmap"
        description="Track what is planned, currently shipping, and completed. Use the filters and section refresh controls to explore roadmap data."
      />

      <RoadmapSEOContent />
    </>
  );
};

export default RoadmapPage;
