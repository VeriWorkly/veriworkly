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
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { FRAME, PageHero, TYPE } from "@/components/marketing/PageLayout";

import TemplateExplorer from "@/features/templates/TemplateExplorer";
import { toCardData } from "@/features/templates/cardFields";
import { templatesHeading } from "@/features/templates/utils";

type PageProps = {
  params: Promise<{ docType: string }>;
};

/**
 * Every path is known at build time and unknown document types 404, so there is nothing
 * to render on demand.
 */
export const dynamicParams = false;

const sentenceCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { docType } = await params;

  const docTypeData = getDocumentTypeSummary(docType);

  if (!docTypeData || docTypeData.status !== "available") {
    return buildPageMetadata({
      path: `/templates/${docType}`,
      title: "Templates Not Found | VeriWorkly",
      description: "This document type is not available on VeriWorkly yet.",
      ogTitle: "Templates Not Found",
      ogDescription: "This document type is not available on VeriWorkly yet.",
      twitterTitle: "Templates Not Found",
      twitterDescription: "This document type is not available on VeriWorkly yet.",
      image: "/og/templates-page-og.png",
      noIndex: true,
    });
  }

  const ogImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
    docTypeData.pluralLabel,
  )}&description=${encodeURIComponent(docTypeData.description)}`;

  return buildPageMetadata({
    path: `/templates/${docType}`,
    title: docTypeData.seoTitle,
    description: docTypeData.seoDescription,
    ogTitle: `${docTypeData.pluralLabel} - Compare Layouts Side by Side`,
    ogDescription: docTypeData.description,
    twitterTitle: `${docTypeData.pluralLabel}: Free & AI-Ready`,
    twitterDescription: docTypeData.seoDescription,
    image: ogImage,
    imageAlt: `${docTypeData.pluralLabel} preview`,
    keywords: [...docTypeData.highlights, docTypeData.label, `${docTypeData.label} templates`],
  });
}

export function generateStaticParams() {
  return documentTypeSummaries
    .filter((docType) => docType.status === "available")
    .map((docType) => ({ docType: docType.id }));
}

const TemplatesByDocumentTypePage = async ({ params }: PageProps) => {
  const { docType } = await params;

  const docTypeData = getDocumentTypeSummary(docType);
  if (!docTypeData || docTypeData.status !== "available") notFound();

  const templates = getTemplatesByDocumentType(docType);
  const families = Array.from(new Set(templates.map((template) => template.family)));
  const layouts = Array.from(new Set(templates.map((template) => template.layout)));

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Templates", item: `${siteConfig.url}/templates` },
      {
        "@type": "ListItem",
        position: 3,
        name: docTypeData.pluralLabel,
        item: `${siteConfig.url}/templates/${docType}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <PageHero
        before={
          <Link
            href="/templates"
            className="text-muted hover:text-foreground group focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-full text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-translate-x-1"
            />
            All templates
          </Link>
        }
        // "Portfolio Website templates." runs to three lines at display size; the type
        // name alone ("Portfolio") says the same thing.
        title={sentenceCase(docTypeData.label.replace(/ website$/i, ""))}
        highlight="templates."
        lede={`${docTypeData.description} Previews show the layout; the studio renders the final file.`}
        aside={
          <dl className="grid grid-cols-3 gap-4">
            {[
              { value: templates.length, label: "ready to use" },
              {
                value: families.length,
                label: families.length === 1 ? "style system" : "style systems",
              },
              {
                value: layouts.length,
                label: layouts.length === 1 ? "layout mode" : "layout modes",
              },
            ]
              // A figure of one is not a choice; "1 style system" tells the visitor nothing.
              .filter((figure, index) => index === 0 || figure.value > 1)
              .map((figure) => (
                <div key={figure.label} className="flex flex-col-reverse">
                  <dt className="text-muted mt-1 text-sm">{figure.label}</dt>
                  <dd className={TYPE.figure}>{figure.value}</dd>
                </div>
              ))}
          </dl>
        }
      />

      <section aria-label={`${docTypeData.pluralLabel}`} className="py-14 lg:py-20">
        <div className={FRAME}>
          <TemplateExplorer
            templates={templates.map(toCardData)}
            noun={templatesHeading(docTypeData.label).toLowerCase()}
          />
        </div>
      </section>
    </>
  );
};

export default TemplatesByDocumentTypePage;
