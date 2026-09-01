import { computeJobMatch } from "../matching/jobMatch.js";
import { words } from "../matching/text.js";
import { parseQuality, parseResume } from "../parser/index.js";
import { isHeadingLine } from "../parser/sections.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsLayoutSignals, AtsReport } from "../types.js";
import { rollUpCategories } from "./categories.js";
import { evaluateRule, isApplicable, maxImpactOf, type RuleContext } from "./rules.js";

/**
 * `resume` accepts an arbitrary JSON object (a Studio resume document), and the body parser
 * allows 4 MB — so the shape reaching `flatten` is attacker-controlled and can be nested as
 * deeply as that budget allows. Unbounded recursion over it is a stack-overflow away from a
 * 500 on every request that shares the worker, so depth is capped. Real resume documents nest
 * about four levels (document -> section -> item -> highlights), so 24 is far past anything
 * legitimate and still shallow enough to be safe.
 */
const MAX_FLATTEN_DEPTH = 24;
const MAX_TEXT_CHARS = 50_000;

/**
 * Object keys are emitted on their own line rather than inline with their value. Collapsing
 * whitespace produces the identical `text` either way, but it gives `lines` real structure for
 * a Studio resume document: the key "experience" becomes a standalone line that reads as a
 * section heading, which is what the heading-scoped structure rules need to see.
 */
function flatten(value: unknown, depth = 0): string {
  if (typeof value === "string") return value;
  if (depth >= MAX_FLATTEN_DEPTH) return "";
  if (Array.isArray(value)) return value.map((item) => flatten(item, depth + 1)).join("\n");
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}\n${flatten(item, depth + 1)}`)
      .join("\n");
  return "";
}

/**
 * Lines that carry substantive content — bullets and full sentences — as opposed to headings,
 * contact lines, short skill tags, and layout debris. Both ratio metrics divide by this rather
 * than by every line, so a resume is not rewarded for padding with one-word lines or punished
 * for having a tidy header block.
 *
 * The verb list comes from `policy.text.contentLineVerbs` rather than a literal here, so a
 * policy in another language brings its own. Memoised against the policy object: this compiles
 * one regex per policy, not one per resume.
 */
const contentLineCache = new WeakMap<AtsEnginePolicy, (line: string) => boolean>();

function contentLineTest(policy: AtsEnginePolicy) {
  const cached = contentLineCache.get(policy);
  if (cached) return cached;

  const verbs = new RegExp(`\\b(${policy.text.contentLineVerbs.join("|")})\\b`, "i");
  const test = (line: string) =>
    /^[-•*–—]/.test(line) || verbs.test(line) || line.split(/\s+/).length >= 4;

  contentLineCache.set(policy, test);
  return test;
}

export class AtsScoringService {
  /**
   * Resume document -> raw text, newlines intact and length-capped.
   *
   * Callers that need both a report and an AI pass should flatten once with this and hand the
   * string to both, rather than letting each of them walk the object again.
   */
  static flattenResume(resume: unknown) {
    return flatten(resume).trim().slice(0, MAX_TEXT_CHARS);
  }

  /** Single-line form, for prompts and length measurements that do not care about layout. */
  static extractText(resume: unknown) {
    return this.flattenResume(resume).replace(/\s+/g, " ").trim();
  }

  /**
   * The policy is a parameter rather than something this module fetches.
   *
   * Loading it is I/O and caching it is state, and a library that scores text should do neither:
   * the host knows where the policy comes from, when it changes, and what to do when it is
   * missing. Everything below is a pure function of (resume, jobDescription, layout, policy).
   */
  static check(
    resume: unknown,
    policy: AtsEnginePolicy,
    jobDescription?: string,
    layout?: AtsLayoutSignals,
  ): AtsReport {
    const rawText = this.flattenResume(resume);
    const text = rawText.replace(/\s+/g, " ").trim();
    const lines = rawText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const wordCount = words(text).length;

    /**
     * The same pass produces both halves of the report: the rule scores, and the fields an ATS
     * would recover. Parsing is cheap and deterministic, so there is no reason to make the
     * caller ask twice — and no reason to spend a second scan from their quota to see it.
     */
    const parsed = parseResume(lines, policy);
    const isContentLine = contentLineTest(policy);

    const ctx: RuleContext = {
      text,
      wordCount,
      lines,
      headingLines: lines.filter(isHeadingLine),
      contentLines: lines.filter(isContentLine),
      layout,
      quality: parseQuality(parsed),
      policy,
    };

    const activeRules = policy.rules.filter((rule) => isApplicable(rule, ctx));
    const rules = activeRules.map((rule) => evaluateRule(rule, ctx));

    // Normalised against what the applicable rules could actually take away, so the score
    // genuinely spans 0-100 and means the same thing whether or not layout geometry was
    // available. Subtracting raw impacts from 100 floored the worst possible resume at 11,
    // which quietly compressed the bottom of the scale the verdict bands are calibrated on.
    const lost = rules.reduce((sum, rule) => sum + rule.scoreImpact, 0);
    const possible = activeRules.reduce((sum, rule) => sum + maxImpactOf(rule), 0);
    const readinessScore =
      possible > 0 ? Math.max(0, Math.round((1 - lost / possible) * 100)) : 100;

    const jobMatch = computeJobMatch(text, jobDescription, policy);
    const failedChecks = rules.filter((rule) => !rule.passed);

    // Ordered by the points each rule protected, so the highlights are the meaningful ones
    // rather than whichever rules happen to sit at the top of the policy file.
    const strengths = rules
      .map((rule, index) => ({ rule, possible: maxImpactOf(activeRules[index]) }))
      .filter((entry) => entry.rule.passed)
      .sort((a, b) => b.possible - a.possible)
      .slice(0, 5)
      .map((entry) => entry.rule.evidence);

    return {
      version: policy.version as AtsReport["version"],
      readinessScore,
      jobMatchScore: jobMatch.score,
      matchedKeywords: jobMatch.matched,
      missingKeywords: jobMatch.missing,
      // Match on the declared category rather than a substring of the rule id: the id is a
      // naming convention, the category is the field that actually means "this is a parsing
      // check", and a rule renamed without "parse" in its id would silently stop reporting.
      parsingWarnings: rules
        .filter((rule) => !rule.passed && (rule.category === "parse" || rule.category === "format"))
        .map((rule) => rule.evidence),
      strengths,
      failedChecks,
      prioritizedFixes: [...failedChecks]
        .sort((a, b) => b.scoreImpact - a.scoreImpact)
        .slice(0, 6)
        .map((rule) => rule.fix),
      rules,
      categories: rollUpCategories(activeRules, rules),
      checksPassed: rules.length - failedChecks.length,
      checksTotal: rules.length,
      wordCount,
      parsed,
    };
  }
}
