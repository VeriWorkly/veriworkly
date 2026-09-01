export type AtsSeverity = "info" | "warning" | "error";

/**
 * Geometry recovered while parsing an uploaded document, for the checks that text cannot answer.
 *
 * `columnRatio` is the share of content lines whose text items are separated by a horizontal gap
 * wide enough to read as a column gutter — the signature of a two-column layout, a sidebar, or a
 * floating text box, all of which extract in a scrambled order. `tableCount` is the number of
 * ruled table grids found by tracing the page's vector drawing operators.
 *
 * Absent for pasted text and Studio documents, which have no geometry to measure; the rules that
 * depend on it are then omitted from the report rather than assumed to pass.
 */
export type AtsLayoutSignals = {
  /** `null` when the document had too few content lines for the ratio to mean anything. */
  columnRatio: number | null;
  tableCount: number;
  pageCount: number;
};

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

export type AtsDegreeLevel = "diploma" | "associate" | "bachelor" | "master" | "doctorate";

export type AtsParsedDate = { year: number; month: number | null };

/** One row of work history, in the shape an applicant tracking system stores it. */
export type AtsParsedRole = {
  title: string;
  employer: string;
  start: AtsParsedDate | null;
  end: AtsParsedDate | null;
  current: boolean;
};

export type AtsParsedEducation = {
  school: string;
  credential: string;
  level: AtsDegreeLevel | null;
  end: AtsParsedDate | null;
};

/**
 * What a parser recovers from the document — the fields a recruiter actually searches on.
 *
 * Returned to the caller as well as scored, because showing the candidate the rows we recovered
 * is more useful than any number: an empty employer or a missing date range is a column the
 * hiring team's filter cannot match, and seeing it is what makes that concrete.
 */
export type AtsParsedResume = {
  name: string;
  email: string;
  phone: string;
  links: string[];
  roles: AtsParsedRole[];
  education: AtsParsedEducation[];
  skills: string[];
  /** Calendar months covered by at least one role, so overlapping jobs are not double counted. */
  monthsOfExperience: number | null;
  highestDegree: AtsDegreeLevel | null;
};

export type AtsReport = {
  version: "ats-v2";
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
};
