import { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  type RoadmapSort,
  fetchRoadmapFromBackend,
} from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "@/features/roadmap/components/RoadmapPageShell";

export const metadata: Metadata = buildPageMetadata({
  path: "/roadmap/in-progress",
  title: `AI Features in Development | ${siteConfig.shortName} Roadmap`,
  description:
    "Track AI-powered capabilities, document compilers, and active improvements currently in development for VeriWorkly.",
  ogTitle: "Watch Features Get Built in Real Time",
  ogDescription:
    "Active implementation work across AI features, the ATS checker, and portfolio tools - updated as it ships.",
  twitterTitle: "Currently in progress at VeriWorkly",
  twitterDescription: "See what features are currently being built in the VeriWorkly platform.",
  image: "/og/roadmap/roadmap-progress-page-og.png",
  imageAlt: "VeriWorkly Features In Progress",
  keywords: ["VeriWorkly in progress", "features in development", "AI resume builder updates"],
});

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") {
    return raw;
  }

  return undefined;
}

interface InProgressRoadmapPageProps {
  searchParams: Promise<{
    sort?: string;
  }>;
}

const InProgressRoadmapPage = async ({ searchParams }: InProgressRoadmapPageProps) => {
  const params = await searchParams;

  const data = await fetchRoadmapFromBackend({
    sort: parseSort(params.sort),
    status: "in-progress",
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Roadmap", item: `${siteConfig.url}/roadmap` },
      {
        "@type": "ListItem",
        position: 3,
        name: "In Progress",
        item: `${siteConfig.url}/roadmap/in-progress`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <RoadmapPageShell
        data={data}
        activeStatus="in-progress"
        basePath="/roadmap/in-progress"
        title="In Progress"
        description="Track active implementation work across AI features, document compiler engines, and domain tools."
      />
    </>
  );
};

export default InProgressRoadmapPage;
