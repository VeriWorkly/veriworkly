import type { Metadata } from "next";
import type { ReactNode } from "react";

import nextDynamic from "next/dynamic";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";

import { faqs } from "@/features/landing/faq/data/faqItems";

import DocumentPortfolioSwitcher, {
  type DocumentPreviewTabId,
} from "@/features/landing/document-switcher/DocumentPortfolioSwitcher";

import PremiumFAQ from "@/features/landing/faq/PremiumFAQ";
import { HeroHeader } from "@/features/landing/hero/HeroHeader";
import GaplessBento from "@/features/landing/bento/GaplessBento";
import BrandTrust from "@/features/landing/brand-trust/BrandTrust";
import PrivacyWhyUs from "@/features/landing/privacy/PrivacyWhyUs";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import ComparisonMatrix from "@/features/landing/comparison/ComparisonMatrix";
import MetricsProofBar from "@/features/landing/metrics-proof/MetricsProofBar";
import ResumePreview from "@/features/landing/document-switcher/ResumePreview";
import TemplateShowcase from "@/features/landing/template-showcase/TemplateShowcase";
import PortfolioPreview from "@/features/landing/document-switcher/PortfolioPreview";
import CoverLetterPreview from "@/features/landing/document-switcher/CoverLetterPreview";

const InteractiveProcess = nextDynamic(
  () => import("@/features/landing/process/InteractiveProcess"),
);

const documentPreviews: Record<DocumentPreviewTabId, ReactNode> = {
  resume: <ResumePreview />,
  "cover-letter": <CoverLetterPreview />,
  portfolio: <PortfolioPreview />,
};

const pageUrl = siteConfig.url;
const pageOgImage = `${siteConfig.url}/og/landing-page-og.png`;

export const revalidate = false;
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Free AI Resume Builder, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
  description:
    "Build ATS-friendly resumes, targeted cover letters, and live web portfolios in minutes. Privacy-first, local-first data storage, open-core, and zero login required.",

  openGraph: {
    title: `Free AI Resumes, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
    description:
      "Create professional resumes, cover letters, and web portfolios in minutes with VeriWorkly's privacy-first AI tools. Free, open-core, and no signup required. Customize professional templates, sync dynamic sections with AI tailoring, and publish instantly.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.shortName} Resume, Cover Letter & Web Portfolio Platform`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Free AI Resumes, Cover Letters & Web Portfolios | ${siteConfig.shortName}`,
    description:
      "Build ATS-friendly resumes, cover letters, and custom web portfolios instantly with private AI assistance. No signup required. Open-core and privacy-first.",
    images: [pageOgImage],
  },

  alternates: {
    canonical: pageUrl,
  },
};

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Build an ATS Resume & Web Portfolio with VeriWorkly",
  description:
    "Learn how to build a professional, ATS-friendly resume and web portfolio in 4 simple steps without signing up.",
  // Every step carries `position` and `url`. Two of the four previously had neither,
  // which makes a step list harder to parse than one that is consistently annotated -
  // and partial coverage is worse than none, because it implies the gaps are ordering.
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Launch the Studio",
      text: "Open the VeriWorkly Studio editor at app.veriworkly.com. No account is required to start.",
      url: siteConfig.links.app,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Choose a Template",
      text: "Select an ATS-optimized resume template or a web portfolio layout.",
      url: `${siteConfig.url}/templates`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Enter Your Experience",
      text: "Fill in your details, or import your experience from LinkedIn or GitHub straight into your Master Profile.",
      url: `${siteConfig.url}/how-it-works`,
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Export or Publish",
      text: "Download your resume as an ATS-ready PDF, or in any of six formats, all free and unwatermarked. Portfolio publishing on your own subdomain opens at launch.",
      url: `${siteConfig.url}/templates`,
    },
  ],
  totalTime: "PT5M",
  // estimatedCost takes MonetaryAmount or text, not HowToSupply - the previous value
  // was typed wrong and would not validate. The /ats-checker HowTo already gets this
  // right.
  estimatedCost: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: "0",
  },
};

const Home = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(faqPageSchema)}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)} />

      <HeroHeader />
      <BrandTrust />
      <MetricsProofBar />
      <GaplessBento />
      <TemplateShowcase />
      <InteractiveProcess />
      <DocumentPortfolioSwitcher previews={documentPreviews} />
      <PrivacyWhyUs />
      <ComparisonMatrix />
      <PremiumFAQ />
      <InteractiveCTA />
    </>
  );
};

export default Home;
