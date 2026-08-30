import type { AtsCheckResult, AtsFullReport, AtsParsedResume, AtsRestrictedReport } from "../types";

/**
 * The wire shapes tolerate a server that predates any of these fields, so a deploy in either
 * order degrades to an empty section rather than a crash in the results panel.
 */
type OptionalFull = "categories" | "checksPassed" | "checksTotal" | "wordCount" | "parsed";

type OptionalRestricted =
  | "checksPassed"
  | "checksTotal"
  | "matchedKeywordCount"
  | "missingKeywordCount"
  | "primaryWarning"
  | "parsedRoleCount"
  | "remainingFixCount";

type WireFullReport = Omit<AtsFullReport, OptionalFull> &
  Partial<Pick<AtsFullReport, OptionalFull>>;

type WireRestrictedReport = Omit<AtsRestrictedReport, OptionalRestricted> &
  Partial<Pick<AtsRestrictedReport, OptionalRestricted>>;

export type WireCheckResult = Omit<AtsCheckResult, "report"> & {
  report: WireFullReport | WireRestrictedReport;
};

const EMPTY_PARSED: AtsParsedResume = {
  name: "",
  email: "",
  phone: "",
  links: [],
  roles: [],
  education: [],
  skills: [],
  monthsOfExperience: null,
  highestDegree: null,
};

export function normalizeCheckResult(result: WireCheckResult): AtsCheckResult {
  const { report } = result;

  if (report.restricted) {
    return {
      ...result,
      report: {
        ...report,
        checksPassed: report.checksPassed ?? 0,
        checksTotal: report.checksTotal ?? 0,
        matchedKeywordCount: report.matchedKeywordCount ?? 0,
        missingKeywordCount: report.missingKeywordCount ?? 0,
        primaryWarning: report.primaryWarning ?? null,
        parsedRoleCount: report.parsedRoleCount ?? 0,
        remainingFixCount: report.remainingFixCount ?? 0,
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
      parsed: report.parsed ?? EMPTY_PARSED,
    },
  };
}
