import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  StepSections,
  WORKFLOW_STEPS,
  HowItWorksHero,
  ArchitectureAndDocsSection,
} from "@/features/how-it-works";
import { PageClosing } from "@/components/marketing/PageLayout";
import { ogPageImage } from "@/features/og/cards";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/how-it-works`;
const pageOgImage = ogPageImage("how-it-works");

export const metadata: Metadata = buildPageMetadata({
  path: "/how-it-works",

  title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
  description:
    "How local-first browser storage, Master Profile sandboxes, AI bullet rewrites, ATS matching, and custom subdomain portfolios work together.",

  ogTitle: "Five Steps From Career DNA to Dream Job",
  ogDescription:
    "Local browser storage, Master Profile ingestion from GitHub and LinkedIn, AI bullet tailoring, ATS scanning, and multi-format exports.",

  twitterTitle: "Privacy and precision, explained in five steps",
  twitterDescription:
    "See how VeriWorkly keeps your resume data local-first while letting AI optimize your bullets against target job postings.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Platform Architecture",

  keywords: [
    "how VeriWorkly works",
    "local-first resume builder",
    "AI credit system",
    "privacy-first AI architecture",
    "master profile sync",
    "github resume import",
    "linkedin data import",
  ],
});

const HowItWorksPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "How It Works", item: pageUrl },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How VeriWorkly's Local-First Career Workspace Works",
    description:
      "Step-by-step overview of career data ingestion from GitHub and LinkedIn, local-first document editing, ATS matching, AI diff rewriting, and custom subdomain web portfolios.",
    url: pageUrl,
    step: WORKFLOW_STEPS.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)} />

      <HowItWorksHero />
      <StepSections />
      <ArchitectureAndDocsSection />
      <PageClosing
        title="Five steps. Start with one."
        lede="Open the studio, import your history or start typing, and export when it reads right."
      />
    </>
  );
};

export default HowItWorksPage;
