import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  documentTypeSummaries,
  getDocumentTypeSummary,
  getTemplatesByDocumentType,
} from "@/config/templates";
import { siteConfig } from "@/config/site";

import { Container } from "@veriworkly/ui";
import { Reveal } from "@/components/marketing/Reveal";

import EmptyState from "../components/EmptyState";
import TemplateGroup from "../components/TemplateGroup";
import TemplatesHeader from "../components/TemplatesHeader";
import { getSingleParam, getTemplateHref } from "../components/utils";

type PageProps = {
  params: Promise<{ docType: string }>;
  searchParams?: Promise<{
    family?: string;
    layout?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { docType } = await params;

  const docTypeData = getDocumentTypeSummary(docType);

  if (!docTypeData || docTypeData.status !== "available") {
    return {
      title: "Templates Not Found | VeriWorkly",
    };
  }

  return {
    title: docTypeData.seoTitle,
    description: docTypeData.seoDescription,
    alternates: {
      canonical: `${siteConfig.url}/templates/${docType}`,
    },
    openGraph: {
      title: docTypeData.seoTitle,
      description: docTypeData.seoDescription,
      url: `${siteConfig.url}/templates/${docType}`,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return documentTypeSummaries
    .filter((docType) => docType.status === "available")
    .map((docType) => ({ docType: docType.id }));
}

const TemplatesByDocumentTypePage = async ({ params, searchParams }: PageProps) => {
  const [{ docType }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const docTypeData = getDocumentTypeSummary(docType);
  if (!docTypeData || docTypeData.status !== "available") notFound();

  const templates = getTemplatesByDocumentType(docType);
  const selectedFamily = getSingleParam(resolvedSearchParams?.family, "All");
  const selectedLayout = getSingleParam(resolvedSearchParams?.layout, "All");

  const visibleTemplates = templates.filter((template) => {
    const familyMatch = selectedFamily === "All" || template.family === selectedFamily;
    const layoutMatch = selectedLayout === "All" || template.layout === selectedLayout;

    return familyMatch && layoutMatch;
  });

  const familyGroups = Array.from(new Set(templates.map((template) => template.family))).map(
    (family) => ({
      title: family,
      description:
        family === "Portfolio Websites"
          ? "Live portfolio website templates that publish from one reusable profile and can be previewed before building."
          : family === "Compact Core"
            ? "High-density layouts for applications where parsing, keywords, and page control matter."
            : family === "Modern Core"
              ? "Polished application layouts with contemporary spacing and calm hierarchy."
              : family === "Classic Letter"
                ? "Formal letter systems for conservative, high-trust application moments."
                : "Distinctive letter systems for modern applicants who still need a credible PDF.",
      items: visibleTemplates.filter((template) => template.family === family),
    }),
  );

  return (
    <Container className="space-y-10 pt-28 pb-16 lg:pt-36">
      <Link
        href="/templates"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All templates
      </Link>

      <div className="space-y-14">
        <TemplatesHeader
          docType={docTypeData}
          templates={templates}
          selectedFamily={selectedFamily}
          selectedLayout={selectedLayout}
        />

        <Reveal
          className="overflow-hidden rounded-4xl border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
          aria-label={`${docTypeData.label} template quick comparison`}
        >
          <div className="grid gap-px bg-zinc-200 lg:grid-cols-2 dark:bg-zinc-800">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={getTemplateHref(template)}
                className="group bg-white p-5 transition-colors hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-[#0c0c0c] dark:hover:bg-blue-500/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
                      {template.family}
                    </p>

                    <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                      {template.name}
                    </h2>

                    <p className="line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      {template.shortDescription}
                    </p>
                  </div>

                  <span
                    className="mt-1 h-3 w-12 shrink-0 rounded-full"
                    style={{ backgroundColor: template.accentColor }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[template.layout, ...template.audience.slice(0, 2)].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        {visibleTemplates.length ? (
          <div className="space-y-12">
            {familyGroups.map(
              (group) =>
                group.items.length > 0 && <TemplateGroup key={group.title} group={group} />,
            )}
          </div>
        ) : (
          <EmptyState resetHref={`/templates/${docType}`} />
        )}
      </div>
    </Container>
  );
};

export default TemplatesByDocumentTypePage;
