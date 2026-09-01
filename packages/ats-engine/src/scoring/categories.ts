import type { AtsEngineRule } from "../policy/schema.js";
import type { AtsCategoryScore, AtsRuleResult } from "../types.js";
import { maxImpactOf } from "./rules.js";

export function rollUpCategories(
  policyRules: AtsEngineRule[],
  results: AtsRuleResult[],
): AtsCategoryScore[] {
  const totals = new Map<string, AtsCategoryScore>();

  results.forEach((result, index) => {
    const possible = maxImpactOf(policyRules[index]);
    const entry = totals.get(result.category) ?? {
      category: result.category,
      score: 100,
      passed: 0,
      total: 0,
      lost: 0,
      possible: 0,
    };
    entry.total += 1;
    entry.passed += result.passed ? 1 : 0;
    entry.lost += result.scoreImpact;
    entry.possible += possible;
    totals.set(result.category, entry);
  });

  return [...totals.values()].map((entry) => ({
    ...entry,
    lost: Math.round(entry.lost),
    possible: Math.round(entry.possible),
    // A category whose rules carry no weight at all is informational, not failed — report it
    // as complete rather than dividing by zero.
    score:
      entry.possible > 0
        ? Math.max(0, Math.round((1 - entry.lost / entry.possible) * 100))
        : entry.passed === entry.total
          ? 100
          : 0,
  }));
}
