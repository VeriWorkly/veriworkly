import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  documentTypeSummaries,
  getTemplateByLegacyId,
  getDocumentTypeSummary,
  getTemplatesByDocumentType,
} from "@/config/templates";
import { siteConfig } from "@/config/site";

import { Container } from "@veriworkly/ui";

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

  const legacyTemplate = getTemplateByLegacyId(docType);
  if (legacyTemplate) permanentRedirect(getTemplateHref(legacyTemplate));

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
    <Container className="space-y-14 pt-28 pb-16 lg:pt-36">
      <TemplatesHeader
        docType={docTypeData}
        templates={templates}
        selectedFamily={selectedFamily}
        selectedLayout={selectedLayout}
      />

      <section
        className="border-border bg-card/65 overflow-hidden rounded-2xl border"
        aria-label={`${docTypeData.label} template quick comparison`}
      >
        <div className="bg-border grid gap-px lg:grid-cols-2">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={getTemplateHref(template)}
              className="group bg-card hover:bg-background/70 focus-visible:ring-accent p-5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    {template.family}
                  </p>

                  <h2 className="text-foreground text-xl font-semibold tracking-tight">
                    {template.name}
                  </h2>

                  <p className="text-muted line-clamp-2 text-sm leading-6">
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
                    className="border-border bg-background text-muted rounded-full border px-3 py-1 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {visibleTemplates.length ? (
        <div className="space-y-12">
          {familyGroups.map(
            (group) => group.items.length > 0 && <TemplateGroup key={group.title} group={group} />,
          )}
        </div>
      ) : (
        <EmptyState resetHref={`/templates/${docType}`} />
      )}
    </Container>
  );
};

export default TemplatesByDocumentTypePage;
