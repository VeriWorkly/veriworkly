import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import {
  WORKFLOW_STEPS,
  HowItWorksHero,
  StepDetailCards,
  PipelineTimeline,
  ArchitectureAndDocsSection,
} from "@/features/how-it-works";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

export const revalidate = false;
export const dynamic = "force-static";

const pageUrl = `${siteConfig.url}/how-it-works`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "How VeriWorkly Works",
)}&description=${encodeURIComponent(
  "A privacy-first, local-first pipeline for resumes, cover letters, AI tailoring, and portfolios.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/how-it-works",

  title: `How It Works: Privacy-First AI Career Builder | ${siteConfig.shortName}`,
  description:
    "How local-first browser storage, Master Profile sandboxes, AI bullet rewrites, ATS matching, and custom subdomain portfolios work together.",

  ogTitle: "Five Steps From Career DNA to Dream Job",
  ogDescription:
    "Local browser storage, Master Profile ingestion from GitHub and LinkedIn, AI bullet tailoring, ATS scanning, and multi-format exports.",

  twitterTitle: "Privacy and precision, explained in five steps",
  twitterDescription:
    "See how VeriWorkly keeps your resume data local-first while letting AI optimize your bullets against target job postings.",

  image: pageOgImage,
  imageAlt: "VeriWorkly Platform Architecture",

  keywords: [
    "how VeriWorkly works",
    "local-first resume builder",
    "AI credit system",
    "privacy-first AI architecture",
    "master profile sync",
    "github resume import",
    "linkedin data import",
  ],
});

const HowItWorksPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "How It Works", item: pageUrl },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How VeriWorkly's Local-First Career Workspace Works",
    description:
      "Step-by-step overview of career data ingestion from GitHub and LinkedIn, local-first document editing, ATS matching, AI diff rewriting, and custom subdomain web portfolios.",
    url: pageUrl,
    step: WORKFLOW_STEPS.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(howToSchema)} />

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        <Container className="space-y-24 pt-28 pb-20 lg:pt-36">
          <HowItWorksHero />

          <section className="mx-auto w-full max-w-4xl space-y-8">
            <div className="space-y-2 text-center">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                The 5-Step Pipeline
              </span>

              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                From Raw History to Tailored Applications
              </h2>
            </div>

            <PipelineTimeline />
          </section>

          <StepDetailCards />

          <ArchitectureAndDocsSection />

          <div className="border-border/60 bg-card/40 relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-10 text-center shadow-xl backdrop-blur-sm sm:p-14">
            <div className="bg-accent/10 pointer-events-none absolute top-0 left-1/2 size-96 -translate-x-1/2 rounded-full blur-3xl" />

            <div className="max-w-lg space-y-2">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Start in Seconds
              </span>

              <h3 className="text-foreground text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                Experience the local-first studio
              </h3>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                No sign-up wall, no subscriptions, and unlimited unwatermarked downloads.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={siteConfig.links.app}
                className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
              >
                <span>Open Studio</span>

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

export default HowItWorksPage;
