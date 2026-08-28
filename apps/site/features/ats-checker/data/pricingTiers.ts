import { siteConfig } from "@/config/site";

export const ATS_TIERS = [
  {
    name: "No Account",
    price: "Free",
    period: "forever",
    note: "1 scan every 48 hours",
    badge: "Instant Scan",
    cta: { label: "Scan a Resume", href: "/ats-checker/scan" },
    features: [
      "ATS readiness & job match scores",
      "Verdict: strong, needs work, or weak",
      "Per-area breakdown of where points were lost",
      "Your single highest-impact fix",
    ],
    highlight: false,
  },
  {
    name: "Free Account",
    price: "Free",
    period: "forever",
    note: "2 scans every 24 hours",
    badge: "Recommended",
    cta: { label: "Create Free Account", href: `${siteConfig.links.app}/login` },
    features: [
      "Everything in No Account tier",
      "Full pass/fail evidence per rule",
      "Complete matched and missing keyword lists",
      "All fixes ranked by points recovered",
      "Copy the whole report as structured text",
    ],
    highlight: true,
  },
  {
    name: "AI Plan",
    price: "$5.99",
    period: "/ month",
    note: "300 scans per billing cycle",
    badge: "Power User",
    cta: { label: "View AI Plans", href: "/pricing" },
    features: [
      "Everything in Free Account tier",
      "Deep AI explanation of scoring nuances",
      "Missing-evidence detection and rewrites",
      "Edits ranked by recruiter hiring impact",
      "Analyze job postings directly from URL",
    ],
    highlight: false,
  },
] as const;
