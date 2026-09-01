import dynamic from "next/dynamic";

import type { Metadata } from "next";

import "./affiliate.css";

import { siteConfig } from "@/config/site";
import { jsonLdScriptProps } from "@/utils/json-ld";
import { isAffiliateProgramEnabled } from "@/lib/feature-flags";

import AffiliateNav from "@/features/affiliate/AffiliateNav";
import AffiliateFAQ from "@/features/affiliate/AffiliateFAQ";
import AffiliateHero from "@/features/affiliate/AffiliateHero";
import AffiliateTiers from "@/features/affiliate/AffiliateTiers";
import AffiliateBento from "@/features/affiliate/AffiliateBento";
import AffiliateFooter from "@/features/affiliate/AffiliateFooter";
import AffiliateResources from "@/features/affiliate/AffiliateResources";
import AffiliateComparison from "@/features/affiliate/AffiliateComparison";

const AffiliateCalculator = dynamic(() => import("@/features/affiliate/AffiliateCalculator"));

const pageUrl = `${siteConfig.url}/affiliate`;

const pageOgImage = `${siteConfig.url}/api/og?title=${encodeURIComponent(
  "Partner Affiliate Program",
)}&description=${encodeURIComponent(
  "Earn recurring commissions of 2%, 3%, or 5% referring VeriWorkly.",
)}`;

export const metadata: Metadata = {
  title: "Partner Affiliate Program | VeriWorkly",
  description:
    "Join the VeriWorkly Affiliate Program. Help professionals build private portfolios and earn recurring commissions of 2%, 3%, or 5%.",

  openGraph: {
    title: "Partner Affiliate Program | VeriWorkly",
    description:
      "Share a privacy-first resume and web portfolio builder. Earn recurring payouts starting at a low $25 threshold.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Affiliate Tiers",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Partner Affiliate Program | VeriWorkly",
    description: "Earn recurring commissions by promoting user sovereignty in career documents.",
    images: [pageOgImage],
  },

  alternates: {
    canonical: pageUrl,
  },
};

const AffiliatePage = () => {
  const programEnabled = isAffiliateProgramEnabled();

  const affiliateSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Affiliate Program",
    url: pageUrl,
    description:
      "Earn recurring partner commissions by sharing VeriWorkly with your professional network.",
  };

  return (
    <>
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
    </>
  );
};

export default AffiliatePage;
