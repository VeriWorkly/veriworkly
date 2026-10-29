import { siteConfig } from "@/config/site";
import { getDocumentTypeSummary } from "@/config/templates";
import { COMPETITORS } from "@/features/compare/data/competitors";

/**
 * Every share card the site draws. /api/og renders only these, and real releases and roadmap
 * items by id: arbitrary text would let anyone mint a VeriWorkly-branded card (W-080).
 */
export type OgCard = { title: string; description?: string };

export const OG_PAGES = {
  "ats-checker": {
    title: "Free ATS Resume Checker",
    description:
      "Score your resume against a job description with our deterministic, rules-based engine.",
  },
  "ats-checker-scan": {
    title: "Scan Your Resume",
    description: "Free ATS readiness and job match scoring.",
  },
  "ats-engine": {
    title: "VeriWorkly ATS Engine",
    description:
      "The open-source ATS resume parser and scorer for TypeScript: a published rubric, a rule-based score, runs in the browser.",
  },
  "brand-kit": {
    title: "Brand Kit",
    description: "Logos, colors, typography, and voice guidelines for VeriWorkly.",
  },
  "brand-kit-preview": {
    title: "One profile. Every document.",
    description: "Free AI resumes, cover letters and web portfolios. No login required to start.",
  },
  changelog: {
    title: "Changelog",
    description: "Every VeriWorkly release, generated straight from our public GitHub history.",
  },
  "changelog-missing": { title: "Changelog" },
  compare: {
    title: "Compare Resume Builders",
    description:
      "See how VeriWorkly compares to Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv on pricing, downloads, and ATS checks.",
  },
  "compare-missing": { title: "Not Found" },
  features: {
    title: "Platform Features & Career Tools",
    description:
      "AI resume tailoring, cover letter drafting, free ATS scoring, GitHub & LinkedIn imports, and web portfolios.",
  },
  "how-it-works": {
    title: "How VeriWorkly Works",
    description:
      "A privacy-first, local-first pipeline for resumes, cover letters, AI tailoring, and portfolios.",
  },
  pricing: {
    title: "Plans & Pricing",
    description: "Free resume builder, plus Creator Pro, AI Credits, and time-boxed passes.",
  },
  security: {
    title: "Security Architecture & Disclosure Policy",
    description:
      "Local-first browser sandboxes, Better Auth OTP verification, minimal OAuth scopes, and a 24 to 48 hour acknowledgement on every report.",
  },
  stats: {
    title: "Development & AI Platform Statistics",
    description: "Live issue, pull request, and completion-rate stats from our GitHub.",
  },
  affiliate: {
    title: "Partner Affiliate Program",
    description: "Earn recurring commissions of 2%, 3%, or 5% referring VeriWorkly.",
  },
  ambassador: {
    title: "Student Ambassador Program",
    description: "Represent VeriWorkly on campus. A founding cohort, read by a person.",
  },
} satisfies Record<string, OgCard>;

export type OgPageKey = keyof typeof OG_PAGES | `compare:${string}` | `templates:${string}`;

export const DEFAULT_OG_CARD: OgCard = {
  title: "VeriWorkly",
  description: "Building the future of professional resumes, one sync at a time.",
};

/** The card for a page key, or `null` for a key no page defines. */
export function ogPageCard(key: string): OgCard | null {
  if (Object.hasOwn(OG_PAGES, key)) return OG_PAGES[key as keyof typeof OG_PAGES];

  const [kind, id] = key.split(":");
  if (kind === "compare") {
    const competitor = COMPETITORS.find((entry) => entry.id === id);
    return competitor
      ? { title: `VeriWorkly vs ${competitor.name}`, description: competitor.positioning }
      : null;
  }
  if (kind === "templates" && id) {
    const docType = getDocumentTypeSummary(id);
    return docType ? { title: docType.pluralLabel, description: docType.description } : null;
  }
  return null;
}

type Theme = { theme?: "light" | "dark" };
const themed = (path: string, { theme }: Theme) => (theme === "dark" ? `${path}&theme=dark` : path);

/** Same-origin path, for an image shown on the site itself. */
export const ogPagePath = (key: OgPageKey, options: Theme = {}) =>
  themed(`/api/og?page=${encodeURIComponent(key)}`, options);

export const ogPageImage = (key: OgPageKey, options: Theme = {}) =>
  `${siteConfig.url}${ogPagePath(key, options)}`;

export const ogReleaseImage = (id: string) =>
  `${siteConfig.url}/api/og?changelog=${encodeURIComponent(id)}`;

export const ogRoadmapImage = (id: string) =>
  `${siteConfig.url}/api/og?roadmap=${encodeURIComponent(id)}`;
