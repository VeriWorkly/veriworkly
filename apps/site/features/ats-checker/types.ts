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

export type AtsVerdict = "strong" | "needs-work" | "weak";

/**
 * Per-area rollup of the deterministic rules. Sent to every caller, authenticated or not: it
 * says which part of the resume is losing points without naming the rule that fired.
 */
export type AtsCategoryScore = {
  category: string;
  score: number;
  passed: number;
  total: number;
  lost: number;
  possible: number;
};

/** Returned for any authenticated caller - every rule, every keyword, every fix. */
export type AtsFullReport = {
  version: "ats-v2";
  restricted: false;
  verdict: AtsVerdict;
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
};

/**
 * Returned instead of AtsFullReport when the caller is anonymous - scores, verdict, and the
 * category rollup, but no rule evidence, no keyword lists, and only the single largest fix.
 */
export type AtsRestrictedReport = {
  version: "ats-v2";
  restricted: true;
  readinessScore: number;
  jobMatchScore: number | null;
  verdict: AtsVerdict;
  topFix: string | null;
  categories: AtsCategoryScore[];
  checksPassed: number;
  checksTotal: number;
  matchedKeywordCount: number;
  missingKeywordCount: number;
};

export type AtsReport = AtsFullReport | AtsRestrictedReport;

export type AtsPricing = {
  analysisCredits: { min: number; max: number };
  jobUrlAnalysisCredits: { min: number; max: number };
  resumeConversionCredits: number;
};

export type AtsQuota = {
  tier: "anonymous" | "free" | "subscriber";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  canConvertResume: boolean;
  pricing: AtsPricing;
  extract: { limit: number; used: number; remaining: number };
};

export type AtsCheckResult = {
  report: AtsReport;
  ai: null;
  creditsSpent: number;
  quota: AtsQuota;
};
