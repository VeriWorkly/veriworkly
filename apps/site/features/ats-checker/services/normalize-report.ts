import type {
  AtsCheckResult,
  AtsFullReport,
  AtsParsedEducation,
  AtsParsedField,
  AtsParsedResume,
  AtsProvenance,
  AtsRestrictedReport,
} from "../types";

/**
 * The wire shapes tolerate a server that predates any of these fields, so a deploy in either
 * order degrades to an empty section rather than a crash in the results panel.
 */
type OptionalFull =
  | "categories"
  | "checksPassed"
  | "checksTotal"
  | "wordCount"
  | "parsed"
  | "locale"
  | "engine"
  | "requirements";

type OptionalRestricted =
  | "checksPassed"
  | "checksTotal"
  | "matchedKeywordCount"
  | "missingKeywordCount"
  | "primaryWarning"
  | "parsedRoleCount"
  | "remainingFixCount";

/** Before ISCED a server sent the five degree labels alone, and before provenance, none. */
type WireParsed = Omit<AtsParsedResume, "provenance" | "highestIsced" | "education"> &
  Partial<Pick<AtsParsedResume, "provenance" | "highestIsced">> & {
    education: Array<
      Omit<AtsParsedEducation, "isced"> & Partial<Pick<AtsParsedEducation, "isced">>
    >;
  };

type WireFullReport = Omit<AtsFullReport, OptionalFull> &
  Partial<Pick<AtsFullReport, Exclude<OptionalFull, "parsed">>> & { parsed?: WireParsed };

type WireRestrictedReport = Omit<AtsRestrictedReport, OptionalRestricted> &
  Partial<Pick<AtsRestrictedReport, OptionalRestricted>>;

export type WireCheckResult = Omit<AtsCheckResult, "report"> & {
  report: WireFullReport | WireRestrictedReport;
};

const FIELDS: AtsParsedField[] = ["name", "email", "phone", "roles", "education", "skills"];

/**
 * A server that predates provenance only ever parsed text, so every recovered field is the
 * parser's and every empty one is `none`. That is exactly what it would have reported.
 */
function inferProvenance(parsed: WireParsed): Record<AtsParsedField, AtsProvenance> {
  const provenance = {} as Record<AtsParsedField, AtsProvenance>;
  for (const field of FIELDS) provenance[field] = parsed[field].length ? "parser" : "none";
  return provenance;
}

const EMPTY_PARSED: AtsParsedResume = {
  name: "",
  email: "",
  phone: "",
  links: [],
  roles: [],
  education: [],
  skills: [],
  monthsOfExperience: null,
  highestIsced: null,
  highestDegree: null,
  provenance: {
    name: "none",
    email: "none",
    phone: "none",
    roles: "none",
    education: "none",
    skills: "none",
  },
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
  const parsed: AtsParsedResume = report.parsed
    ? {
        ...report.parsed,
        education: report.parsed.education.map((entry) => ({
          ...entry,
          isced: entry.isced ?? null,
        })),
        highestIsced: report.parsed.highestIsced ?? null,
        provenance: report.parsed.provenance ?? inferProvenance(report.parsed),
      }
    : EMPTY_PARSED;

  return {
    ...result,
    report: {
      ...report,
      rules,
      categories: report.categories ?? [],
      checksPassed: report.checksPassed ?? rules.filter((rule) => rule.passed).length,
      checksTotal: report.checksTotal ?? rules.length,
      wordCount: report.wordCount ?? 0,
      parsed,
      locale: report.locale ?? { languages: [], region: null },
      engine: report.engine ?? { version: "unknown", policy: "unknown" },
      requirements: report.requirements ?? [],
    },
  };
}
