import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";

import { siteConfig } from "@/config/site";
import { buildPageMetadata } from "@/utils/metadata";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { AtsCheckerTool } from "@/features/ats-checker";
import { Container } from "@veriworkly/ui";

const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Scan Your Resume",
)}&description=${encodeURIComponent("Free ATS readiness and job match scoring.")}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/ats-checker/scan",
  title: `Scan Your Resume: Free ATS Checker | ${siteConfig.shortName}`,
  description:
    "Upload or paste your resume for a free ATS readiness score, a job-description keyword match, and the single most serious issue found: 0 account required to start.",
  ogTitle: "Scan your resume for free",
  ogDescription: "Upload or paste your resume for an instant ATS readiness score.",
  twitterTitle: "Scan your resume: free ATS check",
  twitterDescription: "No account required to start.",
  image: pageOgImage,
  imageAlt: "VeriWorkly resume scan tool",
});

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
    {
      "@type": "ListItem",
      position: 2,
      name: "ATS Checker",
      item: `${siteConfig.url}/ats-checker`,
    },
    { "@type": "ListItem", position: 3, name: "Scan", item: `${siteConfig.url}/ats-checker/scan` },
  ],
};

export default function AtsCheckerScanPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />

      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        <Container className="pt-28 pb-24 md:pt-36">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Link
                href="/ats-checker"
                className="border-border/60 bg-card/60 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                <span>Back to ATS Overview</span>
              </Link>

              <span className="border-border/60 bg-background/80 text-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px]">
                <Lock className="text-accent size-3" aria-hidden="true" />
                <span>Memory only · Not stored</span>
              </span>
            </div>

            <header className="mb-8 space-y-2">
              <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
                Scan your resume
              </h1>
              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Two steps and a score. Add a job description in step two if you want keyword match
                for a specific role.
              </p>
            </header>

            <AtsCheckerTool />
          </div>
        </Container>
      </div>
    </>
  );
}
