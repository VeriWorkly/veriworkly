import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { PricingExperience } from "./pricing-experience";

export const metadata: Metadata = {
  title: "Pricing & AI Credit Packages | VeriWorkly",
  description:
    "Get flexible access to VeriWorkly Portfolio Pro and AI credits for resume tailoring. Choose daily, weekly, monthly, or yearly packages.",
  alternates: {
    canonical: `${siteConfig.url}/pricing`,
    languages: {
      "en-US": `${siteConfig.url}/pricing`,
    },
  },
  openGraph: {
    title: "Pricing & AI Credit Packages | VeriWorkly",
    description:
      "Get flexible access to VeriWorkly Portfolio Pro and AI credits for resume tailoring. Choose daily, weekly, monthly, or yearly packages.",
    url: `${siteConfig.url}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingExperience />;
}
