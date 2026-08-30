export type AtsRuleResult = {
  id: string;
  category: string;
  severity: "info" | "warning" | "error";
  passed: boolean;
  evidence: string;
  scoreImpact: number;
  fix: string;
};

export type AtsVerdict = "strong" | "needs-work" | "weak";

/**
 * Page geometry measured while parsing an uploaded document: the share of lines split across a
 * column gutter, and the number of ruled table grids. Echoed back with the scan so the format
 * checks can read the layout rather than only the text. `columnRatio` is null when the document
 * was too short for that measurement to carry signal, and the whole object is absent for pasted
 * text — in both cases the affected checks are skipped rather than assumed to pass.
 */
export type AtsLayoutSignals = {
  columnRatio: number | null;
  tableCount: number;
  pageCount: number;
};

/** Per-area rollup of the deterministic rules, so the panel can show where the score went. */
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
 * The fields an applicant tracking system recovers from the document — one row per job, holding
 * the employer, title and dates a recruiter actually filters on. Produced by the same
 * deterministic pass as the scores, so it never costs a second scan to see.
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

/**
 * Studio only ever calls /ats/check and /ats/analyze while logged in, so it always receives
 * the full (unrestricted) report — the anonymous, score-only shape is a site-checker concern.
 */
export type AtsReport = {
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
  /** Optional so a server one deploy behind renders an empty panel rather than throwing. */
  parsed?: AtsParsedResume;
};

export type AtsResult = {
  report: AtsReport;
  /** "unavailable" means no model could be routed; the scan quota is handed back. */
  aiStatus?: "ok" | "unavailable";
  ai: {
    explanation: string;
    missingEvidence: string[];
    keywordOpportunities: string[];
    recommendedImprovements: string[];
    priorityOrder: string[];
  } | null;
  creditsSpent: number;
  quota: {
    tier: "anonymous" | "free" | "subscriber";
    limit: number;
    used: number;
    remaining: number;
    resetsAt: string;
    canConvertResume: boolean;
    pricing: AtsPricing;
    extract: { limit: number; used: number; remaining: number };
  };
};

export type AtsPricing = {
  analysisCredits: { min: number; max: number };
  jobUrlAnalysisCredits: { min: number; max: number };
  resumeConversionCredits: number;
};

export type AtsQuota = AtsResult["quota"];

export type ConvertedResume = {
  basics: {
    fullName: string;
    role: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
  };
  links: Array<{ label: string; url: string }>;
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    summary: string;
    highlights: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    current: boolean;
    summary: string;
  }>;
  projects: Array<{
    name: string;
    role: string;
    link: string;
    summary: string;
    highlights: string[];
    skills: string[];
  }>;
  skills: Array<{ name: string; keywords: string[] }>;
};
