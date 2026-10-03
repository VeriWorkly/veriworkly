import { prepareResume, type AtsResumeInput, type PreparedResume } from "../input.js";
import { localizePolicy, type AtsLocaleOptions } from "../locales/resolve.js";
import { computeJobMatch } from "../matching/jobMatch.js";
import { judgeRequirements } from "../matching/requirements.js";
import { policyFingerprint } from "../policy/fingerprint.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsLayoutSignals, AtsReport } from "../types.js";
import { ENGINE_VERSION } from "../version.js";
import { rollUpCategories } from "./categories.js";
import { readResume } from "./context.js";
import { scoreRules, strengthsOf } from "./score.js";

/**
 * Postings past this are cut: every step that reads a posting is linear in it, and a real one
 * is a few thousand characters. The AI tasks cut at the same length.
 */
const MAX_JOB_DESCRIPTION_CHARS = 20_000;

/** Enough for any resume; a document past it is not one. */
const MAX_REPORTED_LINES = 500;

/** Everything `check` reads besides the resume and the policy. */
export type AtsCheckOptions = {
  /** Enables job match scoring. Read up to its first 20 000 characters. */
  jobDescription?: string;
  /** Page geometry from a file upload. Absent for text and documents; layout rules then drop out. */
  layout?: AtsLayoutSignals;
  /**
   * The reference date for the tenure of a current role and for the plausible-year ceiling.
   * Defaults to the current time; pass a fixed value wherever a result must be reproducible.
   */
  now?: Date;
  /**
   * Return the text as the engine read it, one entry per line (`report.lines`). Off by default:
   * it is the resume's full text. Worth showing a candidate, because reading order — not columns
   * as such — is what breaks a multi-column layout, and it is visible only here.
   */
  includeLines?: boolean;
} & AtsLocaleOptions;

export class AtsScoringService {
  /**
   * Scores a resume against a policy.
   *
   * The policy is a parameter rather than something this module fetches: loading it is I/O and
   * caching it is state, and a library that scores text should do neither. The report is a pure
   * function of (resume, policy, options).
   *
   * `resume` may be raw input or a `PreparedResume`. Throws `AtsInputError` for a structured
   * document that fails validation.
   *
   * When locale packs are attached to the policy (`withLocales`), the resume and the posting are
   * read in the languages they are detected as, and in one region; `report.locale` says which.
   */
  static check(
    resume: AtsResumeInput | PreparedResume,
    basePolicy: AtsEnginePolicy,
    options: AtsCheckOptions = {},
  ): AtsReport {
    const { layout, now = new Date() } = options;
    // Untyped callers send anything; only a string is a posting.
    const jobDescription =
      typeof options.jobDescription === "string"
        ? options.jobDescription.slice(0, MAX_JOB_DESCRIPTION_CHARS)
        : undefined;
    const prepared = prepareResume(resume);
    const { policy, locale } = localizePolicy(
      basePolicy,
      jobDescription === undefined ? prepared.text : `${prepared.text}\n${jobDescription}`,
      options,
      prepared.text,
    );

    const { ctx, lines, sections, parsed } = readResume(prepared, policy, {
      jobDescription,
      layout,
      now,
    });
    const { active, results, readinessScore } = scoreRules(policy.rules, ctx);
    const jobMatch = computeJobMatch(ctx.text, jobDescription, policy);
    const failedChecks = results.filter((rule) => !rule.passed);

    return {
      version: policy.version,
      readinessScore,
      jobMatchScore: jobMatch.score,
      matchedKeywords: jobMatch.matched,
      missingKeywords: jobMatch.missing,
      // Match on the declared category rather than a substring of the rule id: the id is a
      // naming convention, the category is the field that actually means "this is a parsing
      // check", and a rule renamed without "parse" in its id would silently stop reporting.
      parsingWarnings: failedChecks
        .filter((rule) => rule.category === "parse" || rule.category === "format")
        .map((rule) => rule.evidence),
      strengths: strengthsOf(active, results),
      failedChecks,
      prioritizedFixes: [...failedChecks]
        .sort((a, b) => b.scoreImpact - a.scoreImpact)
        .slice(0, 6)
        .map((rule) => rule.fix),
      rules: results,
      categories: rollUpCategories(active, results),
      checksPassed: results.length - failedChecks.length,
      checksTotal: results.length,
      wordCount: ctx.wordCount,
      parsed,
      locale,
      engine: { version: ENGINE_VERSION, policy: policyFingerprint(policy) },
      requirements: judgeRequirements(jobDescription, sections, parsed, policy),
      ...(options.includeLines && { lines: lines.slice(0, MAX_REPORTED_LINES) }),
    };
  }
}
