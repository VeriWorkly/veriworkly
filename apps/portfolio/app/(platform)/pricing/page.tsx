import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/JsonLd";

import { pricingFaqs } from "@/features/faq/constants";
import { PAYMENTS_BLOCKED, aggregateOffer } from "@/features/pricing/data/offers";
import { PricingAccountProvider } from "@/features/pricing/components/PricingAccount";

import Navigation from "@/components/Navigation";
import PricingFaq from "@/features/pricing/components/PricingFaq";
import ComparisonTable from "@/components/pricing/ComparisonTable";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import CustomPlansSection from "@/components/pricing/CustomPlansSection";
import BundlePricingSection from "@/components/pricing/BundlePricingSection";

const description =
  "Publish a VeriWorkly portfolio on your own subdomain for free with Signal or Atelier. Creator Pro adds Nimbus and Cipher, SEO controls, visitor analytics and no badge.";

export const metadata: Metadata = {
  title: "Portfolio Builder Pricing",
  description,

  openGraph: {
    type: "website",
    url: "/pricing",
    title: "Portfolio Builder Pricing | VeriWorkly Portfolio",
    description,
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
    title: "Portfolio Builder Pricing | VeriWorkly Portfolio",
    description,
    images: ["/og/pricing-page-og.png"],
  },

  alternates: {
    canonical: "/pricing",
    languages: {
      "en-US": "/pricing",
    },
  },
};

const pageUrl = `${siteConfig.links.portfolio}/pricing`;

/** Static: the visitor's own plan is read in the browser by PricingAccountProvider (P-071). */
export default function PricingPage() {
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "VeriWorkly Portfolio",
    description,
    brand: { "@type": "Brand", name: "VeriWorkly" },
    offers: aggregateOffer(pageUrl),
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
      <JsonLd data={pricingSchema} />
      <JsonLd data={faqSchema} />

      <div className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative min-h-dvh overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.14]" />

        <Navigation />

        <main className="relative z-10 w-full max-w-full overflow-x-clip pt-28">
          {PAYMENTS_BLOCKED && (
            <div
              role="note"
              className="border-accent/30 bg-accent/5 text-ink mx-auto mt-8 w-[min(1160px,calc(100%-32px))] rounded-2xl border p-4 text-sm leading-6"
            >
              <strong className="font-bold">Paid plans open soon.</strong> Checkout is not open yet,
              so nothing can be bought today. You can build and preview a portfolio for free right
              now.
            </div>
          )}
          <PricingAccountProvider>
            <BundlePricingSection />
            <CustomPlansSection />
            <ComparisonTable />
          </PricingAccountProvider>
          <PricingFaq />
        </main>

        <PortfolioPublicFooter />
      </div>
    </>
  );
}
