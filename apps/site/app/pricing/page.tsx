import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { PricingExperience } from "./pricing-experience";

export const metadata: Metadata = {
  title: "Pricing | VeriWorkly",
  description:
    "Choose flexible VeriWorkly access for a day, a week, a month, or a year. Bundle Portfolio Pro with AI credits or select only what you need.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Simple, flexible pricing | VeriWorkly",
    description: "One-day access, a seven-day sprint, or the complete yearly VeriWorkly bundle.",
    url: `${siteConfig.url}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingExperience />;
}
