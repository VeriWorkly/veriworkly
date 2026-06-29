import type { Metadata } from "next";

import Link from "next/link";

import { Card } from "@veriworkly/ui";
import { siteConfig } from "@/config/site";

import { faqs } from "./data/faqItems";

import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { FaqInteractiveSection } from "./components/FaqInteractiveSection";

const pageUrl = `${siteConfig.url}/faq`;
const pageOgImage = `${siteConfig.url}/og/faq-page-og.png`;

export const metadata: Metadata = {
  title: `Frequently Asked Questions: AI Credits & Features | ${siteConfig.shortName}`,
  description:
    "Got questions about templates, custom subdomains, local-first document creation, AI credits, or cloud backups? Read our FAQ.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: `Frequently Asked Questions: AI Credits & Features | ${siteConfig.shortName}`,
    description:
      "Got questions about templates, custom subdomains, local-first document creation, AI credits, or cloud backups? Read our FAQ.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `VeriWorkly FAQ`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Frequently Asked Questions | ${siteConfig.shortName}`,
    description:
      "Got questions about templates, custom subdomains, local-first document creation, or cloud backups? Read our FAQ.",
    images: [pageOgImage],
  },
};

const FAQPage = () => {
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
      <PublicPageShell
        eyebrow="FAQ"
        title="Frequently asked questions"
        secondaryAction={{ href: "/contact", label: "Contact Us" }}
        primaryAction={{ href: "https://app.veriworkly.com/dashboard", label: "Open Dashboard" }}
        description="Find clear answers to questions about documents, portfolios, subdomains, billing, and cloud backups."
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        <div className="space-y-12">
          <FaqInteractiveSection />

          <Card className="border-border bg-card space-y-4 rounded-3xl border p-6 shadow-[6px_6px_0_0_rgba(23,23,23,0.05)] md:p-8 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.03)]">
            <span className="text-xs font-black tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Open source
            </span>
            <h3 className="text-foreground text-lg font-bold">Contribute to VeriWorkly</h3>

            <p className="text-muted text-sm leading-6">
              VeriWorkly is open-source. Start by reading our contribution guidelines and checking
              open issues on GitHub.
            </p>

            <p className="text-sm">
              <Link
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.github}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Open GitHub repository
              </Link>
            </p>
          </Card>
        </div>
      </PublicPageShell>

      <section className="sr-only">
        <h2>VeriWorkly FAQ</h2>

        <p>
          Find answers about ATS-friendly documents, custom portfolio subdomains, template visual
          controls, privacy policies, and AI credits usage.
        </p>
      </section>
    </>
  );
};

export default FAQPage;
