import type { Metadata } from "next";

import { Container } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  AtsHero,
  AtsFaqSection,
  TierComparison,
  AtsDirectAnswer,
  AtsFailureTraps,
  AtsCategoriesGrid,
  AtsPipelineSection,
} from "@/features/ats-checker";
import { faqs } from "@/features/faq/data/faqItems";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

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
    "@type": "SoftwareApplication",
    name: "VeriWorkly Free ATS Resume Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web-based)",
    url: scanUrl,
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

      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        <Container className="space-y-24 pt-28 pb-20 lg:space-y-32 lg:pt-36">
          <AtsHero />
          <AtsDirectAnswer />
          <AtsFailureTraps />
          <AtsCategoriesGrid />
          <AtsPipelineSection />

          <section className="border-border/40 space-y-10 border-t pt-16">
            <div className="space-y-2 text-left">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Tier Comparison
              </span>

              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Score for free. Unlock the full breakdown when you are ready.
              </h2>

              <p className="text-muted max-w-2xl text-xs leading-relaxed sm:text-sm">
                Anyone can check their resume score and see which area drags it down. The
                rule-by-rule reasoning takes a free account, and AI explanations are included on
                paid plans.
              </p>
            </div>

            <TierComparison />
          </section>

          <AtsFaqSection faqs={pageFaqs} />

          <div className="border-border/30 border-t pt-8 text-center">
            <p className="text-muted/70 mx-auto max-w-3xl text-[11px] leading-relaxed">
              <strong>Disclaimer:</strong> VeriWorkly ATS Checker evaluates documents against
              heuristic parsing standards, weighted keyword matching, and structural guidelines. It
              does not simulate or guarantee compatibility with any specific proprietary employer
              software, nor does it guarantee interviews or job offers. All third-party product and
              company names mentioned are trademarks or registered trademarks of their respective
              owners. Their mention does not imply endorsement, affiliation, or sponsorship.
            </p>
          </div>
        </Container>

        <InteractiveCTA />
      </div>
    </>
  );
}
