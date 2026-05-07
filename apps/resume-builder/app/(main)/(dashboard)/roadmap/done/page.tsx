import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  type RoadmapSort,
  fetchRoadmapFromBackend,
} from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "../components/RoadmapPageShell";

export const metadata: Metadata = {
  title: `Completed Resume Builder Features | ${siteConfig.shortName} Roadmap`,
  description:
    "See completed features, shipped updates, and released improvements in the VeriWorkly resume builder roadmap.",

  openGraph: {
    title: `${siteConfig.shortName} Roadmap – Completed Features`,
    description: "View recently completed features and updates in VeriWorkly resume builder.",
    url: `${siteConfig.url}/roadmap/done`,
    siteName: siteConfig.shortName,
    images: [
      {
        url: "/og/roadmap/roadmap-done-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Completed Features",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} Completed Features`,
    description: "See what features have already shipped in VeriWorkly.",
    images: ["/og/roadmap/roadmap-done-page-og.png"],
    creator: "@noober_boy",
  },
};

export const dynamic = "force-dynamic";

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") {
    return raw;
  }

  return undefined;
}

interface DoneRoadmapPageProps {
  searchParams: Promise<{
    sort?: string;
    refresh?: string;
  }>;
}

export default async function DoneRoadmapPage({ searchParams }: DoneRoadmapPageProps) {
  const params = await searchParams;

  const data = await fetchRoadmapFromBackend({
    status: "done",
    sort: parseSort(params.sort),
    refreshSection: params.refresh === "done" ? "done" : undefined,
  });

  return (
    <RoadmapPageShell
      data={data}
      activeStatus="done"
      basePath="/roadmap/done"
      title="Roadmap: Completed Features & Updates"
      description="Completed features with creation, completion date, and shipped quarter history."
    />
  );
}
