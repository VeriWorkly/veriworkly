import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";

import {
  templateSummaries,
  getDocumentTypeSummary,
  getTemplatesByDocumentType,
  getTemplateByDocumentTypeAndId,
} from "@/config/templates";
import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { organizationRef, webSiteRef } from "@/utils/schema";
import { shareImageFor } from "@/features/templates/data/previewSizes";
import { buildPageMetadata, fitTitle } from "@/utils/metadata";

import { FRAME, PageSection, TYPE } from "@/components/marketing/PageLayout";

import TemplatePreview from "@/features/templates/TemplatePreview";
import TemplateCard, { templateGridClass } from "@/features/templates/TemplateCard";
import { buildEditorUrl, buildPreviewUrl } from "@/features/templates/utils";

const MORE_COUNT = 4;

const DETAIL_BLOCK = "border-border mt-10 border-t pt-8";

type PageProps = {
  params: Promise<{ docType: string; templateId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { docType, templateId } = await params;

  const template = getTemplateByDocumentTypeAndId(docType, templateId);

  if (!template) {
    return buildPageMetadata({
      path: `/templates/${docType}/${templateId}`,
      title: "Template Not Found | VeriWorkly",
      description: "This template does not exist or has been retired.",
      ogTitle: "Template Not Found",
      ogDescription: "This template does not exist or has been retired.",
      twitterTitle: "Template Not Found",
      twitterDescription: "This template does not exist or has been retired.",
      image: "/og/templates-page-og.png",
      noIndex: true,
    });
  }

  const templateTypeLabel = template.documentTypeLabel.toLowerCase();
  const shareImage = shareImageFor(template.previewImage);

  return buildPageMetadata({
    path: `/templates/${docType}/${templateId}`,
    title: fitTitle(
      `${template.name} ${template.documentTypeLabel} Template`,
      siteConfig.shortName,
    ),
    description: template.seo.description,
    ogTitle: template.seo.title,
    ogDescription: template.shortDescription,
    twitterTitle: `${template.name} - ${template.documentTypeLabel} Template`,
    twitterDescription: template.shortDescription,
    image: shareImage.url,
    imageAlt: `${template.name} ${templateTypeLabel} template preview`,
    imageWidth: shareImage.width,
    imageHeight: shareImage.height,
    keywords: [template.name, ...template.tags, `${template.documentTypeLabel} template`],
  });
}

export function generateStaticParams() {
  return templateSummaries.map((template) => ({
    docType: template.documentType,
    templateId: template.id,
  }));
}

export const dynamicParams = false;

const TemplateDetailPage = async ({ params }: PageProps) => {
  const { docType, templateId } = await params;

  const docTypeData = getDocumentTypeSummary(docType);
  const template = getTemplateByDocumentTypeAndId(docType, templateId);

  if (!docTypeData || !template) notFound();

  const editorUrl = buildEditorUrl(template);
  const moreTemplates = getTemplatesByDocumentType(docType)
    .filter((other) => other.id !== template.id)
    .slice(0, MORE_COUNT);
  const previewUrl = buildPreviewUrl(template);
  const isPortfolioTemplate = template.documentType === "portfolio-website";
  const designPrinciples = isPortfolioTemplate
    ? [
        "The template behaves like a real public website rather than a static document preview.",
        "The same portfolio profile can move between website templates without losing content.",
        "The hierarchy is tuned for proof first: opening claim, project scan, and clear contact path.",
      ]
    : [
        "The template is designed around the first human scan before decorative detail.",
        "Spacing and hierarchy keep exported pages readable, credible, and easy to compare.",
        "The system balances visual distinction with safe structure for the document type.",
      ];
  const implementationNotes = isPortfolioTemplate
    ? [
        "Supports public VeriWorkly subdomain publishing.",
        "Works with portfolio metadata controls for title, description, and sharing.",
        "Uses the same portfolio content model as other website templates, so switching does not erase content.",
      ]
    : [
        "Exports from the document editor using production template assets.",
        "Keeps typography and spacing consistent with the selected document family.",
        "Uses editor-ready content regions rather than flat image-only previews.",
      ];

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
      {
        "@type": "ListItem",
        position: 4,
        name: template.name,
        item: `${siteConfig.url}/templates/${docType}/${templateId}`,
      },
    ],
  };

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${template.name} ${template.documentTypeLabel} Template`,
    description: template.seo.description,
    url: `${siteConfig.url}/templates/${docType}/${templateId}`,
    creator: organizationRef,
    isPartOf: webSiteRef,
    image: `${siteConfig.url}${template.previewImage}`,
    audience: { "@type": "Audience", audienceType: template.audience.join(", ") },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(creativeWorkSchema)}
      />

      <article className="border-border border-b pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className={FRAME}>
          <Link
            href={`/templates/${template.documentType}`}
            className="text-muted hover:text-foreground group focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-full text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-translate-x-1"
            />
            All {template.documentTypeLabel.toLowerCase()} templates
          </Link>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <figure className="lg:sticky lg:top-28">
              <div
                className={`bg-card flex items-center justify-center rounded-3xl ${
                  isPortfolioTemplate ? "p-3 sm:p-5" : "px-6 py-6 sm:px-14 sm:py-12"
                }`}
              >
                <TemplatePreview
                  loading="lcp"
                  template={template}
                  sizes={
                    isPortfolioTemplate
                      ? "(min-width: 1180px) 560px, (min-width: 1024px) 46vw, 92vw"
                      : "(min-width: 640px) 448px, 208px"
                  }
                  className={isPortfolioTemplate ? "w-full" : "w-full max-w-52 sm:max-w-md"}
                />
              </div>
              <figcaption className="text-muted mt-3 text-center text-sm">
                {isPortfolioTemplate
                  ? "Screenshot of the live template. Open the live preview for the whole page."
                  : "Preview of the template layout. The studio renders the final file."}
              </figcaption>
            </figure>

            <div className="min-w-0">
              <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: template.accentColor }}
                />
                {/* "Portfolio Website · Portfolio Websites" says one thing twice. */}
                {[template.documentTypeLabel, template.family, template.layout]
                  .filter((part, index, parts) => index === 0 || !part.startsWith(parts[0] ?? ""))
                  .join(" · ")}
              </p>

              <h1 className={`mt-4 text-balance ${TYPE.section}`}>{template.name}</h1>
              <p className={`text-muted mt-5 text-pretty ${TYPE.lede}`}>{template.description}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={editorUrl}
                  rel={isPortfolioTemplate ? undefined : "nofollow"}
                  className="group bg-foreground text-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent/40 inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
                >
                  {isPortfolioTemplate ? "View in the Portfolio app" : "Use this template"}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    className="border-border hover:bg-card focus-visible:ring-accent/40 inline-flex h-12 items-center gap-2 rounded-full border px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
                  >
                    Open live preview
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                )}
              </div>

              <section className={DETAIL_BLOCK}>
                <h2 className={TYPE.title}>Why this one works</h2>
                <p className="text-muted mt-3 text-base leading-7 text-pretty">
                  {template.designVision}
                </p>
                <ul className="mt-5 space-y-3 text-base leading-7">
                  {template.proofPoints.map((point) => (
                    <li key={point} className="flex gap-3">
                      <Check className="text-accent mt-1.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={DETAIL_BLOCK}>
                <h2 className={TYPE.title}>Who it&apos;s for</h2>
                <ul aria-label="Audience" className="mt-4 flex flex-wrap gap-2">
                  {template.audience.map((who) => (
                    <li key={who} className="bg-card rounded-full px-3 py-1 text-sm">
                      {who}
                    </li>
                  ))}
                </ul>
                <ul className="mt-5 space-y-3 text-base leading-7">
                  {template.bestFor.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check className="text-accent mt-1.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={DETAIL_BLOCK}>
                <h2 className={TYPE.title}>Section by section</h2>
                <ol className="mt-5 space-y-6">
                  {template.structure.map((section) => (
                    <li key={section.title}>
                      <h3 className="text-base font-semibold">{section.title}</h3>
                      <p className="text-muted mt-1 text-base leading-7 text-pretty">
                        {section.description}
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {section.items.map((item) => (
                          <li key={item} className="bg-card rounded-full px-3 py-1 text-sm">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={DETAIL_BLOCK}>
                <h2 className={TYPE.title}>How it&apos;s built</h2>
                <dl className="mt-5 space-y-6">
                  {[
                    { title: "Typography", items: template.typography },
                    { title: "Design rules", items: designPrinciples },
                    { title: "Behaviour", items: implementationNotes },
                  ].map((group) => (
                    <div key={group.title}>
                      <dt className="text-base font-semibold">{group.title}</dt>
                      <dd>
                        <ul className="text-muted mt-2 list-disc space-y-1.5 pl-5 text-base leading-7 marker:text-current/40">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </article>

      {moreTemplates.length > 0 && (
        <PageSection
          tone="card"
          title={`More ${template.documentTypeLabel.toLowerCase()} templates.`}
          lede="Your content moves between templates, so trying another one costs nothing."
        >
          <ul className={templateGridClass(isPortfolioTemplate)}>
            {moreTemplates.map((other) => (
              <li key={other.id}>
                <TemplateCard template={other} heading="h3" />
              </li>
            ))}
          </ul>
          <Link
            href={`/templates/${template.documentType}`}
            className="text-accent group mt-10 inline-flex items-center gap-2 text-base font-semibold underline-offset-4 hover:underline"
          >
            See all {template.documentTypeLabel.toLowerCase()} templates
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </PageSection>
      )}
    </>
  );
};

export default TemplateDetailPage;
