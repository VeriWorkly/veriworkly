import { formatTemplate } from "../matching/text.js";
import type { parseQuality } from "../parser/index.js";
import type { AtsEnginePolicy, AtsEngineRule } from "../policy/schema.js";
import type { AtsLayoutSignals, AtsRuleResult } from "../types.js";

export type RuleContext = {
  text: string;
  wordCount: number;
  lines: string[];
  headingLines: string[];
  contentLines: string[];
  layout: AtsLayoutSignals | undefined;
  /** Field-recovery metrics from `parseResume`; see the "parsed" rule kind. */
  quality: ReturnType<typeof parseQuality>;
  policy: AtsEnginePolicy;
};

/**
 * A rule is applicable only when the evidence it reads actually exists. Layout rules measure
 * page geometry, which is present for uploaded documents and absent for pasted text — and an
 * absent signal is not a pass. Inapplicable rules are dropped from the report and from the
 * score's denominator rather than being silently awarded or silently deducted.
 */
export function isApplicable(rule: AtsEngineRule, ctx: RuleContext) {
  if (rule.kind !== "layout") return true;
  if (!ctx.layout) return false;
  // Measured per metric, not per document: a short resume can still be checked for ruled tables
  // even though it has too few lines for the column ratio to carry any signal.
  return rule.metric !== "columnRatio" || ctx.layout.columnRatio !== null;
}

/**
 * Which strings a `presence` rule is tested against.
 *
 * `document` is the whitespace-collapsed resume — correct for rules that ask whether something
 * exists anywhere (an email address, a date range). It is *wrong* for anything line-anchored:
 * the collapsed string has no newlines, so a `^` under the `m` flag has nothing to bind to and
 * matches only offset zero. `line` and `heading` exist so those rules test what they mean to.
 */
function presenceTargets(scope: "document" | "line" | "heading", ctx: RuleContext) {
  if (scope === "line") return ctx.lines.length ? ctx.lines : [ctx.text];
  if (scope === "heading") {
    // With no line structure at all (a pasted single-paragraph resume, or a resume that
    // extracted as one run) headings are undetectable, so fall back rather than failing every
    // structure rule on a document whose layout we simply cannot see.
    if (ctx.lines.length <= 1) return ctx.lines.length ? ctx.lines : [ctx.text];
    return ctx.headingLines;
  }
  return [ctx.text];
}

function resolveLayoutMetric(
  rule: Extract<AtsEngineRule, { kind: "layout" }>,
  ctx: RuleContext,
): number {
  // Guarded by `isApplicable`, which drops layout rules whose metric was not captured.
  if (!ctx.layout) return 0;
  return rule.metric === "columnRatio" ? (ctx.layout.columnRatio ?? 0) : ctx.layout.tableCount;
}

function resolveBandMetric(
  rule: Extract<AtsEngineRule, { kind: "bands" }>,
  ctx: RuleContext,
): number {
  if (rule.metric === "wordCount") return ctx.wordCount;

  if (rule.metric === "metricsRatio" || rule.metric === "actionVerbRatio") {
    if (!rule.pattern || ctx.lines.length === 0) return 0;
    const re = new RegExp(rule.pattern, rule.flags || "i");
    const targetLines = ctx.contentLines.length > 0 ? ctx.contentLines : ctx.lines;

    if (rule.metric === "metricsRatio")
      return targetLines.filter((line) => re.test(line)).length / targetLines.length;

    // Action verbs are graded on where they appear, not merely whether they appear. A single
    // verb anywhere in the document used to satisfy this check outright; what recruiters and
    // parsers actually reward is bullets that *open* with one, so the match has to land in the
    // opening few words of the line.
    const opensWithVerb = (line: string) => {
      const opening = line
        .replace(/^[-•*–—\s]+/, "")
        .split(/\s+/)
        .slice(0, 3)
        .join(" ");
      return re.test(opening);
    };
    return targetLines.filter(opensWithVerb).length / targetLines.length;
  }

  // buzzwordCount
  const lower = ctx.text.toLowerCase();
  return ctx.policy.keywordMatch.buzzwords.reduce(
    (count, phrase) => count + (lower.includes(phrase) ? 1 : 0),
    0,
  );
}

export function evaluateRule(rule: AtsEngineRule, ctx: RuleContext): AtsRuleResult {
  if (rule.kind === "min-words") {
    const passed = ctx.wordCount >= rule.min;
    const vars = { n: ctx.wordCount };
    return {
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      passed,
      evidence: formatTemplate(passed ? rule.passEvidence : rule.failEvidence, vars),
      scoreImpact: passed ? 0 : rule.weight,
      fix: rule.fix,
    };
  }

  if (rule.kind === "presence") {
    // Built fresh per evaluation and stripped of `g`: a sticky regex carries `lastIndex`
    // between `.test()` calls, which would make results depend on how many targets precede.
    const re = new RegExp(rule.pattern, rule.flags.replace(/g/g, ""));
    const matched = presenceTargets(rule.scope, ctx).some((target) => re.test(target));
    const passed = rule.invert ? !matched : matched;
    return {
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      passed,
      evidence: passed ? rule.passEvidence : rule.failEvidence,
      scoreImpact: passed ? 0 : rule.weight,
      fix: rule.fix,
    };
  }

  if (rule.kind === "position") {
    const emailMatch = ctx.text.match(new RegExp(rule.emailPattern, "i"));
    const phoneMatch = ctx.text.match(new RegExp(rule.phonePattern));
    const emailIndex = emailMatch?.index ?? Infinity;
    const phoneIndex = phoneMatch?.index ?? Infinity;
    const earliest = Math.min(emailIndex, phoneIndex);
    const hasContact = Number.isFinite(earliest);
    const threshold = ctx.text.length * rule.windowFraction;
    const passed = !hasContact || earliest <= threshold;
    return {
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      passed,
      evidence: passed ? rule.passEvidence : rule.failEvidence,
      scoreImpact: passed ? 0 : rule.weight,
      fix: rule.fix,
    };
  }

  // kind === "bands" | "layout" | "parsed" — all three grade a number against ordered thresholds.
  const value =
    rule.kind === "layout"
      ? resolveLayoutMetric(rule, ctx)
      : rule.kind === "parsed"
        ? ctx.quality[rule.metric]
        : resolveBandMetric(rule, ctx);
  const band =
    rule.bands.find((candidate) => candidate.upTo !== null && value <= candidate.upTo) ??
    rule.bands[rule.bands.length - 1];
  const passed = band.weight === 0;
  const vars = { n: Math.round(value), pct: Math.round(value * 100) };
  return {
    id: rule.id,
    category: rule.category,
    severity: rule.severity,
    passed,
    evidence: formatTemplate(passed ? rule.passEvidence : rule.failEvidence, vars),
    scoreImpact: band.weight,
    fix: rule.fix,
  };
}

/**
 * The worst this rule could have cost. For everything except banded rules that is simply the
 * rule's weight; a banded rule's ceiling is its heaviest band. Used to turn per-rule impacts
 * into a per-category percentage and to normalise the headline score — the individual weights
 * never leave the server.
 */
export function maxImpactOf(rule: AtsEngineRule): number {
  if (rule.kind === "bands" || rule.kind === "layout" || rule.kind === "parsed")
    return rule.bands.reduce((worst, band) => Math.max(worst, band.weight), 0);
  return rule.weight;
}
