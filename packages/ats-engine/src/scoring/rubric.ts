import type { AtsEnginePolicy, AtsEngineRule } from "../policy/schema.js";
import { maxImpactOf } from "./rules.js";

/** One rule of a policy, described for publication. */
export type AtsRubricEntry = {
  id: string;
  category: string;
  severity: AtsEngineRule["severity"];
  /** What the rule reads: a metric, a section, a pattern. */
  measures: string;
  /** The most it can cost. Points off the score for a deduction, else its weight in the score. */
  points: number;
  /** Whether it deducts points rather than weighing in the score's denominator. */
  deduction: boolean;
  /** What a resume that passes looks like, in the rule's own words. */
  passes: string;
  fix: string;
};

function measures(rule: AtsEngineRule): string {
  switch (rule.kind) {
    case "min-words":
      return `at least ${rule.min} words`;
    case "presence":
      return `a pattern, in the ${rule.scope}`;
    case "position":
      return `contact details in the first ${Math.round(rule.windowFraction * 100)}%`;
    case "section":
      return `a ${rule.section} heading`;
    default:
      return rule.metric;
  }
}

/**
 * A policy's rules as a published rubric: what each checks, what it can cost, how to fix it.
 * The community policy's is published as RUBRIC.md, generated from this; a host's private
 * policy need not be.
 */
export function policyRubric(policy: AtsEnginePolicy): AtsRubricEntry[] {
  return policy.rules.map((rule) => ({
    id: rule.id,
    category: rule.category,
    severity: rule.severity,
    measures: measures(rule),
    points: maxImpactOf(rule),
    deduction: rule.penalty,
    passes: rule.passEvidence,
    fix: rule.fix,
  }));
}
