import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { jsonLdScriptProps } from "@/utils/json-ld";
import { organizationRef } from "@/utils/schema";
import { PRICING_OFFERS, toSchemaOffer } from "@/features/pricing/data/offers";
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
    "Free resume and cover letter editor. Add AI credits, portfolio hosting, or a 3-day/7-day pass that expires instead of renewing.",
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

const PAYMENTS_BLOCKED = true;

const offerPrices = PRICING_OFFERS.map((offer) => offer.price);

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${pageUrl}#product`,
  name: siteConfig.name,
  description: siteConfig.description,
  url: pageUrl,
  brand: organizationRef,
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: Math.min(...offerPrices).toFixed(2),
    highPrice: Math.max(...offerPrices).toFixed(2),
    offerCount: String(PRICING_OFFERS.length),
    offers: PRICING_OFFERS.map((offer) => toSchemaOffer(offer, pageUrl, PAYMENTS_BLOCKED)),
  },
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

      <PricingExperience paymentsBlocked={PAYMENTS_BLOCKED} inrPerUsd={inrPerUsd} />
    </>
  );
};

export default PricingPage;
