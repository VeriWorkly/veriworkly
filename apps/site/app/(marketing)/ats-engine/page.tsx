import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";
import { engineSize } from "@/features/ats-engine/data/sizes";

import {
  EngineCTA,
  EngineFaq,
  EngineHero,
  EngineIntegrity,
  EngineRuntimes,
  EngineSurfaces,
  EngineAudiences,
  EngineBenchmarks,
  EngineComparison,
  EngineDeterminism,
  EngineCapabilities,
  ENGINE_LINKS,
  ENGINE_VERSION_LABEL,
  FAQ_IDS,
} from "@/features/ats-engine";
import { faqs } from "@/features/faq/data/faqItems";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/ats-engine`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "VeriWorkly ATS Engine",
)}&description=${encodeURIComponent(
  "The open-source ATS resume parser and scorer for TypeScript: a published rubric, no AI in the score, runs in the browser.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ats-engine",
  title: `Open-Source ATS Resume Parser & Scorer | ${siteConfig.shortName}`,
  description:
    "The VeriWorkly ATS Engine reads, scores and matches resumes the way an applicant tracking system does. MIT licensed, published rubric, runs in browser or Node.",
  ogTitle: "The open-source ATS engine for your product",
  ogDescription:
    "Parse a resume like an ATS, score it with 35 published rules and match it to a job posting requirement by requirement. One npm install, no AI in the score.",
  twitterTitle: "An open-source ATS engine, in one npm install",
  twitterDescription: `Deterministic resume parsing, scoring and job matching for TypeScript. MIT, about ${engineSize(".", true)} gzipped.`,
  image: pageOgImage,
  imageAlt: "VeriWorkly ATS Engine",
  keywords: [
    "ATS engine",
    "open source ATS resume checker",
    "resume parser npm",
    "resume parser JavaScript",
    "resume parser TypeScript",
    "ATS score API",
    "resume scoring library",
    "job description matching library",
    "ATS MCP server",
    "resume checker GitHub Action",
  ],
});

const pageFaqs = FAQ_IDS.map((id) => faqs.find((faq) => faq.id === id)).filter(
  (faq): faq is (typeof faqs)[number] => Boolean(faq),
);

export default function AtsEnginePage() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": `${pageUrl}#code`,
    name: "VeriWorkly ATS Engine",
    alternateName: "@veriworkly/ats-engine",
    description:
      "An open-source TypeScript library that reads a resume the way an applicant tracking system does, scores it with a published deterministic rubric and matches it to a job posting.",
    url: pageUrl,
    codeRepository: ENGINE_LINKS.github,
    programmingLanguage: ["TypeScript", "JavaScript"],
    runtimePlatform: ["Node.js", "Web browsers", "Edge runtimes"],
    license: "https://opensource.org/licenses/MIT",
    version: ENGINE_VERSION_LABEL,
    author: { "@id": `${siteConfig.url}/#organization` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    sameAs: [ENGINE_LINKS.npm, ENGINE_LINKS.github],
    targetProduct: {
      "@type": "SoftwareApplication",
      "@id": `${pageUrl}#app`,
      name: "VeriWorkly ATS Engine",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      softwareHelp: { "@type": "CreativeWork", url: ENGINE_LINKS.docs },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "ATS Engine", item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(softwareSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(faqSchema)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <EngineHero />
      <EngineCapabilities />
      <EngineDeterminism />
      <EngineIntegrity />
      <EngineSurfaces />
      <EngineRuntimes />
      <EngineBenchmarks />
      <EngineAudiences />
      <EngineComparison />
      <EngineFaq faqs={pageFaqs} />
      <EngineCTA />
    </>
  );
}
