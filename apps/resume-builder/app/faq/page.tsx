import type { Metadata } from "next";

import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@veriworkly/ui";
import { Card } from "@veriworkly/ui";

import { PublicPageShell } from "@/components/layout/PublicPageShell";

import { builderFaqs } from "./data/builderFaqs";
import { contributorFaqs } from "./data/contributorFaqs";

const pageUrl = `${siteConfig.url}/faq`;
const pageOgImage = `${siteConfig.url}/og/faq-page-og.png`;

function splitIntoColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      left.push(item);
      return;
    }

    right.push(item);
  });

  return [left, right];
}

export const metadata: Metadata = {
  title: `Resume Builder FAQ | ATS Resume, Privacy & Export Help`,
  description:
    "Answers about ATS-friendly resumes, templates, exports, privacy, and using VeriWorkly without login.",

  openGraph: {
    title: `Resume Builder FAQ | ${siteConfig.shortName}`,
    description:
      "Find answers about ATS resumes, resume templates, exports, privacy, and no-login resume creation.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: `VeriWorkly Resume Builder FAQ`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `Resume Builder FAQ | ${siteConfig.shortName}`,
    description:
      "Common questions about ATS resumes, templates, exports, privacy, and resume builder workflows.",
    images: [pageOgImage],
  },
};

const FAQPage = () => {
  const [builderLeftColumn, builderRightColumn] = splitIntoColumns(builderFaqs);
  const [contributorLeftColumn, contributorRightColumn] = splitIntoColumns(contributorFaqs);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: builderFaqs.map((faq) => ({
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
        secondaryAction={{ href: "/contact", label: "Contact" }}
        primaryAction={{ href: "/dashboard", label: "Open Dashboard" }}
        title="Frequently Asked Questions About VeriWorkly Resume Builder"
        description="Answers about ATS-friendly resumes, templates, exports, privacy, and no-login resume creation."
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />

        <section className="space-y-4" aria-labelledby="builder-faq-heading">
          <div className="space-y-2">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Builder FAQ
            </p>

            <h2
              id="builder-faq-heading"
              className="text-foreground text-2xl font-semibold tracking-tight"
            >
              ATS Resume Builder Questions for Job Seekers
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
            <Accordion type="single" collapsible className="gap-4">
              {builderLeftColumn.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Accordion type="single" collapsible className="gap-4">
              {builderRightColumn.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="contributor-faq-heading">
          <div className="space-y-2">
            <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
              Contributor FAQ
            </p>

            <h2
              id="contributor-faq-heading"
              className="text-foreground text-2xl font-semibold tracking-tight"
            >
              Contributor and Open Source Project Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
            <Accordion type="single" collapsible className="gap-4">
              {contributorLeftColumn.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Accordion type="single" collapsible className="gap-4">
              {contributorRightColumn.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Card className="space-y-3 p-6">
            <h3 className="text-foreground text-lg font-semibold">Contribute to VeriWorkly</h3>

            <p className="text-muted text-sm leading-6">
              Start by reading contribution guidelines and checking open issues.
            </p>

            <p className="text-sm">
              <Link
                target="_blank"
                rel="noreferrer"
                href={siteConfig.links.github}
                className="text-accent font-medium hover:underline"
              >
                Open GitHub repository
              </Link>
            </p>
          </Card>
        </section>
      </PublicPageShell>

      <section className="sr-only">
        <h2>ATS Resume Builder FAQ</h2>

        <p>
          Find answers about ATS-friendly resumes, resume templates, exports, privacy, and creating
          resumes without login using VeriWorkly.
        </p>
      </section>
    </>
  );
};

export default FAQPage;
