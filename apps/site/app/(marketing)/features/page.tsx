import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";

import {
  FeaturesHero,
  IngestionSection,
  AtsScannerSection,
  AiTailoringSection,
  StudioFeatureSection,
  FeaturesComparisonTable,
  PortfolioFeatureSection,
  PrivacyAndExportsSection,
  DeveloperEcosystemSection,
} from "@/features/features";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/features`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Platform Features & Career Tools",
)}&description=${encodeURIComponent(
  "AI resume tailoring, cover letter drafting, free ATS scoring, GitHub & LinkedIn imports, and web portfolios.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/features",

  title: `Platform Features: AI Resumes, ATS & Portfolios | ${siteConfig.shortName}`,
  description:
    "AI resume tailoring, an AI cover letter writer, a free ATS checker, GitHub and LinkedIn imports, multi-format exports, and web portfolio publishing, all private and local-first.",

  ogTitle: "Everything Inside the VeriWorkly Career Workspace",
  ogDescription:
    "AI resume tailoring, cover letter generation, a free ATS checker, GitHub and LinkedIn imports, and portfolio publishing, all local-first.",

  twitterTitle: "One workspace, every career tool",
  twitterDescription:
    "AI resume and cover letter tools, a free ATS checker, and portfolio publishing, private by default.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Platform Features",

  keywords: [
    "VeriWorkly features",
    "AI resume tailoring tool",
    "AI cover letter writer",
    "free ATS checker",
    "AI resume rewrite",
    "custom portfolio subdomains",
    "github resume import",
    "linkedin data import",
  ],
});

const FeaturesPage = () => {
  const featuresSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Platform Features",
    url: pageUrl,
    description:
      "Comprehensive feature breakdown including document studio, AI tailoring, ATS checker, GitHub/LinkedIn import, web portfolios, and local-first privacy.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(featuresSchema)}
      />

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        <Container className="space-y-24 pt-28 pb-20 lg:pt-36">
          <FeaturesHero />
          <StudioFeatureSection />
          <AiTailoringSection />
          <IngestionSection />
          <AtsScannerSection />
          <PortfolioFeatureSection />
          <PrivacyAndExportsSection />
          <DeveloperEcosystemSection />
          <FeaturesComparisonTable />

          <div className="border-border/60 bg-card/40 relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-10 text-center shadow-xl backdrop-blur-sm sm:p-14">
            <div className="bg-accent/10 pointer-events-none absolute top-0 left-1/2 size-96 -translate-x-1/2 rounded-full blur-3xl" />

            <div className="max-w-lg space-y-2">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Get Started in Seconds
              </span>

              <h3 className="text-foreground text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                Build your next resume in minutes
              </h3>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                No credit card, no sign-up wall, and unlimited clean downloads.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={siteConfig.links.app}
                className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
              >
                <span>Launch builder</span>

                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.docs}
                className="border-border/80 bg-card text-muted hover:text-foreground inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
              >
                <BookOpen className="size-4" />
                <span>Read the Docs</span>
              </a>
            </div>
          </div>
        </Container>

        <InteractiveCTA />
      </div>
    </>
  );
};

export default FeaturesPage;
