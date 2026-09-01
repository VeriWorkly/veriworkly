import type { CompetitorFeatureMatrix, FeatureRowItem } from "../types";

export const PRICING_VERIFIED_AT = "August 2026";

export const VERIWORKLY_MATRIX: CompetitorFeatureMatrix = {
  loginRequired: "No login needed",
  localFirst: true,
  openSource: true,
  freePlan: true,
  freeExport: "Unlimited free downloads",
  watermarkFree: true,
  atsChecker: "Matches job description",
  coverLetterBuilder: true,
  portfolioBuilder: "Free core templates, premium optional (at launch)",
  multiFormatExport: "PDF, Word (DOCX) & Markdown",
  linkedinImport: true,
  githubImport: true,
};

export const FEATURE_CATEGORIES = [
  { id: "access", label: "Getting Started & Privacy" },
  { id: "builder", label: "Building & Downloading" },
  { id: "ats", label: "ATS & AI Tailoring" },
  { id: "integrations", label: "Imports & Online Portfolio" },
] as const;

export const FEATURE_ROWS: FeatureRowItem[] = [
  {
    key: "loginRequired",
    label: "Account required before you can start",
    category: "access",
    description:
      "Start editing right away in your browser without giving your email or phone number.",
  },
  {
    key: "localFirst",
    label: "Private storage (data stays on your device)",
    category: "access",
    description:
      "Your resume stays safely in your own browser until you decide to turn on cloud sync.",
  },
  {
    key: "openSource",
    label: "Open source code",
    category: "access",
    description: "Transparent code you can trust, with no sneaky tracking or locked-in formats.",
  },
  {
    key: "freePlan",
    // Accurate again as of Sep 2026: trials were removed from the product entirely
    // (see billingService.createCheckoutSession), so there is no expiring trial on any
    // plan. The free tier is how you try VeriWorkly.
    label: "Real free plan (no expiring trials)",
    category: "builder",
    description:
      "The free tier is permanent, not a countdown. We do not run free trials at all — nothing converts to a paid charge behind your back. Try it on the free plan for as long as you like, and subscribe only if you want the paid features.",
  },
  {
    key: "freeExport",
    label: "Free, unlimited downloads",
    category: "builder",
    description:
      "Download your finished document as many times as you need without paying per file.",
  },
  {
    key: "watermarkFree",
    // Scoped to documents on purpose. Free published portfolios do carry a small
    // "Built with VeriWorkly" badge, which paid plans remove - stating this row
    // unqualified read as covering portfolios too.
    label: "No watermarks on downloaded documents",
    category: "builder",
    description:
      "Every resume and cover letter you export is free of our branding on every tier. (Free published portfolios carry a small badge, which paid plans remove.)",
  },
  {
    key: "multiFormatExport",
    label: "Multiple download formats (PDF, Word, Markdown)",
    category: "builder",
    description:
      "Send recruiters the exact file type they ask for, including editable Word documents.",
  },
  {
    key: "atsChecker",
    label: "ATS checker matching target job posts",
    category: "ats",
    description: "Paste a job post to see the exact missing skills and keywords you need to add.",
  },
  {
    key: "coverLetterBuilder",
    label: "Cover letter writer and editor",
    category: "builder",
    description: "Create matching cover letters that fit your resume style and tone in minutes.",
  },
  {
    key: "portfolioBuilder",
    label: "Personal website & portfolio builder",
    category: "integrations",
    description:
      "Publish a website on a veriworkly.com subdomain. Free core templates carry a small badge; premium templates and badge removal are paid. Opening at launch.",
  },
  {
    key: "linkedinImport",
    label: "Import from LinkedIn",
    category: "integrations",
    description: "Bring your work history directly from your LinkedIn profile export in seconds.",
  },
  {
    key: "githubImport",
    label: "Import from GitHub",
    category: "integrations",
    description:
      "Show off your repositories, top languages, and stars right on your personal page.",
  },
];
