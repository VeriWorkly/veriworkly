import type {
  AtsCheckResult,
  AtsFullReport,
  AtsRestrictedReport,
} from "@/features/ats-checker/types";

/**
 * The report exactly as it may arrive on the wire. The fields below were added to the API after
 * this UI shipped against it, so a server one deploy behind will omit them - the rest of the app
 * treats them as required, and `normalizeCheckResult` is the seam that makes that true.
 */
type WireFullReport = Omit<
  AtsFullReport,
  "categories" | "checksPassed" | "checksTotal" | "wordCount"
> &
  Partial<Pick<AtsFullReport, "categories" | "checksPassed" | "checksTotal" | "wordCount">>;

type WireRestrictedReport = Omit<
  AtsRestrictedReport,
  "categories" | "checksPassed" | "checksTotal" | "matchedKeywordCount" | "missingKeywordCount"
> &
  Partial<
    Pick<
      AtsRestrictedReport,
      "categories" | "checksPassed" | "checksTotal" | "matchedKeywordCount" | "missingKeywordCount"
    >
  >;

export type WireCheckResult = Omit<AtsCheckResult, "report"> & {
  report: WireFullReport | WireRestrictedReport;
};

/**
 * Reconciles a report from a server that predates the category rollup.
 *
 * The marketing site and the API deploy independently, so there is always a window where one is
 * a version ahead of the other. Reading `.length` off an absent `categories` throws during
 * render, which the route's error boundary turns into a blank page *after* the visitor has
 * already spent their one free scan. That is the worst possible moment to fail, so the missing
 * fields are filled in here, at the single point where the response enters the app, rather than
 * guarded at a dozen call sites.
 *
 * Derived values stay honest: counts are recomputed from the rules an older server did send, and
 * the rollup is simply empty, which every consumer already renders as "omit this section".
 */
export function normalizeCheckResult(result: WireCheckResult): AtsCheckResult {
  const { report } = result;

  if (report.restricted) {
    return {
      ...result,
      report: {
        ...report,
        categories: report.categories ?? [],
        checksPassed: report.checksPassed ?? 0,
        checksTotal: report.checksTotal ?? 0,
        matchedKeywordCount: report.matchedKeywordCount ?? 0,
        missingKeywordCount: report.missingKeywordCount ?? 0,
      },
    };
  }

  const rules = report.rules ?? [];
  return {
    ...result,
    report: {
      ...report,
      rules,
      categories: report.categories ?? [],
      checksPassed: report.checksPassed ?? rules.filter((rule) => rule.passed).length,
      checksTotal: report.checksTotal ?? rules.length,
      wordCount: report.wordCount ?? 0,
    },
  };
}
