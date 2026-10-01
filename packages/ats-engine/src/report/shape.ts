import { computeVerdict, type AtsVerdict } from "../scoring/verdict.js";
import type { AtsReport } from "../types.js";

/**
 * Two levels of detail for a report, so a host can offer a diagnosis without the prescription.
 *
 * `restricted` is the score, the verdict band, the single most costly problem stated plainly,
 * and honest counts of everything else. The counts are the point — "7 required keywords
 * missing" and "3 roles recovered" are true, specific, and not actionable without the lists
 * behind them. Which callers get which level is the host's decision; the package only
 * guarantees that a restricted report contains none of the withheld fields, so there is nothing
 * for a client to un-hide or a network inspector to reveal.
 */

export type AtsReportDetail = "full" | "restricted";

export type AtsFullReport = AtsReport & { restricted: false; verdict: AtsVerdict };

export type AtsRestrictedReport = {
  version: AtsReport["version"];
  restricted: true;
  readinessScore: number;
  jobMatchScore: number | null;
  verdict: AtsVerdict;
  /** The single highest-impact fix, named in full. The rest of the list is withheld. */
  topFix: string | null;
  /** The most severe formatting or parsing failure, phrased as the risk it creates. */
  primaryWarning: string | null;
  checksPassed: number;
  checksTotal: number;
  /** Counts only, never the terms themselves. */
  matchedKeywordCount: number;
  missingKeywordCount: number;
  /** Counts only, never the recovered rows. */
  parsedRoleCount: number;
  remainingFixCount: number;
};

export type AtsShapedReport = AtsFullReport | AtsRestrictedReport;

/**
 * The one failure most worth stating up front.
 *
 * Parsing and formatting failures outrank everything else regardless of their point value,
 * because they are the ones a candidate cannot see for themselves: a missing keyword is visible
 * by reading the posting, a column layout that scrambles your job titles is not.
 */
function primaryWarning({ failedChecks }: AtsReport): string | null {
  // Hidden text or an instruction to an AI outranks any formatting risk: recruiters reject on it.
  const integrity = failedChecks.filter((r) => r.category === "integrity");
  const structural = failedChecks.filter((r) => r.category === "parse" || r.category === "format");
  const pool = integrity.length ? integrity : structural.length ? structural : failedChecks;
  return (
    pool.reduce<(typeof pool)[number] | null>(
      (best, rule) => (!best || rule.scoreImpact > best.scoreImpact ? rule : best),
      null,
    )?.evidence ?? null
  );
}

export function shapeReport(report: AtsReport, detail: AtsReportDetail): AtsShapedReport {
  const verdict = computeVerdict(report);
  if (detail === "full") return { ...report, restricted: false, verdict };

  return {
    version: report.version,
    restricted: true,
    readinessScore: report.readinessScore,
    jobMatchScore: report.jobMatchScore,
    verdict,
    topFix: report.prioritizedFixes[0] ?? null,
    primaryWarning: primaryWarning(report),
    checksPassed: report.checksPassed,
    checksTotal: report.checksTotal,
    matchedKeywordCount: report.matchedKeywords.length,
    missingKeywordCount: report.missingKeywords.length,
    parsedRoleCount: report.parsed.roles.length,
    remainingFixCount: Math.max(0, report.failedChecks.length - 1),
  };
}
