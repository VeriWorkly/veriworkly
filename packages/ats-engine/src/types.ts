/**
 * The public report types. The parsed record and the layout signals have files of their own
 * under `./types/`, re-exported here so every import of `types.js` keeps working.
 */
import type { AtsParsedResume } from "./types/parsed.js";

export type * from "./types/layout.js";
export type * from "./types/parsed.js";

export type AtsSeverity = "info" | "warning" | "error";

export type AtsRuleResult = {
  id: string;
  category: string;
  severity: AtsSeverity;
  passed: boolean;
  evidence: string;
  scoreImpact: number;
  fix: string;
};

/**
 * Per-category rollup of the deterministic rules. `lost` is the sum of the score impacts the
 * category actually cost, `possible` the worst case it could have cost, so `score` is the
 * percentage of that category the resume kept. Exposing the rollup is deliberately safe: it is
 * an aggregate of numbers the full report already returns per rule, and it tells an anonymous
 * caller *where* the problem is without handing over the rule-by-rule answer key.
 */
export type AtsCategoryScore = {
  category: string;
  score: number;
  passed: number;
  total: number;
  lost: number;
  possible: number;
};

/**
 * One requirement of the posting, judged against the resume, the way a per-qualification
 * screener grades it (Workday HiredScore, Ashby): met or not, with the resume's own words as
 * evidence. `unverifiable`: not something a resume settles — the right to work, a clearance —
 * unless it says so; such a question is asked in the application, and often filters there.
 */
export type AtsRequirement = {
  /** The requirement as the posting wrote it. */
  text: string;
  importance: "required" | "preferred";
  kind: "skills" | "experience" | "education" | "authorization" | "clearance" | "language";
  status: "met" | "partial" | "missing" | "unverifiable";
  /** What the requirement names, and whether the resume has each. Skills and languages. */
  terms: Array<{ term: string; found: boolean }>;
  /** Resume lines that show it, quoted. Work history first; a skills list last. */
  evidence: string[];
  /** For years and degrees: what was compared, "6 years in the work history, 5 asked". */
  detail?: string;
};

export type AtsReport = {
  /** The scoring policy's declared `version` ("ats-v2" for the community policy). */
  version: string;
  readinessScore: number;
  jobMatchScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  parsingWarnings: string[];
  strengths: string[];
  failedChecks: AtsRuleResult[];
  prioritizedFixes: string[];
  rules: AtsRuleResult[];
  categories: AtsCategoryScore[];
  checksPassed: number;
  checksTotal: number;
  wordCount: number;
  /** The fields an ATS would recover from this document. See AtsParsedResume. */
  parsed: AtsParsedResume;
  /**
   * The locale packs the resume was read with: languages detected (or asked for) beyond the
   * policy's base vocabulary, and the region applied. Empty and null without packs attached.
   */
  locale: { languages: string[]; region: string | null };
  /**
   * What produced this report: the engine's version and a fingerprint of the policy as applied.
   * The same input, reference date (`now`), engine and policy fingerprint always give the same
   * report; a score that moved with neither changed was not this engine's doing.
   */
  engine: { version: string; policy: string };
  /** The posting's requirements, each judged; empty without a job description. At most 25. */
  requirements: AtsRequirement[];
  /**
   * The text in the order the engine read it — after wrapped lines were rejoined and spaced
   * letters read back — when `includeLines` was asked for. At most 500 lines.
   */
  lines?: string[];
};
