import type {
  AtsCheckResult,
  AtsFullReport,
  AtsRestrictedReport,
} from "../types";

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
