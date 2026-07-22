import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import AmbassadorNav from "@/features/ambassador/AmbassadorNav";
import AmbassadorHero from "@/features/ambassador/AmbassadorHero";
import AmbassadorPerks from "@/features/ambassador/AmbassadorPerks";
import AmbassadorPlaybook from "@/features/ambassador/AmbassadorPlaybook";
import AmbassadorCalculator from "@/features/ambassador/AmbassadorCalculator";
import AmbassadorLeaderboard from "@/features/ambassador/AmbassadorLeaderboard";
import AmbassadorFAQ from "@/features/ambassador/AmbassadorFAQ";
import AmbassadorFooter from "@/features/ambassador/AmbassadorFooter";
import "./ambassador.css";

const pageUrl = `${siteConfig.url}/ambassador`;
const pageOgImage = `${siteConfig.url}/og/ambassador-page-og.png`;

export const metadata: Metadata = {
  title: "Student Ambassador Program | VeriWorkly",
  description:
    "Gated campus program for college students. Share local-first career editors, earn points for social shares or peer referrals, and unlock free Portfolio Pro access.",
  alternates: {
    canonical: pageUrl,
    languages: {
      "en-US": pageUrl,
    },
  },
  openGraph: {
    title: "Student Ambassador Program | VeriWorkly",
    description:
      "Help your peers build professional resumes and portfolios. Earn point multipliers and redeem them for free Portfolio Pro upgrades.",
    url: pageUrl,
    siteName: siteConfig.shortName,
    type: "website",
    images: [
      {
        url: pageOgImage,
        width: 1200,
        height: 630,
        alt: "VeriWorkly Student Ambassador Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Ambassador Program | VeriWorkly",
    description:
      "Earn campus points and redeem them for free Portfolio Pro access as a student ambassador.",
    images: [pageOgImage],
  },
};

const AmbassadorPage = () => {
  const ambassadorSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "VeriWorkly Student Ambassador Program",
    url: pageUrl,
    description:
      "Represent VeriWorkly on campus, earn points by sharing with peers, and get free Pro access.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ambassadorSchema) }}
      />

      <div className="bg-background relative min-h-screen">
        <AmbassadorNav />
        <AmbassadorHero />
        <AmbassadorPerks />
        <AmbassadorPlaybook />
        <AmbassadorCalculator />
        <AmbassadorLeaderboard />
        <AmbassadorFAQ />
        <AmbassadorFooter />
      </div>
    </>
  );
};

export default AmbassadorPage;
