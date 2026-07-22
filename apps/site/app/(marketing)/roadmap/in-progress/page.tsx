import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  type RoadmapSort,
  fetchRoadmapFromBackend,
} from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "@/features/roadmap/components/RoadmapPageShell";

export const metadata: Metadata = {
  title: `AI Features in Development | ${siteConfig.shortName} Roadmap`,
  description:
    "Track AI-powered capabilities, document compilers, and active improvements currently in development for VeriWorkly.",
  alternates: {
    canonical: `${siteConfig.url}/roadmap/in-progress`,
    languages: {
      "en-US": `${siteConfig.url}/roadmap/in-progress`,
    },
  },
  openGraph: {
    title: `${siteConfig.shortName} Roadmap: AI Features In Progress`,
    description: "Follow AI-powered tools and platform improvements currently in development.",
    url: `${siteConfig.url}/roadmap/in-progress`,
    siteName: siteConfig.shortName,
    images: [
      {
        url: "/og/roadmap/roadmap-progress-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Features In Progress",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} In Progress Features`,
    description: "See what features are currently being built in the VeriWorkly platform.",
    images: ["/og/roadmap/roadmap-progress-page-og.png"],
    creator: "@noober_boy",
  },
};

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") {
    return raw;
  }

  return undefined;
}

interface InProgressRoadmapPageProps {
  searchParams: Promise<{
    sort?: string;
    refresh?: string;
  }>;
}

const InProgressRoadmapPage = async ({ searchParams }: InProgressRoadmapPageProps) => {
  const params = await searchParams;

  const data = await fetchRoadmapFromBackend({
    sort: parseSort(params.sort),
    status: "in-progress",
    refreshSection: params.refresh === "in-progress" ? "in-progress" : undefined,
  }).catch(() => null);

  return (
    <RoadmapPageShell
      data={data}
      activeStatus="in-progress"
      basePath="/roadmap/in-progress"
      title="In Progress"
      description="Track active implementation work across AI features, document compiler engines, and domain tools."
    />
  );
};

export default InProgressRoadmapPage;
