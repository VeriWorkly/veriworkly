import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";

import {
  SecurityHero,
  DataRetentionSection,
  OAuthSecuritySection,
  SecurityBoundaryDiagram,
  ResponsibleDisclosureSection,
} from "@/features/security";
import { PageClosing, PageSection } from "@/components/marketing/PageLayout";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/security`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Security Architecture & Disclosure Policy",
)}&description=${encodeURIComponent(
  "Local-first browser sandboxes, Better Auth OTP verification, minimal OAuth scopes, and a 24 to 48 hour acknowledgement on every report.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/security",

  title: `Security & Responsible Disclosure Policy | ${siteConfig.shortName}`,
  description:
    "How we secure your career data: local-first browser storage, encrypted cloud sync, Better Auth OTP authentication, and a 24 to 48 hour acknowledgement on every security report.",

  ogTitle: "Private Security for Your Career Records",
  ogDescription:
    "Local-first storage, decoupled document sandboxes, and a 24 to 48 hour acknowledgement on every security report.",

  twitterTitle: "Found a bug? Here is exactly what happens next.",
  twitterDescription:
    "Our security architecture and responsible disclosure process in plain language: report privately and get acknowledged within 24 to 48 hours.",

  image: pageOgImage,
  imageAlt: `${siteConfig.shortName} Security Overview`,

  keywords: [
    "VeriWorkly security",
    "responsible disclosure policy",
    "local-first data security",
    "secure resume builder",
    "vulnerability disclosure program",
    "OAuth least privilege",
    "data retention lifecycle",
  ],
});

const SecurityPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Security", item: pageUrl },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    about: {
      "@type": "Thing",
      name: "Web application security, data privacy, and vulnerability disclosure",
    },
    name: "Security Policy | VeriWorkly",
    url: pageUrl,
    isPartOf: webSiteRef,
    description:
      "Security architecture, sandbox boundaries, OAuth scope specifications, data retention matrix, and responsible disclosure procedures.",
    dateModified: "2026-08-27",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(webPageSchema)}
      />

      <SecurityHero />

      <PageSection
        id="data-routes"
        tone="card"
        title="Follow your data."
        lede="Choose something you do in VeriWorkly and see every place your text reaches while you do it."
      >
        <SecurityBoundaryDiagram />
      </PageSection>

      <OAuthSecuritySection />
      <DataRetentionSection />
      <ResponsibleDisclosureSection />

      <PageClosing
        title="See where your data lives."
        lede="Open the studio and check your browser's storage yourself: your drafts are there, and nowhere else until you choose to sync."
      />
    </>
  );
};

export default SecurityPage;
