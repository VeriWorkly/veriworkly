import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import { PageHero, PageClosing, PageSection } from "@/components/marketing/PageLayout";
import { LandingButton } from "@/components/marketing/LandingButton";

import { faqs, categories } from "@/features/faq/data/faqItems";
import { FAQ_IDS } from "@/features/ats-engine/data/content";
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

  // The ATS Engine questions are answered on /ats-engine, which carries their FAQPage
  // markup. They stay visible here, but only one page should mark up a given question.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((faq) => !FAQ_IDS.includes(faq.id))
      .map((faq) => ({
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

      <PageHero
        title="Questions,"
        highlight="answered."
        lede="Straight answers on free exports, ATS matching, portfolios, AI credits and what happens to your data. Search, or pick a topic."
        aside={
          <p className="text-base">
            <span className="font-semibold tabular-nums">{faqs.length}</span> answers across{" "}
            <span className="font-semibold tabular-nums">{categories.length - 1}</span> topics.
          </p>
        }
      />

      <FaqInteractiveSection />

      <PageSection
        tone="card"
        className="border-t"
        title="Still have a question?"
        lede="Every message to our support inbox reaches a real engineer. You can also inspect the codebase or ask questions on GitHub."
      >
        <div className="flex flex-wrap gap-3">
          <LandingButton showArrow size="lg" variant="solid" href="/contact">
            Contact support
          </LandingButton>
          <LandingButton size="lg" variant="outline" href={siteConfig.links.github} target="_blank">
            GitHub repository
          </LandingButton>
        </div>
      </PageSection>

      <PageClosing />
    </>
  );
};

export default FAQPage;
