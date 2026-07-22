import { Metadata } from "next";

import { siteConfig } from "@/config/site";

import {
  type RoadmapSort,
  fetchRoadmapFromBackend,
} from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "@/features/roadmap/components/RoadmapPageShell";

export const metadata: Metadata = {
  title: `Planned AI Features & Updates | ${siteConfig.shortName} Roadmap`,
  description:
    "Discover planned AI features, upcoming resume and portfolio templates, and future platform updates in the VeriWorkly roadmap.",
  alternates: {
    canonical: `${siteConfig.url}/roadmap/todo`,
    languages: {
      "en-US": `${siteConfig.url}/roadmap/todo`,
    },
  },
  openGraph: {
    title: `${siteConfig.shortName} Roadmap: Planned AI Features`,
    description:
      "Discover upcoming AI capabilities and planned improvements in the VeriWorkly workspace roadmap.",
    url: `${siteConfig.url}/roadmap/todo`,
    siteName: siteConfig.shortName,
    images: [
      {
        url: "/og/roadmap/roadmap-todo-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Planned Features Roadmap",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.shortName} Planned Features`,
    description: "See what features are planned next in the VeriWorkly workspace roadmap.",
    images: ["/og/roadmap/roadmap-todo-page-og.png"],
    creator: "@noober_boy",
  },
};

function parseSort(raw: string | undefined): RoadmapSort | undefined {
  if (raw === "newest" || raw === "oldest" || raw === "recently-completed") {
    return raw;
  }

  return undefined;
}

interface TodoRoadmapPageProps {
  searchParams: Promise<{
    sort?: string;
    refresh?: string;
  }>;
}

const TodoRoadmapPage = async ({ searchParams }: TodoRoadmapPageProps) => {
  const params = await searchParams;

  const data = await fetchRoadmapFromBackend({
    sort: parseSort(params.sort),
    status: "todo",
    refreshSection: params.refresh === "todo" ? "todo" : undefined,
  }).catch(() => null);

  return (
    <RoadmapPageShell
      data={data}
      activeStatus="todo"
      basePath="/roadmap/todo"
      title="Planned Features"
      description="Explore concepts and feature requests currently queued for upcoming development cycles."
    />
  );
};

export default TodoRoadmapPage;
