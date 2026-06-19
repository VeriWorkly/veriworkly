import type { Metadata } from "next";

import { faqs } from "@/features/faq/constants";

import Navigation from "@/components/Navigation";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";

import SupportSidebar from "@/features/faq/components/SupportSidebar";
import FaqInteractiveSection from "@/features/faq/components/FaqInteractiveSection";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | VeriWorkly Portfolio",
  description:
    "Got questions about our portfolio builder, pricing plans, subdomains, or media hosting? Read our detailed FAQ list and find out how we can help you build your presence.",

  openGraph: {
    type: "website",
    url: "/faq",
    title: "Frequently Asked Questions | VeriWorkly Portfolio",
    description:
      "Got questions about our portfolio builder, pricing plans, subdomains, or media hosting? Read our detailed FAQ list and find out how we can help you build your presence.",
    images: [
      {
        url: "/og/faq-page-og.png",
        width: 1200,
        height: 630,
        alt: "Frequently Asked Questions | VeriWorkly Portfolio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions | VeriWorkly Portfolio",
    description:
      "Got questions about our portfolio builder, pricing plans, subdomains, or media hosting? Read our detailed FAQ list and find out how we can help you build your presence.",
    images: ["/og/faq-page-og.png"],
  },

  alternates: {
    canonical: "/faq",
    languages: {
      "en-US": "/faq",
    },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative min-h-dvh">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.14]" />
        <div className="bg-accent/6 pointer-events-none absolute top-40 right-0 size-96 rounded-full blur-3xl" />
        <div className="bg-accent/4 pointer-events-none absolute top-150 left-0 size-96 rounded-full blur-3xl" />

        <Navigation />

        <main className="relative z-10 w-full max-w-full pt-28 pb-20">
          <section className="mx-auto w-[min(1160px,calc(100%-32px))] pt-16 lg:pt-24">
            <FaqInteractiveSection sidebar={<SupportSidebar />} />
          </section>
        </main>

        <PortfolioPublicFooter />
      </div>
    </>
  );
};

export default FAQPage;
