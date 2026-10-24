import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { PageHero, PageClosing } from "@/components/marketing/PageLayout";

import {
  LegalHeroMeta,
  termsSections,
  LegalSections,
  LegalTopicsGrid,
  termsLastUpdated,
  LegalContactBanner,
  termsEffectiveDate,
  type LegalTopic,
} from "@/features/legal";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/terms`;

export const metadata: Metadata = buildPageMetadata({
  path: "/terms",

  title: `Terms of Service | ${siteConfig.shortName}`,
  description:
    "The complete terms for using VeriWorkly: content ownership, AI & ATS disclaimers, pay-as-you-go billing, open-source licensing, and fair use guidelines.",

  ogTitle: "The Rules, Written in Plain English",
  ogDescription:
    "What you can expect from VeriWorkly, what we expect from you, and how billing, AI features, and open-source licensing actually work.",

  twitterTitle: "Read the terms before you build. It's short.",
  twitterDescription:
    "Account rules, AI/ATS disclaimers, billing terms, and open-source licensing for VeriWorkly's hosted service.",

  image: "/og/terms-page-og.png",
  imageAlt: `${siteConfig.shortName} Terms of Service`,

  keywords: [
    "VeriWorkly terms of service",
    "AI resume builder terms",
    "open source SaaS terms",
    "AI credit terms",
    "resume builder liability",
  ],
});

const termsTopics: LegalTopic[] = [
  {
    title: "You own your content",
    description:
      "You retain full intellectual property ownership over your resumes, cover letters, portfolio content, and career facts. We only process it to run the Service you requested.",
  },
  {
    title: "AI and ATS output is a draft",
    description:
      "AI bullet rewrites and ATS scores are designed to assist you in drafting faster. We do not guarantee interview or hiring outcomes; always review AI output before applying.",
  },
  {
    title: "Local-first backup ownership",
    description:
      "If you use the studio without logging in, your data lives solely in your browser. Export a JSON backup or create a free account to ensure you do not lose drafts if you clear cache.",
  },
  {
    title: "Open-source core vs hosted",
    description:
      "Our document engine is MIT-licensed on GitHub for self-hosting. These Terms specifically govern using the hosted veriworkly.com platform and cloud features.",
  },
  {
    title: "Transparent pay-as-you-go",
    description:
      "We do not lock document downloads behind trials or recurring traps. AI credits are pay-as-you-go: subscription credits refresh each billing period, and one-time packs expire 90 days after purchase.",
  },
  {
    title: "Fair use on free tiers",
    description:
      "Rate limits and scan quotas exist so the free tier stays fast, secure, and accessible for everyone. Automated scraping or bot abuse is strictly prohibited.",
  },
];

const TermsPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Terms of Service", item: pageUrl },
    ],
  };

  const termsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service | VeriWorkly",
    url: pageUrl,
    description: "Terms of Service and guidelines for VeriWorkly career workspace.",
    dateModified: termsLastUpdated,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
    about: {
      "@type": "Thing",
      name: "Terms of Service",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(termsSchema)} />

      <PageHero
        title="Terms of"
        highlight="service."
        lede="Simple, transparent guidelines for everyone. Clear expectations without corporate legalese: how our document studio, ATS scoring, AI credits, and open-source licensing operate together."
        aside={
          <LegalHeroMeta
            effectiveDate={termsEffectiveDate}
            links={[
              { label: "About the project", href: "/about" },
              { label: "Contact legal support", href: "/contact" },
            ]}
          />
        }
      />

      <LegalTopicsGrid
        title="The short version."
        lede="Six points in plain words. The full terms follow."
        topics={termsTopics}
      />

      <LegalSections sections={termsSections} />

      <LegalContactBanner
        secondaryActionHref="/privacy"
        secondaryActionText="Privacy Policy"
        primaryActionEmail={siteConfig.email}
        primaryActionText="Contact Legal Support"
        title="Have questions about our Terms of Service?"
        description="Reach out directly to our team for licensing clarifications or enterprise inquiries."
      />

      <PageClosing />
    </>
  );
};

export default TermsPage;
