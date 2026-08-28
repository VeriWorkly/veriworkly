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

export type AtsCategoryScore = {
  category: string;
  score: number;
  passed: number;
  total: number;
  lost: number;
  possible: number;
};

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
