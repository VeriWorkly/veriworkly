/**
 * Report types come from the engine that produces them, so the checker cannot drift from the
 * shape the server sends. What stays declared here is the server's API envelope — quota and
 * pricing — which is a product contract rather than part of the engine.
 */
export type {
  AtsCategoryScore,
  AtsDegreeLevel,
  AtsFullReport,
  AtsLayoutSignals,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedField,
  AtsParsedResume,
  AtsRequirement,
  AtsParsedRole,
  AtsProvenance,
  AtsRestrictedReport,
  AtsRuleResult,
  AtsSeverity,
  AtsShapedReport as AtsReport,
  AtsVerdict,
} from "@veriworkly/ats-engine";

import type { AtsShapedReport } from "@veriworkly/ats-engine";

export type AtsPricing = {
  analysisCredits: { min: number; max: number };
  jobUrlAnalysisCredits: { min: number; max: number };
  resumeConversionCredits: number;
  /** `null` when repair is not offered; optional so a server one deploy behind still type-checks. */
  parseRepairCredits?: number | null;
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
  report: AtsShapedReport;
  ai: null;
  creditsSpent: number;
  quota: AtsQuota;
};
