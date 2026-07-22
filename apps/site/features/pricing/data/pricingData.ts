import { Crown, WandSparkles } from "lucide-react";

export type ProductKey = "ai_credits" | "portfolio_pro" | "bundle";
export type BillingInterval = "one_day" | "seven_day" | "monthly" | "annual";

export const comparisonRows = [
  ["Resume and cover letter editor", true, true, true, true],
  ["Private portfolio drafts", true, true, true, true],
  ["Public portfolio publishing", false, true, false, true],
  ["Custom subdomain and SEO controls", false, true, false, true],
  ["Portfolio analytics", false, true, false, true],
  ["AI writing credits", false, false, true, true],
  ["Watermark removal", false, true, false, true],
] as const;

export const customPlans = {
  portfolio_pro: {
    eyebrow: "Publish and grow",
    title: "Creator Pro",
    price: "$9.99",
    description: "For builders who want a polished public portfolio without the AI bundle.",
    icon: Crown,
    features: ["Public subdomain", "Analytics & views", "SEO meta controls", "No watermark"],
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
