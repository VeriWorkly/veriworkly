import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { appRef, webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";

import {
  FeaturesHero,
  IngestionSection,
  AtsScannerSection,
  AiTailoringSection,
  StudioFeatureSection,
  FeaturesComparisonTable,
  PortfolioFeatureSection,
  PrivacyAndExportsSection,
} from "@/features/features";
import { PageClosing } from "@/components/marketing/PageLayout";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/features`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Platform Features & Career Tools",
)}&description=${encodeURIComponent(
  "AI resume tailoring, cover letter drafting, free ATS scoring, GitHub & LinkedIn imports, and web portfolios.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/features",

  title: `Platform Features: AI Resumes, ATS & Portfolios | ${siteConfig.shortName}`,
  description:
    "AI resume tailoring, an AI cover letter writer, a free ATS checker, GitHub and LinkedIn imports, six export formats and web portfolios, all local-first.",

  ogTitle: "Everything Inside the VeriWorkly Career Workspace",
  ogDescription:
    "AI resume tailoring, cover letter generation, a free ATS checker, GitHub and LinkedIn imports, and portfolio publishing, all local-first.",

  twitterTitle: "One workspace, every career tool",
  twitterDescription:
    "AI resume and cover letter tools, a free ATS checker, and portfolio publishing, private by default.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Platform Features",

  keywords: [
    "VeriWorkly features",
    "AI resume tailoring tool",
    "AI cover letter writer",
    "free ATS checker",
    "AI resume rewrite",
    "custom portfolio subdomains",
    "github resume import",
    "linkedin data import",
  ],
});

const FeaturesPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Features", item: pageUrl },
    ],
  };

  const featuresSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Platform Features",
    url: pageUrl,
    isPartOf: webSiteRef,
    about: appRef,
    description:
      "Comprehensive feature breakdown including document studio, AI tailoring, ATS checker, GitHub/LinkedIn import, web portfolios, and local-first privacy.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(featuresSchema)}
      />

      <FeaturesHero />
      <StudioFeatureSection />
      <AiTailoringSection />
      <IngestionSection />
      <AtsScannerSection />
      <PortfolioFeatureSection />
      <PrivacyAndExportsSection />
      <FeaturesComparisonTable />
      <PageClosing
        title="Try every tool on this page."
        lede="All of it runs in the same studio, with nothing to install and no account to start."
      />
    </>
  );
};

export default FeaturesPage;
