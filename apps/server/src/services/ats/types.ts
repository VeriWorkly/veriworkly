/**
 * The engine-facing types live in `@veriworkly/ats-engine` and are re-exported here so that
 * existing imports keep working. What remains defined in this file is what the engine has no
 * business knowing: the quota summary is a product concern.
 */
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
  AtsReport,
  AtsRuleResult,
  AtsSeverity,
} from "@veriworkly/ats-engine";

export type { AtsAiInsights } from "@veriworkly/ats-engine/ai";

export type AtsQuotaSummary = {
  tier: "anonymous" | "free" | "subscriber";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  canConvertResume: boolean;
  pricing: {
    analysisCredits: { min: number; max: number };
    jobUrlAnalysisCredits: { min: number; max: number };
    resumeConversionCredits: number;
    /** Credits for the optional AI parse repair; `null` when this deployment does not offer it. */
    parseRepairCredits: number | null;
  };
  extract: {
    limit: number;
    used: number;
    remaining: number;
  };
};
