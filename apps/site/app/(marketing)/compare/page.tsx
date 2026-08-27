import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  COMPETITORS,
  CompareHubHero,
  CompetitorCard,
  CompareQuickMatrix,
  CompareBentoPillars,
} from "@/features/compare";

const pageUrl = `${siteConfig.url}/compare`;

const ogImage = `/api/og?title=${encodeURIComponent(
  "Compare Resume Builders",
)}&description=${encodeURIComponent(
  "See how VeriWorkly compares to Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv on pricing, downloads, and ATS checks.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/compare",

  title: `Compare Resume Builders: Real Pricing & Features | ${siteConfig.shortName}`,
  description:
    "An honest, straightforward comparison of VeriWorkly against Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv. See real pricing, ATS accuracy, download limits, and account requirements.",

  ogTitle: "Compare VeriWorkly to Other Resume Builders",
  ogDescription:
    "Honest feature-by-feature comparisons: pricing, ATS keyword matching, download limits, and sign-up requirements.",

  twitterTitle: "VeriWorkly vs Other Resume Builders",
  twitterDescription:
    "Honest comparisons: real pricing, ATS checks, free downloads, and no account barriers.",

  image: ogImage,
  imageAlt: `${siteConfig.shortName} | Compare Resume Builders`,

  keywords: [
    "VeriWorkly vs Rezi",
    "VeriWorkly vs Teal",
    "VeriWorkly vs Kickresume",
    "VeriWorkly vs Novoresume",
    "VeriWorkly vs Zety",
    "VeriWorkly vs Enhancv",
    "best free resume builder",
    "free resume builder no watermark",
    "ATS resume checker comparison",
    "free resume builder no login",
  ],
});

const ComparePage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Compare", item: pageUrl },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Compare VeriWorkly to Other Resume Builders | ${siteConfig.shortName}`,
    description:
      "Direct comparisons of VeriWorkly vs leading resume builders including pricing, ATS checks, and download policies.",
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: COMPETITORS.map((competitor, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `VeriWorkly vs ${competitor.name}`,
        url: `${pageUrl}/${competitor.id}`,
        description: competitor.positioning,
      })),
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
        dangerouslySetInnerHTML={jsonLdScriptProps(itemListSchema)}
      />

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-emerald-500/5 blur-[130px]" />

        <Container className="space-y-20 pt-28 pb-24 lg:pt-36">
          <CompareHubHero />

          <CompareBentoPillars />

          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                  Individual Reviews
                </span>

                <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  Detailed side-by-side comparisons
                </h2>
              </div>

              <span className="text-muted font-mono text-xs">
                {COMPETITORS.length} platforms reviewed
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {COMPETITORS.map((competitor) => (
                <CompetitorCard key={competitor.id} competitor={competitor} />
              ))}
            </div>
          </section>

          <CompareQuickMatrix />

          <div className="border-border/60 bg-card/40 relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-10 text-center shadow-xl backdrop-blur-sm sm:p-14">
            <div className="bg-accent/10 pointer-events-none absolute top-0 left-1/2 size-96 -translate-x-1/2 rounded-full blur-3xl" />

            <span className="bg-accent/15 text-accent border-accent/30 rounded-full border px-3.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase">
              Free to Start • No Credit Card
            </span>

            <h2 className="text-foreground relative max-w-xl text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              Build your resume on VeriWorkly right now
            </h2>

            <p className="text-muted relative max-w-lg text-sm leading-relaxed sm:text-base">
              No account wall, no watermarks on your downloads, and no subscription traps. Start
              writing, match keywords, and export in seconds.
            </p>

            <Link
              href={siteConfig.links.app}
              className="bg-accent text-accent-foreground relative inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold shadow-lg transition duration-200 ease-out hover:opacity-90 active:scale-[0.97]"
            >
              <span>Start building free without an account</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </div>
    </>
  );
};

export default ComparePage;
