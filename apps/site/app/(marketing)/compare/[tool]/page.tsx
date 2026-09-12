import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  COMPETITORS,
  CompareVsHero,
  getCompetitor,
  CompareCaveatNote,
  CompareHighlights,
  CompareFAQSection,
  FeatureMatrixTable,
  ComparePricingSection,
  CompareDeepDiveSection,
} from "@/features/compare";

import { Container } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

interface PageProps {
  params: Promise<{ tool: string }>;
}

export function generateStaticParams() {
  return COMPETITORS.map((competitor) => ({ tool: competitor.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tool } = await params;
  const competitor = getCompetitor(tool);

  if (!competitor) {
    return buildPageMetadata({
      path: `/compare/${tool}`,

      title: "Comparison Not Found | VeriWorkly",
      description: "This comparison is not available on VeriWorkly yet.",

      ogTitle: "Comparison Not Found",
      ogDescription: "This comparison is not available on VeriWorkly yet.",

      twitterTitle: "Comparison Not Found",
      twitterDescription: "This comparison is not available on VeriWorkly yet.",

      image: "/api/og?title=Not%20Found",

      noIndex: true,
    });
  }

  const ogImage = `/api/og?title=${encodeURIComponent(
    `VeriWorkly vs ${competitor.name}`,
  )}&description=${encodeURIComponent(competitor.positioning)}`;

  return buildPageMetadata({
    path: `/compare/${competitor.id}`,

    title: `VeriWorkly vs ${competitor.name}: Features, Pricing & ATS Compared | ${siteConfig.shortName}`,
    description: `Honest side-by-side comparison of VeriWorkly vs ${competitor.name}. Compare ATS keyword scoring, download limits, pricing models, and account requirements. ${competitor.positioning}`,

    ogTitle: `VeriWorkly vs ${competitor.name}: Features & Pricing Compared`,
    ogDescription: competitor.verdict,

    twitterTitle: `VeriWorkly vs ${competitor.name}`,
    twitterDescription: competitor.pricingSummary,

    image: ogImage,
    imageAlt: `VeriWorkly vs ${competitor.name}`,

    keywords: [
      `VeriWorkly vs ${competitor.name}`,
      `${competitor.name} alternative`,
      `${competitor.name} vs VeriWorkly`,
      `free ${competitor.name} alternative`,
      `${competitor.name} pricing comparison`,
      `${competitor.name} ATS checker alternative`,
      "free resume builder no watermark",
      `best resume builder ${new Date().getFullYear()}`,
    ],
  });
}

const CompareToolPage = async ({ params }: PageProps) => {
  const { tool } = await params;

  const competitor = getCompetitor(tool);

  if (!competitor) notFound();

  const pageUrl = `${siteConfig.url}/compare/${competitor.id}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${siteConfig.url}/compare` },
      {
        "@type": "ListItem",
        position: 3,
        name: `VeriWorkly vs ${competitor.name}`,
        item: pageUrl,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `VeriWorkly vs ${competitor.name} Comparison`,
    description: competitor.verdict,
    url: pageUrl,
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "VeriWorkly Career Workspace",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  };

  const faqSchema =
    competitor.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: competitor.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  const otherCompetitors = COMPETITORS.filter((c) => c.id !== competitor.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(softwareAppSchema)}
      />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(faqSchema)} />
      )}

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
        <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />

        <div
          className="pointer-events-none absolute top-32 -right-24 -z-10 h-140 w-140 rounded-full opacity-[0.06] blur-[160px]"
          style={{ backgroundColor: competitor.color }}
        />

        <Container className="space-y-12 pt-28 pb-24 lg:pt-36">
          <div>
            <Link
              href="/compare"
              className="text-muted hover:text-foreground group inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
              />
              <span>All resume builder comparisons</span>
            </Link>
          </div>

          <CompareVsHero competitor={competitor} />

          <CompareHighlights competitor={competitor} />

          <CompareDeepDiveSection competitor={competitor} />

          <section className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Detailed Feature Matrix
              </span>

              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Feature-by-feature breakdown
              </h2>

              <p className="text-muted max-w-2xl text-sm">
                Check exact capabilities across account access, file downloads, ATS scoring, and
                portfolio tools.
              </p>
            </div>

            <FeatureMatrixTable competitor={competitor} />
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Pricing Comparison
              </span>

              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Simple, transparent pricing comparison
              </h2>

              <p className="text-muted max-w-2xl text-sm">
                A clear look at costs without hidden renewal traps or surprise download fees.
              </p>
            </div>

            <ComparePricingSection competitor={competitor} />
            <CompareCaveatNote competitorName={competitor.name} />
          </section>

          <CompareFAQSection competitor={competitor} />

          <section className="border-border/40 space-y-6 border-t pt-12">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                  More Comparisons
                </span>

                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  Compare other resume builders
                </h3>
              </div>

              <Link
                href="/compare"
                className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline sm:text-sm"
              >
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {otherCompetitors.map((other) => (
                <Link
                  key={other.id}
                  href={`/compare/${other.id}`}
                  className="border-border/60 bg-card/40 hover:border-accent/40 hover:bg-card/70 flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: other.color }}
                  >
                    {other.initials}
                  </div>

                  <div className="min-w-0">
                    <span className="text-foreground block truncate text-xs font-semibold">
                      vs {other.name}
                    </span>

                    <span className="text-muted block truncate text-[10px]">
                      {other.pricingModel.split("-")[0]?.trim() || other.pricingModel}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="border-border/60 bg-card/40 relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-10 text-center shadow-lg backdrop-blur-sm sm:p-12">
            <div className="bg-accent/10 pointer-events-none absolute top-0 left-1/2 size-80 -translate-x-1/2 rounded-full blur-3xl" />

            <span className="bg-accent/15 text-accent border-accent/30 rounded-full border px-3 py-1 font-mono text-[10px] font-bold tracking-wider uppercase">
              Free to Start • No Credit Card
            </span>

            <h2 className="text-foreground relative max-w-xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Build your resume on VeriWorkly for free
            </h2>

            <p className="text-muted relative max-w-lg text-sm leading-relaxed sm:text-base">
              No account wall, no watermarks on downloads, and no credit card required. Build your
              resume, cover letter, or portfolio in seconds.
            </p>

            <Link
              href={siteConfig.links.app}
              className="bg-accent text-accent-foreground relative inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold shadow-md transition duration-200 ease-out hover:opacity-90 active:scale-[0.97]"
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

export default CompareToolPage;
