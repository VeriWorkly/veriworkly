/**
 * Report types come from the engine that produces them, so Studio cannot drift from the shape
 * the server sends. What stays declared here is the server API envelope around a report.
 */
import type { AtsFullReport, AtsParsedField, AtsParsedResume } from "@veriworkly/ats-engine";

export type {
  AtsCategoryScore,
  AtsDegreeLevel,
  AtsLayoutSignals,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedField,
  AtsParsedResume,
  AtsParsedRole,
  AtsProvenance,
  AtsRuleResult,
  AtsVerdict,
} from "@veriworkly/ats-engine";

/**
 * Studio only ever scans while logged in, so it always receives the full report. `parsed` is
 * optional so a server one deploy behind renders an empty panel rather than throwing.
 */
export type AtsReport = Omit<AtsFullReport, "parsed"> & { parsed?: AtsParsedResume };

/** Outcome of the optional AI parse repair. Returned by /ats/analyze only. */
export type AtsRepairSummary = {
  /** The deterministic parse was thin enough that a repair pass would likely help. */
  available: boolean;
  applied: boolean;
  /** Fields in `report.parsed` a model supplied rather than the parser. */
  fields: AtsParsedField[];
  /** Values the model returned that do not occur in the resume, and were dropped. */
  rejectedValues: number;
  creditsSpent: number;
};

export type AtsResult = {
  report: AtsReport;
  /** "unavailable" means no model could be routed; the scan quota is handed back. */
  aiStatus?: "ok" | "unavailable";
  repair?: AtsRepairSummary;
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
  /** `null` when repair is not offered; optional so a server one deploy behind still type-checks. */
  parseRepairCredits?: number | null;
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
