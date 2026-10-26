/** Report types come from the engine so the checker cannot drift; only the API envelope (quota, pricing) is declared here. */
export type {
  AtsCategoryScore,
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
  /** `null` when this deployment does not offer parse repair. */
  parseRepairCredits: number | null;
};

export type AtsQuota = {
  tier: "anonymous" | "free" | "subscriber";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  canConvertResume: boolean;
  canRepair: boolean;
  /** `null` when the server's ATS AI policy did not load; AI actions are then off. */
  pricing: AtsPricing | null;
  extract: { limit: number; used: number; remaining: number };
};

export type AtsCheckResult = {
  report: AtsShapedReport;
  ai: null;
  creditsSpent: number;
  quota: AtsQuota;
};
