import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

import { GithubIcon } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { Reveal } from "@/components/marketing/Reveal";

import { faqs, categories } from "@/features/faq/data/faqItems";
import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";
import FaqInteractiveSection from "@/features/faq/FaqInteractiveSection";

export const metadata: Metadata = buildPageMetadata({
  path: "/faq",
  title: `Frequently Asked Questions (FAQ) | ${siteConfig.shortName}`,
  description:
    "Clear, straightforward answers about VeriWorkly: free PDF exports, ATS scoring, web portfolios, AI credits, passes, data privacy, and imports.",
  ogTitle: "Frequently Asked Questions About VeriWorkly",
  ogDescription:
    "Searchable answers on free document downloads, the ATS checker, web portfolios, AI credits, and data privacy.",
  twitterTitle: "VeriWorkly FAQ: Every Question Answered",
  twitterDescription:
    "Learn about free PDF downloads, ATS keyword matching, AI credits, and custom portfolio subdomains.",
  image: "/og/faq-page-og.png",
  imageAlt: "VeriWorkly FAQ",
  keywords: [
    "VeriWorkly FAQ",
    "AI resume builder questions",
    "free ATS checker FAQ",
    "AI credits explained",
    "resume builder pricing questions",
    "portfolio subdomain hosting",
  ],
});

const pageUrl = `${siteConfig.url}/faq`;

const FAQPage = () => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "FAQ", item: pageUrl },
    ],
  };

  const faqSchema = {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(faqSchema)} />

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />
        <div className="pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full bg-blue-500/5 blur-[130px]" />

        <section className="relative w-full overflow-hidden pt-28 pb-14 md:pt-36 md:pb-18">
          <div className="mx-auto max-w-4xl px-6 text-center md:px-8">
            <Reveal priority>
              <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs backdrop-blur-md">
                <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />

                <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                  Help Center & Knowledge Base
                </span>

                <span className="text-muted/60 font-mono text-[10px]">|</span>
                <span className="text-muted text-[11px]">{faqs.length} Answers</span>
              </div>
            </Reveal>

            <Reveal priority delay={0.06}>
              <h1 className="text-foreground mt-5 text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
                Frequently asked questions
              </h1>
            </Reveal>

            <Reveal priority delay={0.12}>
              <p className="text-muted mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
                Clear, honest answers about free PDF exports, ATS keyword matching, online
                portfolios, AI writing credits, and data privacy. Search below or browse by
                category.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {categories
                  .filter((cat) => cat.id !== "all")
                  .map((cat) => (
                    <span
                      key={cat.id}
                      className="border-border/60 bg-card/50 text-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-xs"
                    >
                      <cat.icon className="text-accent size-3.5" aria-hidden="true" />
                      <span>{cat.name}</span>
                    </span>
                  ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8 md:pb-24">
          <FaqInteractiveSection />
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8 md:pb-24">
          <Reveal className="border-border/60 bg-card/50 relative overflow-hidden rounded-3xl border p-8 shadow-xl backdrop-blur-md sm:p-12">
            <div className="bg-accent/10 pointer-events-none absolute top-0 right-0 size-80 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="space-y-2">
                <span className="text-accent block font-mono text-[10px] font-bold tracking-widest uppercase">
                  Still have questions?
                </span>
                <h2 className="text-foreground max-w-lg text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                  Ask directly, or explore the open-source repository
                </h2>
                <p className="text-muted max-w-md text-xs leading-relaxed sm:text-sm">
                  Every message to our support inbox reaches a real engineer. You can also inspect
                  the codebase or ask questions on GitHub.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="bg-accent text-accent-foreground inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
                >
                  <MessageSquare className="size-4" />
                  <span>Contact Support</span>
                </Link>

                <Link
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border/80 bg-background/60 text-foreground hover:bg-card inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
                >
                  <GithubIcon className="size-4" aria-hidden="true" />
                  <span>GitHub Repository</span>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        <InteractiveCTA />
      </div>
    </>
  );
};

export default FAQPage;
