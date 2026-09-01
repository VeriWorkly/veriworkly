import type { AtsReport } from "../types.js";

export type AtsVerdict = "strong" | "needs-work" | "weak";

/** Job match matters more than raw formatting once a target role is on the table. */
export function computeVerdict(report: AtsReport): AtsVerdict {
  const primary = report.jobMatchScore ?? report.readinessScore;
  if (primary >= 75) return "strong";
  if (primary >= 45) return "needs-work";
  return "weak";
}
