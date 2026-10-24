import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { appRef, organizationRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";

import {
  AtsHero,
  AtsScoreFacts,
  AtsCheckerFaq,
  TierComparison,
  AtsDirectAnswer,
  AtsFailureTraps,
  AtsCategoriesGrid,
  AtsPipelineSection,
} from "@/features/ats-checker";
import { faqs } from "@/features/faq/data/faqItems";
import { PageClosing } from "@/components/marketing/PageLayout";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/ats-checker`;
const scanUrl = `${pageUrl}/scan`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Free ATS Resume Checker",
)}&description=${encodeURIComponent(
  "Score your resume against a job description with our deterministic, rules-based engine.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ats-checker",
  title: `Free ATS Resume Checker: Score & Keyword Match | ${siteConfig.shortName}`,
  description:
    "Scan your resume for parsing risks, missing evidence, and job-description keyword match: free, 0 account required. Full breakdown with a free account; AI analysis on paid plans.",
  ogTitle: "Free ATS Resume Checker: Score & Keyword Match",
  ogDescription:
    "The same rules-based scoring engine used inside VeriWorkly: check parsing, structure, evidence, and job match for free, with no account needed.",
  twitterTitle: "Is your resume ATS-ready? Check for free",
  twitterDescription:
    "Rules-based readiness score plus a job-description keyword match: 0 account required to start.",
  image: pageOgImage,
  imageAlt: "VeriWorkly Free ATS Resume Checker",
  keywords: [
    "free ATS resume checker",
    "ATS resume scanner",
    "resume score checker",
    "ATS keyword match checker",
    "is my resume ATS friendly",
    "applicant tracking system checker",
    "resume keyword analyzer",
    "ATS parsing score",
    "resume scanner for jobs",
    "ATS friendly resume test",
  ],
});

const pageFaqIds = [
  "ats-checker-overview",
  "ats-two-scores-explained",
  "ats-checker-limits",
  "ats-scan-privacy",
  "ats-friendly-templates",
];

const pageFaqs = pageFaqIds
  .map((id) => faqs.find((faq) => faq.id === id))
  .filter((faq): faq is (typeof faqs)[number] => Boolean(faq));

export default function AtsCheckerPage() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    "@id": `${pageUrl}#app`,
    name: "VeriWorkly Free ATS Resume Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web-based)",
    url: pageUrl,
    publisher: organizationRef,
    isPartOf: appRef,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Column-gutter and ruled-table detection on PDF uploads",
      "Contact placement and section-heading mapping",
      "Metric and action-verb density scoring across bullets",
      "Job description keyword matching, weighted by requirement",
      "Synonym, abbreviation and implied-skill resolution",
    ],
    description:
      "A free, deterministic rules-based ATS resume checker that scores parsing integrity, structure, evidence, and job-description keyword match.",
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to check whether your resume is ATS-ready",
    description:
      "Score a resume for parsing risks, structure, evidence quality, and job-description keyword match using VeriWorkly's free rules-based ATS checker.",
    totalTime: "PT2M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
    tool: [{ "@type": "HowToTool", name: "VeriWorkly ATS Checker" }],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Add your resume",
        text: "Upload a PDF, DOCX, TXT, or Markdown resume, or paste the text directly. Nothing is stored on servers.",
        url: scanUrl,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Paste the target job description",
        text: "Optional. Adding the job listing computes a keyword match score weighted toward terms under Requirements over Nice-to-have.",
        url: scanUrl,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Review your score and point recovery fixes",
        text: "Get an instant ATS readiness score, the most serious issue found, and your highest-impact fix. A free account unlocks the per-area breakdown, the keyword lists, and the recovered work history.",
        url: scanUrl,
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "ATS Checker", item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(softwareSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <AtsHero />
      <AtsDirectAnswer />
      <AtsFailureTraps />
      <AtsPipelineSection />
      <AtsCategoriesGrid />
      <AtsScoreFacts />
      <TierComparison />
      <AtsCheckerFaq faqs={pageFaqs} />
      <PageClosing
        title="Fix it in the editor."
        lede="Open the resume in the studio, apply the fixes the report ranked first, then scan it again."
        secondary={{ label: "Scan a resume", href: "/ats-checker/scan" }}
      />
    </>
  );
}
