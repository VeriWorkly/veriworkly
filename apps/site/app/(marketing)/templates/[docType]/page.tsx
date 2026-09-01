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

import { Container } from "@veriworkly/ui";

import TemplateExplorer from "@/features/templates/TemplateExplorer";
import TemplatesHeader from "@/features/templates/TemplatesHeader";

type PageProps = {
  params: Promise<{ docType: string }>;
};

/**
 * Every path is known at build time and unknown document types 404, so there is nothing
 * to render on demand.
 */
export const dynamicParams = false;

const FAMILY_DESCRIPTIONS: Record<string, string> = {
  "Portfolio Websites":
    "Live portfolio website templates that publish from one reusable profile and can be previewed before building.",
  "Compact Core":
    "High-density layouts for applications where parsing, keywords, and page control matter.",
  "Modern Core": "Polished application layouts with contemporary spacing and calm hierarchy.",
  "Classic Letter": "Formal letter systems for conservative, high-trust application moments.",
  "Branded Letter":
    "Distinctive letter systems for modern applicants who still need a credible PDF.",
};

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

      <Container className="space-y-10 pt-28 pb-16 lg:pt-36">
        <Link
          href="/templates"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All templates
        </Link>

        <div className="space-y-14">
          <TemplatesHeader docType={docTypeData} templates={templates} />

          <TemplateExplorer
            docTypeLabel={docTypeData.label}
            templates={templates}
            familyDescriptions={FAMILY_DESCRIPTIONS}
          />
        </div>
      </Container>
    </>
  );
};

export default TemplatesByDocumentTypePage;
