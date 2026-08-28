import { AtSign, FileSearch, LayoutList, ShieldAlert, Type, Gauge, ShieldCheck, type LucideIcon } from "lucide-react";

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

export const SCORING_DIMENSIONS = [
  {
    icon: FileSearch,
    title: "Parsing & Layout Integrity",
    badge: "Format Sanity",
    body: "Word count ranges, table characters, multi-column blocks, and header/footer repetitions that cause text extraction algorithms to scramble sequential reading flow.",
    checks: ["Single-stream text extraction", "No invisible table cells", "Header & footer safety"],
  },
  {
    icon: ShieldCheck,
    title: "Contact & Section Taxonomy",
    badge: "Search Indexing",
    body: "Email, phone number, location, and recognizable Experience, Education, and Skills headers that ATS software categorizes into searchable profile fields.",
    checks: ["Top 30% contact placement", "Standard ISO section names", "Valid URL syntax verification"],
  },
  {
    icon: Type,
    title: "Evidence & Impact Quality",
    badge: "Impact Weight",
    body: "Quantified outcomes and action verbs, evaluated by what percentage of bullets carry measurable results rather than just passive duty statements.",
    checks: ["Metric & percentage density", "Action verb power scoring", "Vague duty phrase detection"],
  },
  {
    icon: Gauge,
    title: "Job Match & Keywords",
    badge: "Semantic Fit",
    body: "Keyword matching against a pasted job description, weighted toward terms listed under Requirements over optional nice-to-haves.",
    checks: ["Requirement term weighting", "Synonym & abbreviation mapping", "Frequency density analysis"],
  },
] as const;
