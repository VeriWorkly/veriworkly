import type { Metadata } from "next";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { buildPageMetadata } from "@/utils/metadata";
import { fetchInrPerUsd } from "@/features/pricing/services/exchange-rate";
import PricingExperience from "@/features/pricing/PricingExperience";

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
    "Free resume and cover letter editor. Add AI credits, portfolio hosting, or a 3-day/7-day pass — no forced bundle, no auto-renewal traps.",
  twitterTitle: "Free resume builder. Pay only if you need more.",
  twitterDescription:
    "Creator Pro, standalone AI credits, or a time-boxed job-hunt pass — pick exactly what your search needs.",
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

/**
 * Reads the session to decide whether checkout is unlocked. This is the only part of
 * /pricing that touches cookies, so it is isolated behind its own Suspense boundary —
 * otherwise the single `cookies()` call opts the entire route into dynamic rendering
 * and the whole page (all of it static marketing content) is re-rendered per visit.
 *
 * Split out like this, the shell is prerendered and only this subtree streams in.
 */
const PricingGate = async ({ inrPerUsd }: { inrPerUsd: number }) => {
  // Payments are currently not accepted across all environments during this phase
  const paymentsBlocked = true;

  return <PricingExperience paymentsBlocked={paymentsBlocked} inrPerUsd={inrPerUsd} />;
};

const PricingPage = async () => {
  // Resolved here, on the server, and shared by both the Suspense fallback and the gated
  // subtree so the two never disagree on a price mid-stream. Cached for 12h, with a
  // fallback baked in, so this cannot delay or fail the render.
  const inrPerUsd = await fetchInrPerUsd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(pricingSchema)}
      />

      {/*
        Fallback renders the identical page with checkout disabled. Every visitor except
        the admin resolves to exactly this, so there is no visible swap — and defaulting
        to "blocked" means a slow or failed session lookup can never flash an enabled
        checkout button. The backend re-checks regardless.
      */}
      <Suspense fallback={<PricingExperience paymentsBlocked inrPerUsd={inrPerUsd} />}>
        <PricingGate inrPerUsd={inrPerUsd} />
      </Suspense>
    </>
  );
};

export default PricingPage;
