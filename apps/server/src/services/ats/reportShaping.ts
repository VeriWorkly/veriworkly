import type { AtsReport } from "#services/ats/types";

export type AtsVerdict = "strong" | "needs-work" | "weak";

/**
 * What an anonymous visitor receives.
 *
 * Deliberately a diagnosis without the prescription: the score, the verdict band, the single
 * most costly problem stated plainly, and honest counts of everything still withheld. The counts
 * are the point — "7 required keywords missing" and "3 roles recovered" are true, specific, and
 * useless to act on without the lists behind them, which is precisely the trade being offered.
 *
 * Note this is narrower than it used to be: the per-category rollup has moved behind the login.
 * That was a deliberate reversal. The rollup let a visitor read off *where* the resume was losing
 * points, which is most of the diagnostic value, and the earlier reasoning — that a bare number
 * felt like a teaser — is answered better by naming one concrete failure than by handing over the
 * whole breakdown.
 *
 * Enforced here, server-side. The restricted object simply never contains the withheld fields,
 * so there is nothing for a client to un-hide or a network tab to reveal.
 */
export type AtsRestrictedReport = {
  version: AtsReport["version"];
  restricted: true;
  readinessScore: number;
  jobMatchScore: number | null;
  verdict: AtsVerdict;
  /** The single highest-impact failure, named in full. The rest of the list is withheld. */
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

export type AtsFullReport = AtsReport & { restricted: false; verdict: AtsVerdict };

export type AtsShapedReport = AtsFullReport | AtsRestrictedReport;

/** Job match matters more than raw formatting once a target role is on the table. */
export function computeVerdict(report: AtsReport): AtsVerdict {
  const primary = report.jobMatchScore ?? report.readinessScore;
  if (primary >= 75) return "strong";
  if (primary >= 45) return "needs-work";
  return "weak";
}

/**
 * The one failure most worth stating up front.
 *
 * Parsing and formatting failures outrank everything else here regardless of their point value,
 * because they are the ones a candidate cannot see for themselves — a missing keyword is visible
 * by reading the posting, a column layout that scrambles your job titles is not.
 */
function primaryWarning(report: AtsReport) {
  const structural = report.failedChecks.filter(
    (rule) => rule.category === "parse" || rule.category === "format",
  );
  const ranked = (structural.length ? structural : report.failedChecks)
    .slice()
    .sort((a, b) => b.scoreImpact - a.scoreImpact);

  return ranked[0]?.evidence ?? null;
}

export function shapeReport(report: AtsReport, authenticated: boolean): AtsShapedReport {
  if (authenticated) return { ...report, restricted: false, verdict: computeVerdict(report) };

  return {
    version: report.version,
    restricted: true,
    readinessScore: report.readinessScore,
    jobMatchScore: report.jobMatchScore,
    verdict: computeVerdict(report),
    topFix: report.prioritizedFixes[0] ?? null,
    primaryWarning: primaryWarning(report),
    checksPassed: report.checksPassed,
    checksTotal: report.checksTotal,
    matchedKeywordCount: report.matchedKeywords.length,
    missingKeywordCount: report.missingKeywords.length,
    parsedRoleCount: report.parsed.roles.length,
    remainingFixCount: Math.max(0, report.prioritizedFixes.length - 1),
  };
}
