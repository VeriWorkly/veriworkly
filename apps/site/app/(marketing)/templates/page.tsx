import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";
import { documentTypeSummaries, templateSummaries } from "@/config/templates";

import { LandingButton } from "@/components/marketing/LandingButton";
import { PageHero, PageSection, TYPE, PageClosing } from "@/components/marketing/PageLayout";

import TemplatePreview from "@/features/templates/TemplatePreview";
import { getTemplateHref, templatesHeading } from "@/features/templates/utils";

export const metadata: Metadata = buildPageMetadata({
  path: "/templates",
  title: `AI Resume, Cover Letter & Portfolio Templates | ${siteConfig.shortName}`,
  description:
    "Browse ATS-friendly AI resume templates, cover letters, and portfolio website designs. Compare layouts and customize them with AI copywriting.",
  ogTitle: "Pick the Artifact. The Right Layout Follows.",
  ogDescription:
    "Real previews, fit signals, and the exact editor path for every resume, cover letter, and portfolio template we ship.",
  twitterTitle: "Document Template Directory | VeriWorkly",
  twitterDescription:
    "Resume, cover letter, and portfolio website templates, organized by type, with AI copywriting built in.",
  image: "/og/templates-page-og.png",
  imageAlt: "VeriWorkly template directory",
  keywords: [
    "AI resume templates",
    "AI cover letter templates",
    "AI portfolio templates",
    "ATS resume templates",
    "professional document templates",
  ],
});

/** If a type is ever missing from the catalog, the wall shows the ones that exist rather than a gap. */
const HERO_TYPES = ["resume", "cover-letter", "portfolio-website"] as const;

const heroWall = HERO_TYPES.map((type) =>
  templateSummaries.find((template) => template.documentType === type),
).filter((template): template is (typeof templateSummaries)[number] => Boolean(template));

const BAND_LIMIT = { documents: 4, portfolios: 2 } as const;

const previewLinkClass =
  "group focus-visible:ring-accent/40 block rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none";

const countOf = (documentType: string) =>
  templateSummaries.filter((template) => template.documentType === documentType).length;

const TemplatesPortalPage = () => {
  const availableDocTypes = documentTypeSummaries.filter(
    (docType) => docType.status === "available",
  );
  const plannedDocTypes = documentTypeSummaries.filter((docType) => docType.status === "planned");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Templates", item: `${siteConfig.url}/templates` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "VeriWorkly Template Directory",
    itemListElement: templateSummaries.map((template, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: template.name,
      url: `${siteConfig.url}/templates/${template.documentType}/${template.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(itemListSchema)}
      />

      <PageHero
        title="Templates,"
        highlight="seen first."
        lede={`VeriWorkly has ${templateSummaries.length} templates (2 premium):${countOf("resume")} resumes, ${countOf("cover-letter")} cover letters and ${countOf("portfolio-website")} portfolio websites. Each preview shows the layout; the studio fills it from your profile and exports it free.`}
        aside={
          <>
            <dl className="mb-6 grid grid-cols-3 gap-4">
              {[
                { value: templateSummaries.length, label: "templates" },
                { value: availableDocTypes.length, label: "document types" },
                { value: plannedDocTypes.length, label: "coming soon" },
              ].map((figure) => (
                <div key={figure.label} className="flex flex-col-reverse">
                  <dt className="text-muted mt-1 text-sm">{figure.label}</dt>
                  <dd className={TYPE.figure}>{figure.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3">
              <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
                Start building free
              </LandingButton>
              <LandingButton size="lg" variant="outline" href="/features">
                See all features
              </LandingButton>
            </div>
          </>
        }
      >
        <ul className="grid grid-cols-2 items-end gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-[0.77fr_0.77fr_2.03fr]">
          {heroWall.map((template, index) => {
            const isPortfolio = template.documentType === "portfolio-website";

            return (
              <li key={template.id} className={isPortfolio ? "col-span-2 lg:col-span-1" : ""}>
                <Link href={getTemplateHref(template)} className={previewLinkClass}>
                  <TemplatePreview
                    loading={index === 0 ? "lcp" : "eager"}
                    template={template}
                    sizes={
                      isPortfolio
                        ? "(min-width: 1024px) 640px, 92vw"
                        : "(min-width: 1024px) 250px, 46vw"
                    }
                    className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
                  />
                  <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 text-base">
                    <span className="group-hover:text-accent font-semibold transition-colors duration-200">
                      {template.name}
                    </span>
                    <span className="text-muted">{template.documentTypeLabel}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </PageHero>

      {availableDocTypes.map((docType, index) => {
        const templatesForType = templateSummaries.filter(
          (template) => template.documentType === docType.id,
        );
        const isPortfolio = docType.id === "portfolio-website";
        const shown = templatesForType.slice(
          0,
          isPortfolio ? BAND_LIMIT.portfolios : BAND_LIMIT.documents,
        );

        return (
          <PageSection
            key={docType.id}
            id={docType.id}
            tone={index % 2 === 0 ? "card" : "plain"}
            title={templatesHeading(docType.label)}
            lede={docType.description}
          >
            <ul
              className={
                isPortfolio
                  ? "grid gap-x-6 gap-y-10 md:grid-cols-2"
                  : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4"
              }
            >
              {shown.map((template) => (
                <li key={template.id} className="reveal">
                  <Link href={getTemplateHref(template)} className={previewLinkClass}>
                    <TemplatePreview
                      template={template}
                      sizes={
                        isPortfolio
                          ? "(min-width: 768px) 570px, 92vw"
                          : "(min-width: 1024px) 280px, 46vw"
                      }
                      className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
                    />
                    <h3 className="group-hover:text-accent mt-4 text-xl font-bold tracking-tight transition-colors duration-200">
                      {template.name}
                    </h3>
                    <p className="text-muted mt-1 text-base">{template.family}</p>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <ul aria-label="Built for" className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                {docType.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2">
                    <Check aria-hidden="true" className="text-accent size-4 shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>

              <Link
                href={docType.href}
                className="group bg-foreground text-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent/40 inline-flex h-12 w-fit shrink-0 items-center gap-2 rounded-full px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
              >
                All {templatesForType.length} {docType.label.toLowerCase()} templates
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </PageSection>
        );
      })}

      {plannedDocTypes.length > 0 && (
        <PageSection
          tone={availableDocTypes.length % 2 === 0 ? "card" : "plain"}
          title="Coming next."
          lede="These document types are planned. They will ship the same way: real previews and a direct path into the editor."
        >
          <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
            {plannedDocTypes.map((docType) => (
              <li key={docType.id} className="reveal border-border border-t pt-6">
                <h3 className={TYPE.title}>{templatesHeading(docType.label)}</h3>
                <p className="text-muted mt-3 max-w-lg text-base leading-7 text-pretty">
                  {docType.description}
                </p>
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      <PageClosing
        title="Pick one. Change it later."
        lede="Your content moves between templates, so trying another one costs nothing."
        secondary={{ label: "See how it works", href: "/how-it-works" }}
      />
    </>
  );
};

export default TemplatesPortalPage;
