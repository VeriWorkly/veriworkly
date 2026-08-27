import type { Metadata } from "next";
import { Lock, Globe, BarChart3, EyeOff, ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  LegalHero,
  LegalSections,
  LegalPageShell,
  LegalTopicsGrid,
  privacySections,
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

  title: `Privacy Policy: Privacy-First AI Career Workspace | ${siteConfig.shortName}`,
  description:
    "How VeriWorkly protects resumes, cover letters, and portfolios: local-first storage, encrypted sync, stateless AI, and zero ad tracking.",

  ogTitle: "Your Data Never Leaves Your Browser Without Asking",
  ogDescription:
    "See exactly what is stored locally, what syncs to the cloud, and what happens when you use AI features — no surprises, no fine print.",

  twitterTitle: "Local-first by default. Read the full policy.",
  twitterDescription:
    "Browser storage, encrypted sync, and stateless AI processing — the exact data boundaries VeriWorkly commits to in writing.",

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
    icon: Lock,
    title: "Local-First Browser Storage",
    badge: "Client-Side First",
    description:
      "Your documents and Master Profile facts are written to your browser's private local storage (LocalStorage) first. Nothing is uploaded to our servers unless you log in, sync, or trigger a cloud feature.",
  },
  {
    icon: Globe,
    title: "Opt-In Portfolio Publishing",
    badge: "Public by Choice",
    description:
      "Published portfolios and share links are only public because you choose to publish them. Password protection and one-click unpublishing are available at any time from your dashboard.",
  },
  {
    icon: BarChart3,
    title: "Aggregate-Only Analytics",
    badge: "No Cookie Trackers",
    description:
      "Portfolio view counts and referrer stats are tracked purely in aggregate, without cookies and without building individual tracking profiles of your visitors.",
  },
  {
    icon: EyeOff,
    title: "Zero Selling & Zero Ad Trackers",
    badge: "100% Private",
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
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
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

      <LegalPageShell ambientGlowColor="emerald">
        <div className="border-border/40 relative flex flex-col gap-8 border-b pb-16">
          <LegalHero
            badgeLabel="Privacy Policy"
            badgeDotClass="bg-emerald-500"
            effectiveDate={privacyEffectiveDate}
            title="Your career credentials belong to you."
            description="We built VeriWorkly on a foundational principle: you can write, format, and download your resumes without ever uploading your personal data to a remote database."
            primaryAction={{
              label: "Read security architecture",
              href: "/security",
            }}
            secondaryAction={{
              label: "Contact privacy officer",
              href: "/contact",
            }}
          />

          <LegalTopicsGrid
            columns={4}
            topics={privacyTopics}
            label="Executive Summary"
            countLabel="4 Key Pillars"
          />
        </div>

        <LegalSections sections={privacySections} />

        <LegalContactBanner
          secondaryActionHref="/security"
          secondaryActionIcon={ShieldCheck}
          primaryActionEmail={siteConfig.email}
          secondaryActionText="Security Overview"
          primaryActionText="Contact Privacy Team"
          tagline="Privacy Inquiries & GDPR Requests"
          title="Have questions about your data privacy?"
          description="Contact our privacy compliance team directly for data exports, deletions, or policy clarifications."
        />
      </LegalPageShell>
    </>
  );
};

export default PrivacyPage;
