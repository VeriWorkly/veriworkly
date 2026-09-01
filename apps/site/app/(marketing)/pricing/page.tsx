import type { Metadata } from "next";

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

/**
 * Structured data that disagrees with the page is a manual-action risk, and every paid
 * offer below is currently unbuyable - checkout throws for all callers during this
 * phase (see PAYMENTS_BLOCKED).
 *
 * Rather than delete the offers, which would lose the pricing rich result entirely,
 * they are marked PreOrder so the markup states what the page states. The free tier is
 * genuinely available now, so it keeps InStock. Flip `PAID_AVAILABILITY` to InStock in
 * the same change that opens payments.
 */
const PAID_AVAILABILITY = "https://schema.org/PreOrder";
const FREE_AVAILABILITY = "https://schema.org/InStock";

/**
 * One array, everything derived. `offerCount`, `lowPrice`, and `highPrice` were all
 * hardcoded alongside the list, so adding or repricing an offer silently produced
 * markup that contradicted itself. Every offer also carries `url` - without one an
 * offer is not actionable and cannot produce a rich result.
 */
const PRICING_OFFERS = [
  { name: "Free", price: 0, free: true },
  { name: "3-Day Sprint Pass", price: 2.99 },
  { name: "AI Standalone", price: 5.99 },
  { name: "7-Day Hunt Pass", price: 5.99 },
  { name: "Creator Pro", price: 9.99 },
  { name: "Job Hunter Bundle (annual, per month)", price: 11.99 },
  { name: "Job Hunter Bundle (monthly)", price: 14.99 },
] as const;

const offerPrices = PRICING_OFFERS.map((offer) => offer.price);

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
    lowPrice: Math.min(...offerPrices).toFixed(2),
    highPrice: Math.max(...offerPrices).toFixed(2),
    offerCount: String(PRICING_OFFERS.length),
    offers: PRICING_OFFERS.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price.toFixed(2),
      priceCurrency: "USD",
      url: pageUrl,
      availability: "free" in offer && offer.free ? FREE_AVAILABILITY : PAID_AVAILABILITY,
    })),
  },
};

/**
 * Payments are off for everyone during this phase, matching the server: checkout
 * throws for every caller, and `portfolioController` refuses to publish for any
 * non-admin email.
 *
 * This is a flat constant rather than a per-user computation on purpose. The marketing
 * site has no session - it never reads the user - so it cannot tell whether the visitor
 * is the admin, and a previous comment here claimed it resolved `ADMIN_EMAIL`
 * server-side, which it never did. The admin exercises checkout from the studio, where
 * the session actually exists. When payments open, flip this to `false`.
 */
const PAYMENTS_BLOCKED = true;

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

      {/*
        No Suspense boundary here. The only await on this page is fetchInrPerUsd
        above, which resolves before render; the wrapper that used to sit here
        awaited nothing, so it never suspended and its fallback - a second full
        copy of the PricingExperience client tree - was pure weight.
      */}
      <PricingExperience paymentsBlocked={PAYMENTS_BLOCKED} inrPerUsd={inrPerUsd} />
    </>
  );
};

export default PricingPage;
