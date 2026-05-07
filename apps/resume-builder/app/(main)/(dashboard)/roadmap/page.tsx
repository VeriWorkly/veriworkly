import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  type RoadmapSort,
  fetchRoadmapFromBackend,
} from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "./components/RoadmapPageShell";
import RoadmapSEOContent from "./components/RoadmapSEOContent";

const pageUrl = `${siteConfig.url}/roadmap`;
const pageOgImage = `${siteConfig.url}/og/roadmap-page-og.png`;

export const metadata: Metadata = {
  title: `Resume Builder Product Roadmap`,
  description:
    "Explore upcoming ATS resume builder features, template updates, exports, and completed improvements in VeriWorkly.",

  openGraph: {
    title: `Resume Builder Roadmap | ${siteConfig.shortName}`,
    description:
      "Track upcoming resume builder features, roadmap progress, and recently shipped updates.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} | Resume Builder Roadmap`,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: `Resume Builder Roadmap | ${siteConfig.shortName}`,
    description:
      "See upcoming ATS resume builder features, template improvements, and shipped updates.",
    images: [pageOgImage],
  },
};

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") {
    return raw;
  }

  return undefined;
}

function parseStatus(raw: string | undefined) {
  if (raw === "todo" || raw === "in-progress" || raw === "done") {
    return raw;
  }

  return undefined;
}

interface RoadmapPageProps {
  searchParams: Promise<{
    sort?: string;
    refresh?: string;
  }>;
}

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const params = await searchParams;

  const data = await fetchRoadmapFromBackend({
    sort: parseSort(params.sort),
    refreshSection: parseStatus(params.refresh),
  });

  return (
    <>
      <RoadmapPageShell
        data={data}
        basePath="/roadmap"
        activeStatus="all"
        title="Product Roadmap"
        description="Track what is planned, currently shipping, and completed. Use the filters and section refresh controls to explore roadmap data."
      />

      <RoadmapSEOContent />
    </>
  );
}
