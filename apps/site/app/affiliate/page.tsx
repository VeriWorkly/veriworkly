import dynamic from "next/dynamic";

import type { Metadata } from "next";

import "./affiliate.css";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { webSiteRef } from "@/utils/schema";
import { buildPageMetadata } from "@/utils/metadata";
import { isAffiliateProgramEnabled } from "@/lib/feature-flags";

import AffiliateNav from "@/features/affiliate/AffiliateNav";
import AffiliateFAQ from "@/features/affiliate/AffiliateFAQ";
import AffiliateHero from "@/features/affiliate/AffiliateHero";
import AffiliateTiers from "@/features/affiliate/AffiliateTiers";
import AffiliateBento from "@/features/affiliate/AffiliateBento";
import AffiliateFooter from "@/features/affiliate/AffiliateFooter";
import AffiliateResources from "@/features/affiliate/AffiliateResources";
import AffiliateComparison from "@/features/affiliate/AffiliateComparison";
import { MotionIsland } from "@/providers/motion-island";
import { ogPageImage } from "@/features/og/cards";

const AffiliateCalculator = dynamic(() => import("@/features/affiliate/AffiliateCalculator"));

const pageUrl = `${siteConfig.url}/affiliate`;

const pageOgImage = ogPageImage("affiliate");

// Flags come from the runtime env (the build does not pass them), so re-read them every 5 minutes.
export const revalidate = 300;

// Kept out of the index while sign-ups are closed: the page can only say "open soon".
export function generateMetadata(): Metadata {
  return buildPageMetadata({
    path: "/affiliate",
    noIndex: !isAffiliateProgramEnabled(),

    title: `Partner Affiliate Program | ${siteConfig.shortName}`,
    description:
      "The VeriWorkly Affiliate Program: help professionals build private portfolios and earn recurring commissions of 2%, 3%, or 5%.",

    ogTitle: "Partner Affiliate Program",
    ogDescription:
      "Share a privacy-first resume and web portfolio builder. Payouts are reviewed by hand once your balance reaches $25.",

    twitterTitle: "VeriWorkly Partner Affiliate Program",
    twitterDescription: "Recurring commissions of 2%, 3%, or 5% for referring VeriWorkly.",

    image: pageOgImage,
    imageAlt: "VeriWorkly Affiliate Tiers",
  });
}

const AffiliatePage = async () => {
  const programEnabled = isAffiliateProgramEnabled();

  const affiliateSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Affiliate Program",
    url: pageUrl,
    isPartOf: webSiteRef,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "Affiliate Program", item: pageUrl },
      ],
    },
    description:
      "Earn recurring partner commissions by sharing VeriWorkly with your professional network.",
  };

  return (
    <MotionIsland>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScriptProps(affiliateSchema)}
      />

      <div className="bg-background text-foreground relative flex min-h-screen flex-col justify-between transition-colors duration-300">
        <div>
          <AffiliateNav />

          <main>
            <AffiliateHero programEnabled={programEnabled} />
            <AffiliateTiers />
            <AffiliateCalculator />
            <AffiliateBento />
            <AffiliateComparison />
            <AffiliateResources />
            <AffiliateFAQ />
          </main>
        </div>

        <AffiliateFooter />
      </div>
    </MotionIsland>
  );
};

export default AffiliatePage;
