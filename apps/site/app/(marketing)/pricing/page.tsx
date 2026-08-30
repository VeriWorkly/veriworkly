import type { Metadata } from "next";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";

import PricingExperience from "@/features/pricing/PricingExperience";
import { fetchInrPerUsd } from "@/features/pricing/services/exchange-rate";

const pageUrl = `${siteConfig.url}/pricing`;
const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Pricing & AI Credit Packages",
)}&description=${encodeURIComponent(
  "Free resume builder, plus Creator Pro, AI credits, and time-boxed passes.",
)}`;

export const metadata: Metadata = buildPageMetadata({
  path: "/pricing",
  title: "Pricing: Free Resume Builder & AI Credit Packages | VeriWorkly",
  description:
    "The resume and cover letter editor is free, no login required. Add portfolio hosting, AI credits, or a short-term job-hunt pass when you need them.",
  ogTitle: "Pay Only for What Your Job Search Actually Needs",
  ogDescription:
    "Free resume and cover letter editor. Add AI credits, portfolio hosting, or a 3-day/7-day pass - no forced bundle, no auto-renewal traps.",
  twitterTitle: "Free resume builder. Pay only if you need more.",
  twitterDescription:
    "Creator Pro, standalone AI credits, or a time-boxed job-hunt pass - pick exactly what your search needs.",
  image: pageOgImage,
  imageAlt: "VeriWorkly Pricing & AI Credit Packages",
  keywords: [
    "VeriWorkly pricing",
    "AI credit packages",
    "resume builder pricing",
    "portfolio hosting price",
    "AI resume tailoring cost",
  ],
});

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
    { "@type": "ListItem", position: 2, name: "Pricing", item: pageUrl },
  ],
};

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "VeriWorkly Career Workspace",
  description: siteConfig.description,
  url: pageUrl,
  brand: { "@type": "Brand", name: siteConfig.name },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "0",
    highPrice: "14.99",
    offerCount: "7",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "AI Standalone", price: "5.99", priceCurrency: "USD" },
      { "@type": "Offer", name: "Creator Pro", price: "9.99", priceCurrency: "USD" },
      {
        "@type": "Offer",
        name: "Job Hunter Bundle (monthly)",
        price: "14.99",
        priceCurrency: "USD",
      },
      {
        "@type": "Offer",
        name: "Job Hunter Bundle (annual, per month)",
        price: "11.99",
        priceCurrency: "USD",
      },
      { "@type": "Offer", name: "3-Day Sprint Pass", price: "2.99", priceCurrency: "USD" },
      { "@type": "Offer", name: "7-Day Hunt Pass", price: "5.99", priceCurrency: "USD" },
    ],
  },
};

const PricingGate = async ({ inrPerUsd }: { inrPerUsd: number }) => {
  const paymentsBlocked = true;

  return <PricingExperience paymentsBlocked={paymentsBlocked} inrPerUsd={inrPerUsd} />;
};

const PricingPage = async () => {
  const inrPerUsd = await fetchInrPerUsd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(pricingSchema)}
      />

      <Suspense fallback={<PricingExperience paymentsBlocked inrPerUsd={inrPerUsd} />}>
        <PricingGate inrPerUsd={inrPerUsd} />
      </Suspense>
    </>
  );
};

export default PricingPage;
