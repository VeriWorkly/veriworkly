import {
  AtSign,
  FileSearch,
  LayoutList,
  PenLine,
  ShieldAlert,
  Type,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  categoryLabel,
  scoreTone,
  sortByCategoryOrder,
  type AtsScoreTone,
} from "@veriworkly/ats-engine/format";

/** Label, order and score bands come from the engine so the checker, Studio and copied report agree. */
export { scoreTone, sortByCategoryOrder };
export type ScoreTone = AtsScoreTone;

const CATEGORY_META: Record<string, { icon: LucideIcon; blurb: string }> = {
  parse: {
    icon: FileSearch,
    blurb: "Whether a parser can read the document at all: length, encoding, and stray glyphs.",
  },
  contact: {
    icon: AtSign,
    blurb: "Email, phone, and a professional link, placed where an ATS looks for them.",
  },
  structure: {
    icon: LayoutList,
    blurb: "Clearly labelled Experience, Education, and Skills sections an ATS can map.",
  },
  content: {
    icon: Type,
    blurb: "Action verbs, quantified outcomes, and length a recruiter can skim.",
  },
  format: {
    icon: ShieldAlert,
    blurb: "Tables, columns, and repeated headers that scramble content during extraction.",
  },
  writing: {
    icon: PenLine,
    blurb:
      "How the bullets read once the ATS has filed them: first person, passive voice, duties instead of actions, tense. Weighs little.",
  },
  integrity: {
    icon: ShieldCheck,
    blurb:
      "Hidden text, instructions aimed at AI screeners, and copied or stuffed keywords that recruiters reject on sight.",
  },
};

export function categoryMeta(category: string) {
  const meta = CATEGORY_META[category] ?? { icon: FileSearch, blurb: "" };
  return { label: categoryLabel(category), ...meta };
}

// Status tokens, so both themes keep their contrast without per-theme overrides.
export const TONE_CLASSES: Record<ScoreTone, { text: string; fill: string; chip: string }> = {
  good: { text: "text-success", fill: "bg-success", chip: "bg-success/10 text-success" },
  warn: { text: "text-warning", fill: "bg-warning", chip: "bg-warning/10 text-warning" },
  bad: {
    text: "text-destructive",
    fill: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
};

/** Every claim must map to a rule the engine runs; remove the line when its check leaves the policy. */
export const SCORING_DIMENSIONS = [
  {
    title: "Parsing and layout",
    body: "On an uploaded PDF we read the page geometry, not just the text: whether lines split across a column gutter, and whether content sits inside ruled table grids. Both scramble the order your text comes out in.",
    checks: [
      "Column-gutter detection on PDF uploads",
      "Ruled table grid detection",
      "Letter-spaced headings that extract as single letters",
    ],
  },
  {
    title: "Contact and headings",
    body: "Email, phone, and a professional link, plus Experience, Education, and Skills headings that parsers map into searchable profile fields. Headings must be real headings — the word appearing mid-sentence does not count.",
    checks: [
      "Contact details in the first quarter",
      "Headings matched on their own line",
      "Standard employment date ranges",
    ],
  },
  {
    title: "Evidence and impact",
    body: "Quantified outcomes and action verbs, scored by the share of your bullets that carry them rather than by whether they appear at all — a single strong verb in the document is not the same as a resume written in them.",
    checks: [
      "Metric & percentage density per bullet",
      "Share of bullets opening with an action verb",
      "Generic filler phrase detection",
    ],
  },
  {
    title: "Job match and keywords",
    body: "Keyword matching against a pasted job description. The posting is split into sections so about-us and benefits copy is not scored, requirements outweigh nice-to-haves, and skills outweigh ordinary English.",
    checks: [
      "Requirements weighted above nice-to-haves",
      "Synonyms, abbreviations, and implied skills",
      "Alternatives read as one choice",
    ],
  },
] as const;
