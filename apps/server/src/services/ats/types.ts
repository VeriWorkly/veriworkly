/**
 * The engine-facing types live in `@veriworkly/ats-engine` and are re-exported here so that
 * existing imports keep working. What remains defined in this file is what the engine has no
 * business knowing: the quota summary is a product concern.
 */
export type { AtsParsedResume, AtsReport } from "@veriworkly/ats-engine";

export type { AtsAiInsights } from "@veriworkly/ats-engine/ai";

export type AtsQuotaSummary = {
  /**
   * `paused`: a subscription the customer paused, on the free limits (owner decision
   * 2026-10-28: a payer is never labelled free, and a pause gives no paid features).
   */
  tier: "anonymous" | "free" | "paused" | "subscriber";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  /** The balance covers a resume conversion (credits from any source, owner decision 1). */
  canConvertResume: boolean;
  /** A parse-repair route is configured and the balance covers it (V-178). */
  canRepair: boolean;
  /** `null` when the ATS AI policy could not be loaded (V-185); AI actions are then off. */
  pricing: {
    analysisCredits: { min: number; max: number };
    jobUrlAnalysisCredits: { min: number; max: number };
    resumeConversionCredits: number;
    /** Credits for the optional AI parse repair; `null` when this deployment does not offer it. */
    parseRepairCredits: number | null;
  } | null;
  extract: {
    limit: number;
    used: number;
    remaining: number;
  };
};
