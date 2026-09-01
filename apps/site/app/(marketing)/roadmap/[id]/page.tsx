import type { Metadata } from "next";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";
import { Container, Badge } from "@veriworkly/ui";

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

  if (!item) {
    return buildPageMetadata({
      path: `/roadmap/${id}`,
      title: "Roadmap Item Not Found | VeriWorkly",
      description: "This roadmap item does not exist or has been archived.",
      ogTitle: "Roadmap Item Not Found",
      ogDescription: "This roadmap item does not exist or has been archived.",
      twitterTitle: "Roadmap Item Not Found",
      twitterDescription: "This roadmap item does not exist or has been archived.",
      image: "/og/roadmap-page-og.png",
      noIndex: true,
    });
  }

  const ogUrl = new URL("/api/og", siteConfig.url);
  ogUrl.searchParams.set("title", item.title);

  if (item.description) {
    ogUrl.searchParams.set("description", item.description);
  } else {
    ogUrl.searchParams.set("showDesc", "false");
  }

  const metadataDescription =
    item.description ||
    `Track progress, updates, and release details for ${item.title} in the VeriWorkly platform roadmap.`;

  return buildPageMetadata({
    path: `/roadmap/${id}`,
    title: `${item.title} | Platform Roadmap`,
    description: metadataDescription,
    ogTitle: `${item.title} | VeriWorkly Roadmap`,
    ogDescription: metadataDescription,
    twitterTitle: `${item.title} - VeriWorkly Roadmap`,
    twitterDescription: metadataDescription,
    image: ogUrl.toString(),
    imageAlt: `${item.title} Roadmap Feature`,
    type: "article",
  });
}

const statusColors = {
  todo: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  "in-progress": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

const statusLabels = {
  todo: "Planned",
  "in-progress": "In Progress",
  done: "Released",
};

const RoadmapDetailPage = async ({ params }: RoadmapDetailPageProps) => {
  const { id } = await params;

  const feature = await fetchRoadmapFeatureById(id);

  if (!feature) {
    notFound();
  }

  const suggestedItems = await fetchSuggestedRoadmapItems(feature);
  const currentStatus = feature.status as "todo" | "in-progress" | "done";

  const steps = [
    { key: "todo", label: "Planned" },
    { key: "in-progress", label: "In Progress" },
    { key: "done", label: "Released" },
  ];
  const activeIndex = steps.findIndex((step) => step.key === currentStatus);

  const itemUrl = `${siteConfig.url}/roadmap/${feature.id}`;
  const statusFilterSlug = { todo: "todo", "in-progress": "in-progress", done: "done" }[
    currentStatus
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Roadmap", item: `${siteConfig.url}/roadmap` },
      {
        "@type": "ListItem",
        position: 3,
        name: statusLabels[currentStatus],
        item: `${siteConfig.url}/roadmap/${statusFilterSlug}`,
      },
      { "@type": "ListItem", position: 4, name: feature.title, item: itemUrl },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: feature.title,
    description: feature.description,
    url: itemUrl,
    datePublished: feature.createdAt,
    dateModified: feature.completedAt || feature.updatedAt,
    author: { "@type": "Organization", name: "VeriWorkly", url: siteConfig.url },
    publisher: { "@type": "Organization", name: "VeriWorkly", url: siteConfig.url },
    keywords: (feature.tags ?? []).join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": itemUrl },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(articleSchema)}
      />

      <div className="min-h-screen pt-28 pb-20 lg:pt-36">
        <Container>
          <div className="grid gap-12 lg:grid-cols-4 lg:gap-16">
            <aside className="h-fit space-y-8 lg:sticky lg:top-24 lg:col-span-1">
              <Link
                href="/roadmap"
                className="text-muted hover:text-foreground group inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-all duration-300"
              >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />{" "}
                Back to Roadmap
              </Link>

              <div className="border-border/40 bg-card/30 space-y-6 rounded-3xl border p-6">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
                    Status
                  </span>

                  <Badge
                    className={`${statusColors[currentStatus]} px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase`}
                  >
                    {statusLabels[currentStatus]}
                  </Badge>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
                    Progress
                  </span>

                  <div className="relative flex items-center justify-between">
                    <div className="bg-border/40 absolute top-1.5 right-0 left-0 h-0.5" />

                    <div
                      className="absolute top-1.5 left-0 h-0.5 transition-all duration-500"
                      style={{
                        width: `${(activeIndex / (steps.length - 1)) * 100}%`,
                        backgroundColor:
                          currentStatus === "todo"
                            ? "#3b82f6"
                            : currentStatus === "in-progress"
                              ? "#f59e0b"
                              : "#10b981",
                      }}
                    />

                    {steps.map((step, idx) => {
                      const isCompleted = idx < activeIndex;
                      const isActive = idx === activeIndex;

                      return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`size-3 rounded-full border-2 transition-all duration-300 ${
                              isCompleted
                                ? "border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400"
                                : isActive
                                  ? currentStatus === "todo"
                                    ? "border-blue-500 bg-blue-500"
                                    : currentStatus === "in-progress"
                                      ? "border-amber-500 bg-amber-500"
                                      : "border-emerald-500 bg-emerald-500"
                                  : "bg-background border-border"
                            }`}
                          />

                          <span
                            className={`mt-2 font-mono text-[9px] font-semibold ${
                              isActive ? "text-foreground font-bold" : "text-muted"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-border/40 h-px" />

                <div className="space-y-4 pt-2">
                  <span className="text-muted font-mono text-[10px] font-bold tracking-widest uppercase">
                    Key Dates
                  </span>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-muted">Target ETA</span>

                      <span className="text-foreground font-bold">
                        {feature.eta || feature.completedQuarter || "TBD"}
                      </span>
                    </div>

                    <div className="bg-border/20 h-px" />
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-muted">Created</span>

                      <span className="text-foreground font-bold">
                        {new Date(feature.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="bg-border/20 h-px" />

                    <div className="flex items-center justify-between font-mono">
                      <span className="text-muted">Started</span>

                      <span className="text-foreground font-bold">
                        {feature.startedAt
                          ? new Date(feature.startedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Planned"}
                      </span>
                    </div>

                    <div className="bg-border/20 h-px" />

                    <div className="flex items-center justify-between font-mono">
                      <span className="text-muted">Released</span>

                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {feature.completedAt
                          ? new Date(feature.completedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "In Queue"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initiative Owner Card */}
              <div className="border-border/40 bg-card/10 space-y-4 rounded-3xl border p-6">
                <span className="text-muted block font-mono text-[10px] font-bold tracking-widest uppercase">
                  Initiative Owner
                </span>
                <div className="flex items-center gap-3">
                  <div className="border-border bg-card rounded-full border p-1">
                    <Image
                      width={32}
                      height={32}
                      alt="VeriWorkly Logo"
                      src="/veriworkly-logo.png"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <p className="text-foreground text-sm leading-none font-bold">
                      VeriWorkly Team
                    </p>
                    <p className="text-muted mt-1 text-xs">Core Contributors</p>
                  </div>
                </div>
              </div>
            </aside>

            <div className="lg:col-span-3">
              <FeatureHeader feature={feature} />
              <FeatureDetailsContent feature={feature} />
            </div>
          </div>

          <SuggestedItemsSidebar
            currentStatus={feature.status as "todo" | "in-progress" | "done"}
            suggestedItems={suggestedItems}
          />
        </Container>
      </div>
    </>
  );
};

export default RoadmapDetailPage;
