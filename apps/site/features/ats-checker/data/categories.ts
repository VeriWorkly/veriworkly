import {
  AtSign,
  FileSearch,
  LayoutList,
  ShieldAlert,
  Type,
  Gauge,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type ScoreTone = "good" | "warn" | "bad";

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; blurb: string }> = {
  parse: {
    label: "Parsing",
    icon: FileSearch,
    blurb: "Whether a parser can read the document at all: length, encoding, and stray glyphs.",
  },
  contact: {
    label: "Contact & links",
    icon: AtSign,
    blurb: "Email, phone, and a professional link, placed where an ATS looks for them.",
  },
  structure: {
    label: "Structure",
    icon: LayoutList,
    blurb: "Clearly labelled Experience, Education, and Skills sections an ATS can map.",
  },
  content: {
    label: "Evidence",
    icon: Type,
    blurb: "Action verbs, quantified outcomes, and length a recruiter can skim.",
  },
  format: {
    label: "Format risk",
    icon: ShieldAlert,
    blurb: "Tables, columns, and repeated headers that scramble content during extraction.",
  },
};

const CATEGORY_ORDER = ["parse", "contact", "structure", "content", "format"];

export function categoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      label: category.charAt(0).toUpperCase() + category.slice(1),
      icon: FileSearch,
      blurb: "",
    }
  );
}

export function sortByCategoryOrder<T extends { category: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = CATEGORY_ORDER.indexOf(a.category);
    const right = CATEGORY_ORDER.indexOf(b.category);
    return (
      (left === -1 ? CATEGORY_ORDER.length : left) - (right === -1 ? CATEGORY_ORDER.length : right)
    );
  });
}

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

export const TONE_CLASSES: Record<ScoreTone, { text: string; fill: string; chip: string }> = {
  good: {
    text: "text-emerald-700 dark:text-emerald-400",
    fill: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  warn: {
    text: "text-amber-700 dark:text-amber-400",
    fill: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  bad: {
    text: "text-red-700 dark:text-red-400",
    fill: "bg-red-500",
    chip: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

/**
 * Every claim here maps to a rule the engine actually runs. Keep it that way: if a check is
 * removed from the policy, the line describing it comes out of this list too.
 */
export const SCORING_DIMENSIONS = [
  {
    icon: FileSearch,
    title: "Parsing & Layout Integrity",
    badge: "Format Sanity",
    body: "On an uploaded PDF we read the page geometry, not just the text: whether lines split across a column gutter, and whether content sits inside ruled table grids. Both scramble the order your text comes out in.",
    checks: [
      "Column-gutter detection on PDF uploads",
      "Ruled table grid detection",
      "Emoji bullets and page-footer artifacts",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Contact & Section Headings",
    badge: "Search Indexing",
    body: "Email, phone, and a professional link, plus Experience, Education, and Skills headings that parsers map into searchable profile fields. Headings must be real headings — the word appearing mid-sentence does not count.",
    checks: [
      "Contact details in the first quarter",
      "Headings matched on their own line",
      "Standard employment date ranges",
    ],
  },
  {
    icon: Type,
    title: "Evidence & Impact Quality",
    badge: "Impact Weight",
    body: "Quantified outcomes and action verbs, scored by the share of your bullets that carry them rather than by whether they appear at all — a single strong verb in the document is not the same as a resume written in them.",
    checks: [
      "Metric & percentage density per bullet",
      "Share of bullets opening with an action verb",
      "Generic filler phrase detection",
    ],
  },
  {
    icon: Gauge,
    title: "Job Match & Keywords",
    badge: "Semantic Fit",
    body: "Keyword matching against a pasted job description. The posting is split into sections so about-us and benefits copy is not scored, requirements outweigh nice-to-haves, and skills outweigh ordinary English.",
    checks: [
      "Requirements weighted above nice-to-haves",
      "Synonyms, abbreviations, and implied skills",
      "Alternatives read as one choice",
    ],
  },
] as const;
