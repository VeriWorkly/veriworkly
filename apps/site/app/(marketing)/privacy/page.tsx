import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";

import { PageHero, PageClosing } from "@/components/marketing/PageLayout";

import {
  LegalHeroMeta,
  LegalSections,
  LegalTopicsGrid,
  privacySections as SECTIONS,
  LegalContactBanner,
  privacyLastUpdated,
  privacyEffectiveDate,
  type LegalTopic,
} from "@/features/legal";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/privacy`;

export const metadata: Metadata = buildPageMetadata({
  path: "/privacy",

  title: `Privacy Policy: How Your Career Data Is Handled | ${siteConfig.shortName}`,
  description:
    "How VeriWorkly protects resumes, cover letters, and portfolios: local-first storage, encrypted sync, a named AI subprocessor, and zero ad tracking.",

  ogTitle: "Your Data Never Leaves Your Browser Without Asking",
  ogDescription:
    "See exactly what is stored locally, what syncs to the cloud, and what happens when you use AI features - no surprises, no fine print.",

  twitterTitle: "Local-first by default. Read the full policy.",
  twitterDescription:
    "Browser storage, encrypted sync, and every AI subprocessor named - including what we cannot control once a request leaves us.",

  image: "/og/privacy-page-og.png",
  imageAlt: `${siteConfig.shortName} Privacy Policy`,

  keywords: [
    "VeriWorkly privacy policy",
    "local-first data storage",
    "privacy-first AI resume builder",
    "GDPR resume builder",
    "no data selling",
  ],
});

const privacyTopics: LegalTopic[] = [
  {
    title: "Local-first browser storage",
    description:
      "Your documents and Master Profile facts are written to your browser's private local storage (LocalStorage) first. Nothing is uploaded to our servers unless you log in, sync, or trigger a cloud feature.",
  },
  {
    title: "Opt-in portfolio publishing",
    description:
      "Published portfolios and share links are only public because you choose to publish them. Password protection and one-click unpublishing are available at any time from your dashboard.",
  },
  {
    title: "Aggregate-only analytics",
    description:
      "Portfolio view counts and referrer stats are tracked purely in aggregate, without cookies and without building individual tracking profiles of your visitors.",
  },
  {
    title: "Zero selling, zero ad trackers",
    description:
      "We never sell your data to data brokers or recruiters. We do not run third-party advertising trackers or session recording heatmaps on your private documents.",
  },
];

const PrivacyPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Privacy Policy", item: pageUrl },
    ],
  };

  const privacySchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy | VeriWorkly",
    url: pageUrl,
    description:
      "Learn how VeriWorkly secures career data through local-first and encrypted workflows.",
    dateModified: privacyLastUpdated,
    inLanguage: "en",
    isPartOf: webSiteRef,
    about: {
      "@type": "Thing",
      name: "Privacy Policy",
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
        dangerouslySetInnerHTML={jsonLdScriptProps(privacySchema)}
      />

      <PageHero
        title="Privacy"
        highlight="policy."
        lede="Your career credentials belong to you. We built VeriWorkly on a foundational principle: you can write, format, and download your resumes without ever uploading your personal data to a remote database."
        aside={
          <LegalHeroMeta
            effectiveDate={privacyEffectiveDate}
            links={[
              { label: "Read security architecture", href: "/security" },
              { label: "Contact our Grievance Officer", href: "/contact" },
            ]}
          />
        }
      />

      <LegalTopicsGrid
        title="The short version."
        lede="Four commitments in plain words. The full policy follows."
        topics={privacyTopics}
      />

      <LegalSections sections={SECTIONS} />

      <LegalContactBanner
        secondaryActionHref="/security"
        secondaryActionText="Security Overview"
        title="Have questions about your data privacy?"
        primaryActionText="Contact our Grievance Officer"
        primaryActionEmail={siteConfig.legalContact.email}
        description={`Write to ${siteConfig.legalContact.name}, our named ${siteConfig.legalContact.role}, for data exports, deletions, or anything in this policy that is unclear.`}
      />

      <PageClosing />
    </>
  );
};

export default PrivacyPage;
