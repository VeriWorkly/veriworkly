import { getAtsAiPolicy, type AtsComplexity } from "#services/ats/aiPolicy";
import { createServerAtsAi, runBilled, taskRoute } from "#services/ats/atsAi";
import type { AtsAiInsights, AtsReport } from "#services/ats/types";
import { EntitlementService } from "#services/entitlementService";
import { logger } from "#lib/logger";

/**
 * How much model to spend on this request.
 *
 * Graded on the share of available points the resume lost rather than on a count of
 * error-severity rule failures. The old thresholds (3 / 5 / 7 failures) were written against a
 * rule set that contains five error rules in total, so the top tier was arithmetically
 * unreachable and the middle one required every error rule to fail at once — leaving document
 * size as the only thing that ever moved the dial. A proportion survives policy edits; a count
 * of rules silently drifts every time a rule is added or reclassified.
 */
function complexity(report: AtsReport, resumeChars: number, jobChars: number): AtsComplexity {
  const size = resumeChars + jobChars;
  const lostShare = 100 - report.readinessScore;

  if (size > 40_000 || lostShare >= 55) return "expert";
  if (size > 24_000 || lostShare >= 35) return "advanced";
  if (jobChars > 5_000 || lostShare >= 18) return "detailed";
  return "standard";
}

/** Most to least capable. Also the order `chooseRoute` walks when a tier prices itself out. */
const TIER_LADDER: AtsComplexity[] = ["expert", "advanced", "detailed", "standard"];

function routeForTier(tier: AtsComplexity, inputChars: number, online: boolean) {
  const policy = getAtsAiPolicy();
  const inputTokens = Math.ceil(inputChars / 4);
  const multiplier = online ? policy.pricing.onlineMultiplier : 1;
  const buckets = policy.pricing.analysisBuckets.map((credits) => credits * multiplier);
  const candidates = policy.models
    .filter((model) => model.tiers.includes(tier))
    .map((model) => {
      const oneCall =
        (inputTokens * model.inputUsdPerMillion +
          model.maxOutputTokens * model.outputUsdPerMillion) /
        1_000_000;
      const maximumCost = oneCall * (model.retries + 1) * model.feeMultiplier;
      return { model, maximumCost, oneCall };
    })
    .sort((a, b) => a.oneCall - b.oneCall);

  for (const candidate of candidates) {
    for (const credits of buckets) {
      const revenue = credits * policy.pricing.creditRevenueUsd;
      if (candidate.oneCall <= revenue * 0.25 && candidate.maximumCost <= revenue * 0.5)
        return {
          ...candidate,
          tier,
          credits,
          systemPrompt: online ? policy.prompts.onlineAnalysis : policy.prompts.standardAnalysis,
        };
    }
  }
  return null;
}

/**
 * Picks a model, stepping down the ladder when the requested tier cannot be served inside its
 * margin.
 *
 * The requested tier used to be final: if nothing in it fit the pricing gates the request
 * returned no analysis at all, having already spent the caller's scan quota, and reported
 * success while doing it. A large resume was enough to trigger that — "expert" is entered on
 * size alone, and the expert model never cleared the gate at any credit bucket. Falling back
 * hands the work to a cheaper model instead of dropping it, which is the right trade: a smaller
 * model's analysis is worth incomparably more than none.
 */
function chooseRoute(tier: AtsComplexity, inputChars: number, online: boolean) {
  for (const candidate of TIER_LADDER.slice(TIER_LADDER.indexOf(tier))) {
    const route = routeForTier(candidate, inputChars, online);
    if (route) return route;
  }
  return null;
}

export class AtsAiService {
  /**
   * `resumeText` is the already-flattened resume. The caller flattens once and hands the same
   * string to the scoring pass and to this one, rather than each walking the document again.
   *
   * `routed: false` means no model could be served inside its margin even after stepping down
   * the tier ladder — a configuration problem, not a caller problem. It is reported explicitly
   * so the controller can hand the scan quota back instead of charging for nothing and
   * returning a success the caller cannot distinguish from an empty analysis.
   */
  static async analyze(
    userId: string,
    requestId: string,
    resumeText: string,
    jobDescription: string | undefined,
    report: AtsReport,
    online: boolean,
  ): Promise<{ ai: AtsAiInsights | null; creditsSpent: number; routed: boolean }> {
    const jobText = jobDescription?.trim().slice(0, 20_000) ?? "";
    const tier = complexity(report, resumeText.length, jobText.length);
    const route = chooseRoute(tier, resumeText.length + jobText.length + 4_000, online);
    if (!route) {
      logger.error("No AI ATS route available", {
        requestId,
        tier,
        inputChars: resumeText.length + jobText.length,
        online,
      });
      return { ai: null, creditsSpent: 0, routed: false };
    }

    /**
     * Attempts are already priced in: `routeForTier` budgets `retries + 1` calls when it checks
     * the model against its credit bucket, and the task retries a malformed response or a
     * transient provider fault within that budget. One reservation covers every attempt — the
     * caller is charged for the analysis, not for how many tries it took to get valid JSON.
     */
    const outcome = await runBilled({
      userId,
      requestId,
      credits: route.credits,
      action: "ats_analysis",
      reason: "AI ATS analysis",
      failure: "AI ATS analysis could not be completed.",
      metadata: {
        costBucket: route.credits,
        // Both recorded: `complexity` is what the request was graded as, `servedTier` is what it
        // was actually billed at after any step down the ladder.
        complexity: tier,
        servedTier: route.tier,
        online,
      },
      run: () =>
        createServerAtsAi(requestId).analyze(
          { resumeText, report, jobDescription },
          taskRoute(route.model, route.systemPrompt),
        ),
    });
    return { ai: outcome.result, creditsSpent: route.credits, routed: true };
  }

  static async convertResume(userId: string, requestId: string, resumeText: string) {
    await EntitlementService.require(
      userId,
      "ai_credits",
      "Resume conversion requires an active AI Credits or Bundle plan.",
    );

    const policy = getAtsAiPolicy();
    const route = policy.resumeConversion;
    const outcome = await runBilled({
      userId,
      requestId,
      credits: route.credits,
      action: "ats_resume_conversion",
      reason: "AI resume conversion",
      failure: "AI resume conversion could not be completed.",
      run: () =>
        createServerAtsAi(requestId).convertResume(
          { resumeText },
          taskRoute(route, policy.prompts.resumeConversion),
        ),
    });
    return { resume: outcome.result, creditsSpent: route.credits };
  }
}
