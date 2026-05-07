import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { templateSummaries } from "@/config/templates";

import EmptyState from "./components/EmptyState";
import TemplateGroup from "./components/TemplateGroup";
import TemplatesHeader from "./components/TemplatesHeader";
import TemplatesSEOContent from "./components/TemplatesSEOContent";

import { getLayout, getSingleParam, familyByTemplateId } from "./components/utils";

export const metadata: Metadata = {
  title: `Free Resume Templates (ATS Friendly) `,

  description:
    "Browse free ATS-friendly resume templates. No login required. Choose from modern, professional, and simple resume designs and build your resume instantly.",

  keywords: [
    "resume templates",
    "free resume templates",
    "ATS resume templates",
    "professional resume formats",
    "modern resume templates",
    "resume builder templates",
  ],

  openGraph: {
    title: "Free Resume Templates (ATS Friendly) | VeriWorkly",
    description: "Explore modern and ATS-friendly resume templates. 100% free, no signup required.",
    url: `${siteConfig.url}/templates`,
    siteName: siteConfig.name,
    images: [
      {
        url: "/og/template-page-og.png",
        width: 1200,
        height: 630,
        alt: "Resume Templates Gallery - VeriWorkly",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Resume Templates | VeriWorkly",
    description: "Modern, ATS-friendly resume templates. Free & no login required.",
    images: ["/og/template-page-og.png"],
  },

  alternates: {
    canonical: `${siteConfig.url}/templates`,
  },
};

type PageProps = {
  searchParams?: Promise<{
    family?: string;
    layout?: string;
  }>;
};

const TemplatesPage = async ({ searchParams }: PageProps) => {
  const resolvedSearchParams = await searchParams;

  const selectedFamily = getSingleParam(resolvedSearchParams?.family, "All");
  const selectedLayout = getSingleParam(resolvedSearchParams?.layout, "All");

  const enrichedTemplates = templateSummaries.map((template) => ({
    ...template,
    family: familyByTemplateId[template.id] ?? "Compact Core",
    layout: getLayout(template.tags),
  }));

  const visibleTemplates = enrichedTemplates.filter((template) => {
    const familyMatch = selectedFamily === "All" || template.family === selectedFamily;
    const layoutMatch = selectedLayout === "All" || template.layout === selectedLayout;

    return familyMatch && layoutMatch;
  });

  const templateGroups = [
    {
      title: "Modern Core",
      items: visibleTemplates.filter((t) => t.family === "Modern Core"),
    },
    {
      title: "Compact Core",
      items: visibleTemplates.filter((t) => t.family === "Compact Core"),
    },
  ];

  return (
    <div className="space-y-12 py-10">
      <TemplatesHeader selectedFamily={selectedFamily} selectedLayout={selectedLayout} />

      {visibleTemplates.length ? (
        <div className="space-y-12">
          {templateGroups.map(
            (group) => group.items.length && <TemplateGroup key={group.title} group={group} />,
          )}
        </div>
      ) : (
        <EmptyState />
      )}

      <TemplatesSEOContent />
    </div>
  );
};

export default TemplatesPage;
