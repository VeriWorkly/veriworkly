import type { Metadata } from "next";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";

import { Container } from "@veriworkly/ui";

import {
  fetchRoadmapFeatureById,
  fetchSuggestedRoadmapItems,
} from "@/features/roadmap/services/roadmap-backend";

import FeatureHeader from "./components/FeatureHeader";
import FeatureDetailsContent from "./components/FeatureDetailsContent";
import SuggestedItemsSidebar from "./components/SuggestedItemsSidebar";

interface RoadmapDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RoadmapDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchRoadmapFeatureById(id).catch(() => null);

  if (!item) return { title: "Item Not Found" };

  const ogUrl = new URL("/api/og", siteConfig.url);
  ogUrl.searchParams.set("title", item.title);

  if (item.description) {
    ogUrl.searchParams.set("description", item.description);
  } else {
    ogUrl.searchParams.set("showDesc", "false");
  }

  const metadataDescription =
    item.description ||
    `Track progress, updates, and release details for ${item.title} in the VeriWorkly resume builder roadmap.`;

  return {
    title: `${item.title} | Resume Builder Roadmap`,
    description: metadataDescription,

    openGraph: {
      title: `${item.title} | VeriWorkly Roadmap`,
      description: metadataDescription,
      url: `${siteConfig.url}/roadmap/${id}`,
      siteName: siteConfig.name,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: `${item.title} Roadmap Feature`,
        },
      ],
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: `${item.title} | Resume Builder Feature`,
      description: metadataDescription,
      images: [ogUrl.toString()],
    },
  };
}

const RoadmapDetailPage = async ({ params }: RoadmapDetailPageProps) => {
  const { id } = await params;

  const feature = await fetchRoadmapFeatureById(id);

  if (!feature) {
    notFound();
  }

  const suggestedItems = await fetchSuggestedRoadmapItems(feature);

  return (
    <main className="flex min-h-screen flex-col">
      <Container className="py-8 md:py-12">
        <Link
          href={`/roadmap`}
          className="text-muted hover:text-foreground mb-8 inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <FeatureHeader feature={feature} />
            <FeatureDetailsContent feature={feature} />
          </div>

          <div className="md:col-span-1">
            <SuggestedItemsSidebar
              currentStatus={feature.status as "todo" | "in-progress" | "done"}
              suggestedItems={suggestedItems}
            />
          </div>
        </div>
      </Container>
    </main>
  );
};

export default RoadmapDetailPage;
