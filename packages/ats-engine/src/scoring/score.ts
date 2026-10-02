import type { AtsEngineRule } from "../policy/schema.js";
import type { AtsRuleResult } from "../types.js";
import { evaluateRule, isApplicable, maxImpactOf, type RuleContext } from "./rules.js";

/**
 * The policy's applicable rules, evaluated, and the readiness score they give.
 *
 * Normalised against what the applicable rules could actually take away, so the score genuinely
 * spans 0-100 and means the same thing whether or not layout geometry was available. Subtracting
 * raw impacts from 100 floored the worst possible resume at 11, which quietly compressed the
 * bottom of the scale the verdict bands are calibrated on.
 *
 * Penalty rules (integrity) stand outside that: their weight comes off the finished score in
 * points, so a resume caught hiding text loses what the rule says, and an honest one is scored
 * exactly as if the rule did not exist.
 */
export function scoreRules(rules: readonly AtsEngineRule[], ctx: RuleContext) {
  const active = rules.filter((rule) => isApplicable(rule, ctx));
  const results = active.map((rule) => evaluateRule(rule, ctx));

  let lost = 0;
  let possible = 0;
  let penalty = 0;
  active.forEach((rule, index) => {
    if (rule.penalty) penalty += results[index].scoreImpact;
    else {
      lost += results[index].scoreImpact;
      possible += maxImpactOf(rule);
    }
  });
  const quality = possible > 0 ? Math.round((1 - lost / possible) * 100) : 100;
  return { active, results, readinessScore: Math.max(0, quality - penalty) };
}

/**
 * The passed rules worth naming, by the points each protected, so the highlights are the
 * meaningful ones rather than whichever rules sit at the top of the policy file. Not cheating is
 * no strength, so penalty rules are left out.
 */
export function strengthsOf(active: readonly AtsEngineRule[], results: readonly AtsRuleResult[]) {
  return results
    .map((result, index) => ({ result, rule: active[index] }))
    .filter(({ result, rule }) => result.passed && !rule.penalty)
    .sort((a, b) => maxImpactOf(b.rule) - maxImpactOf(a.rule))
    .slice(0, 5)
    .map(({ result }) => result.evidence);
}
