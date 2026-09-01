/**
 * The engine-facing types now live in `@veriworkly/ats-engine` and are re-exported here so that
 * existing imports keep working. What remains defined in this file is what the engine has no
 * business knowing: the AI insight shape and the quota summary are product concerns.
 */
export type {
  AtsCategoryScore,
  AtsDegreeLevel,
  AtsLayoutSignals,
  AtsParsedDate,
  AtsParsedEducation,
  AtsParsedResume,
  AtsParsedRole,
  AtsReport,
  AtsRuleResult,
  AtsSeverity,
} from "@veriworkly/ats-engine";

export type AtsAiInsights = {
  explanation: string;
  missingEvidence: string[];
  keywordOpportunities: string[];
  recommendedImprovements: string[];
  priorityOrder: string[];
};

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
  };
  extract: {
    limit: number;
    used: number;
    remaining: number;
  };
};
