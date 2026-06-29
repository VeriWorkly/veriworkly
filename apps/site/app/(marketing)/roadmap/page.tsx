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
  title: `Product Roadmap: AI Career Builder Updates | ${siteConfig.shortName}`,
  description:
    "Explore upcoming AI features, resume and cover letter templates, subdomain routing updates, and completed improvements.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Product Roadmap: AI Career Builder Updates | ${siteConfig.shortName}`,
    description:
      "Track upcoming AI features, document compiler updates, and recently shipped improvements.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} | Product Roadmap`,
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: `Product Roadmap | ${siteConfig.shortName}`,
    description: "See upcoming platform features, template improvements, and shipped updates.",
    images: [pageOgImage],
  },
};

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") return raw;

  return undefined;
}

function parseStatus(raw: string | undefined) {
  if (raw === "todo" || raw === "in-progress" || raw === "done") return raw;

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
  }).catch(() => null);

  return (
    <>
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
}
