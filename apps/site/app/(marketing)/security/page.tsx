import type { Metadata } from "next";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  SecurityHero,
  DataRetentionSection,
  OAuthSecuritySection,
  DataPartitioningSection,
  SecurityBoundaryDiagram,
  ResponsibleDisclosureSection,
} from "@/features/security";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/security`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Security Architecture & Disclosure Policy",
)}&description=${encodeURIComponent(
  "Local-first browser sandboxes, Better Auth OTP verification, minimal OAuth scopes, and a 24-hour vulnerability SLA.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/security",

  title: `Security & Responsible Disclosure Policy | ${siteConfig.shortName}`,
  description:
    "How we secure your career data: local-first browser storage, encrypted cloud sync, Better Auth OTP authentication, and a 24-hour responsible disclosure commitment.",

  ogTitle: "Private Security for Your Career Records",
  ogDescription:
    "Local-first storage, decoupled document sandboxes, and a 24-hour response commitment on every security report.",

  twitterTitle: "Found a bug? Here is exactly what happens next.",
  twitterDescription:
    "Our security architecture and responsible disclosure process in plain language: report privately and get acknowledged within 24 hours.",

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

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-emerald-500/5 blur-[130px]" />

        <Container className="space-y-24 pt-28 pb-20 lg:pt-36">
          <SecurityHero />

          <section className="space-y-6">
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Interactive Architecture
              </span>

              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Multi-Layer Security &amp; Privacy Boundaries
              </h2>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Click across the 4 architecture layers to inspect how each environment protects your
                data.
              </p>
            </div>

            <SecurityBoundaryDiagram />
          </section>

          <DataPartitioningSection />
          <OAuthSecuritySection />
          <DataRetentionSection />
          <ResponsibleDisclosureSection />
        </Container>

        <InteractiveCTA />
      </div>
    </>
  );
};

export default SecurityPage;
