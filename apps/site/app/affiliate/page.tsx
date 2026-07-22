import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import AffiliateNav from "@/features/affiliate/AffiliateNav";
import AffiliateFooter from "@/features/affiliate/AffiliateFooter";
import AffiliateHero from "@/features/affiliate/AffiliateHero";
import AffiliateTiers from "@/features/affiliate/AffiliateTiers";
import AffiliateCalculator from "@/features/affiliate/AffiliateCalculator";
import AffiliateBento from "@/features/affiliate/AffiliateBento";
import AffiliateComparison from "@/features/affiliate/AffiliateComparison";
import AffiliateResources from "@/features/affiliate/AffiliateResources";
import AffiliateFAQ from "@/features/affiliate/AffiliateFAQ";
import "./affiliate.css";

const pageUrl = `${siteConfig.url}/affiliate`;
const pageOgImage = `${siteConfig.url}/og/affiliate-page-og.png`;

export const metadata: Metadata = {
  title: "Partner Affiliate Program | VeriWorkly",
  description:
    "Join the VeriWorkly Affiliate Program. Help professionals build private portfolios and earn recurring commissions of 2%, 3%, or 5%.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
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
};

const AffiliatePage = () => {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(affiliateSchema) }}
      />

      <div className="bg-background text-foreground relative flex min-h-screen flex-col justify-between transition-colors duration-300">
        <div>
          <AffiliateNav />
          <AffiliateHero />
          <AffiliateTiers />
          <AffiliateCalculator />
          <AffiliateBento />
          <AffiliateComparison />
          <AffiliateResources />
          <AffiliateFAQ />
        </div>

        <AffiliateFooter />
      </div>
    </>
  );
};

export default AffiliatePage;
