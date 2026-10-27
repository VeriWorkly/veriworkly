import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { PageHero } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import {
  COMPETITORS,
  CompareClosing,
  CompetitorList,
  CompareHubPicker,
  CompareQuickMatrix,
  CompareDifferences,
  PRICING_VERIFIED_AT,
} from "@/features/compare";
import { ogPageImage } from "@/features/og/cards";

const pageUrl = `${siteConfig.url}/compare`;

const ogImage = ogPageImage("compare");

export const metadata: Metadata = buildPageMetadata({
  path: "/compare",

  title: `Compare Resume Builders: Pricing & Features | ${siteConfig.shortName}`,
  description:
    "VeriWorkly against Rezi, Teal, Kickresume, Novoresume, Zety and Enhancv: real pricing, ATS accuracy, download limits and account requirements.",

  ogTitle: "Compare VeriWorkly to Other Resume Builders",
  ogDescription:
    "Honest feature-by-feature comparisons: pricing, ATS keyword matching, download limits, and sign-up requirements.",

  twitterTitle: "VeriWorkly vs Other Resume Builders",
  twitterDescription:
    "Honest comparisons: real pricing, ATS checks, free downloads, and no account barriers.",

  image: ogImage,
  imageAlt: `${siteConfig.shortName} | Compare Resume Builders`,

  keywords: [
    "VeriWorkly vs Rezi",
    "VeriWorkly vs Teal",
    "VeriWorkly vs Kickresume",
    "VeriWorkly vs Novoresume",
    "VeriWorkly vs Zety",
    "VeriWorkly vs Enhancv",
    "best free resume builder",
    "free resume builder no watermark",
    "ATS resume checker comparison",
    "free resume builder no login",
  ],
});

const ComparePage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Compare", item: pageUrl },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Compare VeriWorkly to Other Resume Builders | ${siteConfig.shortName}`,
    description:
      "Direct comparisons of VeriWorkly vs leading resume builders including pricing, ATS checks, and download policies.",
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: COMPETITORS.map((competitor, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `VeriWorkly vs ${competitor.name}`,
        url: `${pageUrl}/${competitor.id}`,
        description: competitor.positioning,
      })),
    },
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
        title="Six builders,"
        highlight="side by side."
        lede={
          <>
            VeriWorkly is a free, open-source resume builder. This page compares it on real prices,
            download limits, ATS checks and sign-up rules with{" "}
            {new Intl.ListFormat("en", { type: "conjunction" }).format(
              COMPETITORS.map((competitor) => competitor.name),
            )}
            , checked against each provider&apos;s own pages in {PRICING_VERIFIED_AT}.
          </>
        }
        aside={
          <div className="flex flex-wrap gap-3">
            <LandingButton showArrow size="lg" variant="solid" href={siteConfig.links.app}>
              Start building free
            </LandingButton>
            <LandingButton size="lg" variant="outline" href="#table">
              See the full table
            </LandingButton>
          </div>
        }
      >
        <CompareHubPicker />
      </PageHero>

      <CompareDifferences />
      <CompetitorList />
      <CompareQuickMatrix />
      <CompareClosing title="Try it before you sign up anywhere." />
    </>
  );
};

export default ComparePage;
