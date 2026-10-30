import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { isAdminUser } from "@/lib/admin";
import { fetchServerApiData } from "@/lib/server-api";
import { JsonLd } from "@/components/JsonLd";

import { pricingFaqs } from "@/features/faq/constants";

import Navigation from "@/components/Navigation";
import PricingFaq from "@/features/pricing/components/PricingFaq";
import ComparisonTable from "@/components/pricing/ComparisonTable";
import PortfolioPublicFooter from "@/components/PortfolioPublicFooter";
import CustomPlansSection from "@/components/pricing/CustomPlansSection";
import BundlePricingSection from "@/components/pricing/BundlePricingSection";

export const metadata: Metadata = {
  title: "Portfolio Builder Pricing",
  description:
    "Publish a VeriWorkly portfolio on your own subdomain for free, and upgrade for premium templates, custom metadata, visitor analytics, and no watermark.",

  openGraph: {
    type: "website",
    url: "/pricing",
    title: "Portfolio Builder Pricing | VeriWorkly Portfolio",
    description:
      "Publish a VeriWorkly portfolio on your own subdomain for free, and upgrade for premium templates, custom metadata, visitor analytics, and no watermark.",
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
    description:
      "Publish a VeriWorkly portfolio on your own subdomain for free, and upgrade for premium templates, custom metadata, visitor analytics, and no watermark.",
    images: ["/og/pricing-page-og.png"],
  },

  alternates: {
    canonical: "/pricing",
    languages: {
      "en-US": "/pricing",
    },
  },
};

export default async function PricingPage() {
  // An outage only hides the admin checkout, so it must not fail the public pricing page.
  const user = await fetchServerApiData<{ email: string | null }>("/users/me").catch(() => null);
  const isProd = process.env.NODE_ENV === "production";
  const paymentsBlocked = isProd && !isAdminUser(user);

  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",

    name: "VeriWorkly Creator Pro",
    description:
      "Premium templates, SEO metadata, image hosting, visitor analytics and no badge for a portfolio website on your VeriWorkly subdomain.",

    brand: {
      "@type": "Brand",
      name: "VeriWorkly",
    },

    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "14.99",
      offerCount: "8",
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "3-Day Sprint",
          price: "2.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "7-Day Hunt",
          price: "5.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Creator Pro (Annual)",
          price: "7.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Creator Pro (Monthly)",
          price: "9.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Job Hunter Bundle (Annual)",
          price: "11.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "Job Hunter Bundle (Monthly)",
          price: "14.99",
          priceCurrency: "USD",
          url: `${siteConfig.links.portfolio}/pricing`,
        },

        {
          "@type": "Offer",
          name: "AI Credits Standalone",
          price: "5.99",
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
      <JsonLd data={pricingSchema} />
      <JsonLd data={faqSchema} />

      <div className="text-ink-2 selection:bg-accent selection:text-accent-ink bg-paper relative min-h-dvh overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(var(--color-ink)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-[0.14]" />

        <Navigation />

        <main className="relative z-10 w-full max-w-full overflow-x-clip pt-28">
          {paymentsBlocked && (
            <div className="border-warning bg-warning-soft/30 text-warning mx-auto mt-8 w-[min(1160px,calc(100%-32px))] rounded-2xl border p-4 text-sm font-semibold">
              Payments are disabled in production during this phase. Only system administrators can
              perform checkouts.
            </div>
          )}
          <BundlePricingSection paymentsBlocked={paymentsBlocked} />
          <CustomPlansSection paymentsBlocked={paymentsBlocked} />
          <ComparisonTable paymentsBlocked={paymentsBlocked} />
          <PricingFaq />
        </main>

        <PortfolioPublicFooter />
      </div>
    </>
  );
}
