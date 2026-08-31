import { Crown, WandSparkles } from "lucide-react";

export type ProductKey = "ai_credits" | "portfolio_pro" | "bundle";
export type BillingInterval = "one_day" | "seven_day" | "monthly" | "annual";

/**
 * Portfolio rows follow the launch model enforced in
 * `apps/server` (`portfolioService.publish`): Signal and Atelier are the free core
 * templates, Nimbus and Cipher require a subscription, and the "Built with
 * VeriWorkly" badge is removed by the `watermark_removal` entitlement.
 *
 * Document exports carry no watermark on any tier - the badge row below is
 * portfolio-only, and is labelled so it cannot be read as a document watermark.
 */
export const comparisonRows = [
  ["Resume and cover letter editor", true, true, true, true],
  ["Document exports (PDF, DOCX, MD, HTML, TXT, JSON)", true, true, true, true],
  ["Private portfolio drafts", true, true, true, true],
  ["Publish a portfolio on a veriworkly.com subdomain", true, true, true, true],
  ["Core portfolio templates (Signal, Atelier)", true, true, true, true],
  ["Premium portfolio templates (Nimbus, Cipher)", false, true, false, true],
  ["Remove the portfolio “Built with VeriWorkly” badge", false, true, false, true],
  ["Portfolio SEO controls", false, true, false, true],
  ["Portfolio analytics", false, true, false, true],
  ["AI writing credits", false, false, true, true],
] as const;

export const customPlans = {
  portfolio_pro: {
    eyebrow: "Publish and grow",
    title: "Creator Pro",
    price: "$9.99",
    description: "For builders who want a polished public portfolio without the AI bundle.",
    icon: Crown,
    features: [
      "Premium templates (Nimbus, Cipher)",
      "No “Built with VeriWorkly” badge",
      "Analytics & views",
      "SEO meta controls",
    ],
  },
  ai_credits: {
    eyebrow: "Write with momentum",
    title: "AI Standalone",
    price: "$5.99",
    description: "For focused writing help across resumes, cover letters, and portfolio content.",
    icon: WandSparkles,
    features: [
      "1,000 monthly credits",
      "Tailor documents & bios",
      "ATS Score optimization",
      "Credits tracked clearly",
    ],
  },
} as const;
