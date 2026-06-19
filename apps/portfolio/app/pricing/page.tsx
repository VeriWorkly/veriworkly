import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { pricingFaqs } from "@/features/faq/constants";

import Navigation from "@/components/Navigation";
import PricingFaq from "@/features/pricing/components/PricingFaq";
import ComparisonTable from "@/components/pricing/ComparisonTable";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import CustomPlansSection from "@/components/pricing/CustomPlansSection";
import BundlePricingSection from "@/components/pricing/BundlePricingSection";

export const metadata: Metadata = {
  title: "Portfolio Builder Pricing | VeriWorkly",
  description:
    "Build a VeriWorkly portfolio for free, preview templates, and upgrade when you are ready to publish with a subdomain, SEO metadata, analytics, and hosted media.",

  openGraph: {
    type: "website",
    url: "/pricing",
    title: "Portfolio Builder Pricing | VeriWorkly",
    description:
      "Build a VeriWorkly portfolio for free, preview templates, and upgrade when you are ready to publish with a subdomain, SEO metadata, analytics, and hosted media.",
    images: [
      {
        url: "/og/pricing-page-og.png",
        width: 1200,
        height: 630,
        alt: "VeriWorkly Portfolio Pricing",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Portfolio Builder Pricing | VeriWorkly",
    description:
      "Build a VeriWorkly portfolio for free, preview templates, and upgrade when you are ready to publish with a subdomain, SEO metadata, analytics, and hosted media.",
    images: ["/og/pricing-page-og.png"],
  },

  alternates: {
    canonical: "/pricing",
    languages: {
      "en-US": "/pricing",
    },
  },
};

export default function PricingPage() {
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",

    name: "VeriWorkly Portfolio Pro",
    description:
      "Publish a professional portfolio website on a custom VeriWorkly subdomain with SEO metadata, image hosting, and page views analytics.",

    brand: {
      "@type": "Brand",
      name: "VeriWorkly",
    },

    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "11.99",
      offerCount: "7",
      offers: [
        {
          "@type": "Offer",
          name: "Draft",
          price: "0",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Day Pass",
          price: "0.69",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Week Sprint",
          price: "3.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Full Bundle (Annual)",
          price: "9.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Full Bundle (Monthly)",
          price: "11.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Portfolio Pro Standalone",
          price: "8.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "AI Credits Standalone",
          price: "4.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pricingFaqs.map((faq) => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative min-h-dvh overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.14]" />

        <Navigation />

        <main className="relative z-10 w-full max-w-full overflow-x-clip pt-28">
          <BundlePricingSection />
          <CustomPlansSection />
          <ComparisonTable />
          <PricingFaq />
        </main>

        <PortfolioPublicFooter />
      </div>
    </>
  );
}
