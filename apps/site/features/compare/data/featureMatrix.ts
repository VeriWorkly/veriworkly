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
  portfolioBuilder: "Free core templates (Pro optional)",
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
    label: "Real free plan (no expiring trials)",
    category: "builder",
    description: "Build and update your resume anytime without countdown clocks or trial cutoffs.",
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
    label: "No watermarks or vendor logos",
    category: "builder",
    description: "Your resume looks 100% professional with zero branding or stamps from us.",
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
      "Get a live website on a custom subdomain (core templates free, pro templates optional).",
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
