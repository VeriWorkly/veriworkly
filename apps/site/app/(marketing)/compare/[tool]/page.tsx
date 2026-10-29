import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { COMPETITORS, PRICES_CHECKED, getCompetitor } from "@/features/compare/data/competitors";
import CompareClosing from "@/features/compare/components/shared/CompareClosing";
import CompareHighlights from "@/features/compare/components/detail/CompareHighlights";
import CompareScoreboard from "@/features/compare/components/shared/CompareScoreboard";
import CompareFAQSection from "@/features/compare/components/shared/CompareFAQSection";
import FeatureMatrixTable from "@/features/compare/components/shared/FeatureMatrixTable";
import ComparePricingSection from "@/features/compare/components/detail/ComparePricingSection";
import CompareDeepDiveSection from "@/features/compare/components/detail/CompareDeepDiveSection";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { appRef, webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";
import { compareDescription, compareTitle } from "@/features/compare/data/metadata";

import { LandingButton } from "@/components/marketing/LandingButton";
import { PageHero, PageSection } from "@/components/marketing/PageLayout";
import { ogPageImage } from "@/features/og/cards";

interface PageProps {
  params: Promise<{ tool: string }>;
}

export function generateStaticParams() {
  return COMPETITORS.map((competitor) => ({ tool: competitor.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tool } = await params;
  // dynamicParams = false: only generateStaticParams ids reach this.
  const competitor = getCompetitor(tool)!;

  const ogImage = ogPageImage(`compare:${competitor.id}`);

  return buildPageMetadata({
    path: `/compare/${competitor.id}`,

    title: compareTitle(competitor.name),
    description: compareDescription(competitor.name),

    ogTitle: `VeriWorkly vs ${competitor.name}: Features & Pricing Compared`,
    ogDescription: competitor.verdict,

    twitterTitle: `VeriWorkly vs ${competitor.name}`,
    twitterDescription: competitor.pricingSummary,

    image: ogImage,
    imageAlt: `VeriWorkly vs ${competitor.name}`,

    keywords: [
      `VeriWorkly vs ${competitor.name}`,
      `${competitor.name} alternative`,
      `${competitor.name} vs VeriWorkly`,
      `free ${competitor.name} alternative`,
      `${competitor.name} pricing comparison`,
      `${competitor.name} ATS checker alternative`,
      "free resume builder no watermark",
      // The year the comparison was last checked, not the build year, so it cannot claim a year nobody checked.
      `best resume builder ${PRICES_CHECKED.year}`,
    ],
  });
}

const CompareToolPage = async ({ params }: PageProps) => {
  const { tool } = await params;

  const competitor = getCompetitor(tool);

  if (!competitor) notFound();

  const pageUrl = `${siteConfig.url}/compare/${competitor.id}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${siteConfig.url}/compare` },
      {
        "@type": "ListItem",
        position: 3,
        name: `VeriWorkly vs ${competitor.name}`,
        item: pageUrl,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `VeriWorkly vs ${competitor.name} Comparison`,
    description: competitor.verdict,
    url: pageUrl,
    isPartOf: webSiteRef,
    mainEntity: appRef,
  };

  const faqSchema =
    competitor.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: competitor.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  const otherCompetitors = COMPETITORS.filter((c) => c.id !== competitor.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(softwareAppSchema)}
      />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(faqSchema)} />
      )}

      <PageHero
        before={
          <Link
            href="/compare"
            className="group text-muted hover:text-foreground focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-full text-base font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-translate-x-1"
            />
            All comparisons
          </Link>
        }
        title="VeriWorkly"
        highlight={`vs ${competitor.name}.`}
        lede={competitor.positioning}
        aside={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
              Start building free
            </LandingButton>
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-muted hover:text-foreground focus-visible:ring-accent/40 inline-flex h-12 items-center gap-2 rounded-full px-2 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
            >
              Visit {competitor.name}
              <ExternalLink
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        }
      >
        <CompareScoreboard competitor={competitor} />
      </PageHero>

      <CompareHighlights competitor={competitor} />
      <CompareDeepDiveSection competitor={competitor} />

      <PageSection
        id="features"
        tone="card"
        title="Feature by feature."
        lede="Account access, downloads, ATS scoring and portfolio tools, row by row."
      >
        <FeatureMatrixTable competitor={competitor} />
      </PageSection>

      <ComparePricingSection competitor={competitor} />
      <CompareFAQSection competitor={competitor} />

      <CompareClosing
        title={`Switching from ${competitor.name}? Try it free.`}
        others={otherCompetitors}
      />
    </>
  );
};

export default CompareToolPage;
