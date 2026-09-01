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
 * Page geometry measured during extraction: the share of lines split across a horizontal
 * gutter, and the number of ruled table grids. `columnRatio` is null when the document was too
 * short for that measurement to mean anything.
 */
export type AtsLayoutSignals = {
  columnRatio: number | null;
  tableCount: number;
  pageCount: number;
};

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
  parsed: AtsParsedResume;
};

export type AtsDegreeLevel = "diploma" | "associate" | "bachelor" | "master" | "doctorate";

export type AtsParsedDate = { year: number; month: number | null };

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

/** The fields an applicant tracking system recovers — the "what the ATS sees" view. */
export type AtsParsedResume = {
  name: string;
  email: string;
  phone: string;
  links: string[];
  roles: AtsParsedRole[];
  education: AtsParsedEducation[];
  skills: string[];
  monthsOfExperience: number | null;
  highestDegree: AtsDegreeLevel | null;
};

/**
 * The anonymous view: a diagnosis, and honest counts of everything still withheld. Narrower
 * than the logged-in report by design — there is no category rollup and no recovered table here,
 * because the server never sends them.
 */
export type AtsRestrictedReport = {
  version: "ats-v2";
  restricted: true;
  readinessScore: number;
  jobMatchScore: number | null;
  verdict: AtsVerdict;
  topFix: string | null;
  primaryWarning: string | null;
  checksPassed: number;
  checksTotal: number;
  matchedKeywordCount: number;
  missingKeywordCount: number;
  parsedRoleCount: number;
  remainingFixCount: number;
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
