import { Metadata } from "next";
import { connection } from "next/server";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { fetchRoadmapFromBackend } from "@/features/roadmap/services/roadmap-backend";

import RoadmapPageShell from "@/features/roadmap/components/RoadmapPageShell";

export const metadata: Metadata = buildPageMetadata({
  path: "/roadmap/todo",
  // One board split by status: /roadmap is the page that ranks.
  canonicalPath: "/roadmap",
  title: `Planned AI Features & Updates | ${siteConfig.shortName} Roadmap`,
  description:
    "Discover planned AI features, upcoming resume and portfolio templates, and future platform updates in the VeriWorkly roadmap.",
  ogTitle: "What We're Building Next",
  ogDescription:
    "Queued feature requests and planned AI capabilities, straight from the VeriWorkly public backlog.",
  twitterTitle: "Up next on the VeriWorkly roadmap",
  twitterDescription: "See what features are planned next in the VeriWorkly workspace roadmap.",
  image: "/og/roadmap/roadmap-todo-page-og.png",
  imageAlt: "VeriWorkly Planned Features Roadmap",
  keywords: ["VeriWorkly planned features", "resume builder roadmap", "upcoming AI features"],
});

const TodoRoadmapPage = async () => {
  const data = await fetchRoadmapFromBackend({
    status: "todo",
  });

  // A failed column must not be cached as the page; at build the page stays static and Refresh or the next deploy refills it.
  if (data.failedStatuses.length > 0 && process.env.NEXT_PHASE !== "phase-production-build")
    await connection();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Roadmap", item: `${siteConfig.url}/roadmap` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Planned",
        item: `${siteConfig.url}/roadmap/todo`,
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
        activeStatus="todo"
        basePath="/roadmap/todo"
        title="Planned Features"
        description="Explore concepts and feature requests currently queued for upcoming development cycles."
      />
    </>
  );
};

export default TodoRoadmapPage;
