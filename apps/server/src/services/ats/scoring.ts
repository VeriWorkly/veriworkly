import { getAtsEnginePolicy } from "#services/ats/enginePolicy";
import type { AtsEngineRule, AtsEnginePolicy } from "#services/ats/enginePolicy";
import { parseQuality, parseResume } from "#services/ats/resumeParse";
import type {
  AtsCategoryScore,
  AtsLayoutSignals,
  AtsReport,
  AtsRuleResult,
} from "#services/ats/types";

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

function words(text: string) {
  return text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
}

/**
 * Permissive vocabulary tokenizer, used with `exec` so match offsets are available for phrase
 * masking. Preserves leading-dot frameworks (.net), slash-delimited concepts (ci/cd, tcp/ip),
 * symbols (c++, c#), and domain terms (node.js, next.js) without dropping 2-letter tokens like
 * js, ai, ml, ux. Trailing "." and "/" picked up from sentence ends are stripped at the call
 * site so "JavaScript." and "JavaScript" fold together.
 */
const VOCABULARY_TOKEN = /(?:\.[a-z0-9+#]+|[a-z][a-z0-9+#./-]*)/g;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Conservative suffix stripper — good enough to fold "managed/manages/managing" together without a stemmer dependency. */
function stem(word: string): string {
  if (word.length > 6 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * A line that reads as a section heading rather than body copy: short, and not punctuated like
 * a sentence. Deliberately generous on width (up to eight words) so real-world variants —
 * "Professional Experience", "Core Technical Competencies" — still register, while prose that
 * merely mentions the word ("8 years of experience in education technology") does not.
 */
function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[.,;]$/.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 8;
}

/**
 * Lines that carry substantive content — bullets and full sentences — as opposed to headings,
 * contact lines, short skill tags, and layout debris. Both ratio metrics divide by this rather
 * than by every line, so a resume is not rewarded for padding with one-word lines or punished
 * for having a tidy header block.
 */
function isContentLine(line: string) {
  return (
    /^[-•*–—]/.test(line) ||
    /\b(managed|led|built|developed|designed|improved|reduced|increased|delivered|achieved|created|generated|optimized|launched|spearheaded|engineered|maintained|scaled|automated)\b/i.test(
      line,
    ) ||
    line.split(/\s+/).length >= 4
  );
}

type RuleContext = {
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
function isApplicable(rule: AtsEngineRule, ctx: RuleContext) {
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

function evaluateRule(rule: AtsEngineRule, ctx: RuleContext): AtsRuleResult {
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

function resolveLayoutMetric(
  rule: Extract<AtsEngineRule, { kind: "layout" }>,
  ctx: RuleContext,
): number {
  // Guarded by `isApplicable`, which drops layout rules whose metric was not captured.
  if (!ctx.layout) return 0;
  return rule.metric === "columnRatio" ? (ctx.layout.columnRatio ?? 0) : ctx.layout.tableCount;
}

/**
 * The worst this rule could have cost. For everything except banded rules that is simply the
 * rule's weight; a banded rule's ceiling is its heaviest band. Used to turn per-rule impacts
 * into a per-category percentage and to normalise the headline score — the individual weights
 * never leave the server.
 */
function maxImpactOf(rule: AtsEngineRule): number {
  if (rule.kind === "bands" || rule.kind === "layout" || rule.kind === "parsed")
    return rule.bands.reduce((worst, band) => Math.max(worst, band.weight), 0);
  return rule.weight;
}

function rollUpCategories(
  policyRules: AtsEngineRule[],
  results: AtsRuleResult[],
): AtsCategoryScore[] {
  const totals = new Map<string, AtsCategoryScore>();

  results.forEach((result, index) => {
    const possible = maxImpactOf(policyRules[index]);
    const entry = totals.get(result.category) ?? {
      category: result.category,
      score: 100,
      passed: 0,
      total: 0,
      lost: 0,
      possible: 0,
    };
    entry.total += 1;
    entry.passed += result.passed ? 1 : 0;
    entry.lost += result.scoreImpact;
    entry.possible += possible;
    totals.set(result.category, entry);
  });

  return [...totals.values()].map((entry) => ({
    ...entry,
    lost: Math.round(entry.lost),
    possible: Math.round(entry.possible),
    // A category whose rules carry no weight at all is informational, not failed — report it
    // as complete rather than dividing by zero.
    score:
      entry.possible > 0
        ? Math.max(0, Math.round((1 - entry.lost / entry.possible) * 100))
        : entry.passed === entry.total
          ? 100
          : 0,
  }));
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

/* ------------------------------------------------------------------------------------------ *
 * Job description analysis
 * ------------------------------------------------------------------------------------------ */

type JobSectionKind = "required" | "preferred" | "responsibilities" | "body" | "excluded";

type JobSection = { kind: JobSectionKind; text: string };

/**
 * Splits a job posting into labelled blocks, each running from its heading to the *next*
 * heading.
 *
 * The previous implementation took a fixed 600-character window after a "Requirements" heading.
 * On a normally formatted posting that window overshoots the requirements list and swallows the
 * nice-to-haves and responsibilities that follow it, so optional skills were billed at the
 * required weight and the preferred discount could never apply. Terminating at the next heading
 * is both simpler and correct at any section length.
 *
 * A posting with no recognisable headings yields a single `body` block. That is intentional:
 * scoring still works, and the specificity weighting below is what keeps boilerplate in check.
 */
function segmentJob(jobText: string, km: AtsEnginePolicy["keywordMatch"]): JobSection[] {
  const matchers: Array<{ kind: JobSectionKind; re: RegExp }> = [
    { kind: "required", re: new RegExp(km.sections.required, "i") },
    { kind: "preferred", re: new RegExp(km.sections.preferred, "i") },
    { kind: "responsibilities", re: new RegExp(km.sections.responsibilities, "i") },
    { kind: "excluded", re: new RegExp(km.sections.excluded, "i") },
  ];

  const sections: JobSection[] = [];
  let current: JobSection = { kind: "body", text: "" };

  for (const rawLine of jobText.split(/\r?\n/)) {
    const line = rawLine.trim();
    // A heading is a short standalone line. Requiring that shape stops a requirement written as
    // prose ("...you will be responsible for...") from re-labelling everything after it.
    const heading = isHeadingLine(line)
      ? matchers.find(({ re }) => re.test(line))?.kind
      : undefined;

    if (heading) {
      if (current.text.trim()) sections.push(current);
      current = { kind: heading, text: "" };
      continue;
    }
    current.text += `${line}\n`;
  }
  if (current.text.trim()) sections.push(current);

  return sections;
}

/**
 * Tokens written with a capital letter somewhere other than the start of a sentence, plus
 * short all-caps runs. Used as a specificity signal: "Kubernetes", "PostgreSQL", "Go", "AWS"
 * are proper nouns or acronyms and are almost always the actual skill; "payments", "ownership",
 * "familiarity" are not. Cheap, language-agnostic, and needs no corpus.
 */
function properNounTokens(originalText: string) {
  const proper = new Set<string>();
  const re = /[A-Za-z][A-Za-z0-9+#./-]*/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(originalText))) {
    const token = match[0];
    const before = originalText.slice(Math.max(0, match.index - 2), match.index);
    const sentenceStart = match.index === 0 || /[.!?:\n]\s*$/.test(before) || /^\s*$/.test(before);

    if (/^[A-Z0-9+#.]{2,6}$/.test(token) || (/^[A-Z]/.test(token) && !sentenceStart))
      proper.add(token.toLowerCase().replace(/[./]+$/, ""));
  }
  return proper;
}

type Term = { token: string; label: string; skill: boolean };

/**
 * Maps text to canonical term -> term metadata. Multi-word skills collapse to one token,
 * synonyms and abbreviations fold to a shared canonical form, and single words are lightly
 * stemmed so inflections line up.
 *
 * Phrase occurrences are consumed *by character span* rather than by word. Suppressing the
 * component words globally meant a resume containing "machine learning" no longer matched a
 * posting that used "learning" and "machine" separately — the words were struck from the whole
 * document because they happened to appear inside a phrase elsewhere in it.
 */
function extractVocabulary(text: string, km: AtsEnginePolicy["keywordMatch"], vocab: Vocabulary) {
  const lower = text.toLowerCase();
  const map = new Map<string, Term>();
  // Character mask marking spans already claimed by a multi-word phrase.
  const claimed = new Uint8Array(lower.length);

  for (const phrase of km.phrases) {
    // A trailing plural on the last word still refers to the same concept, and postings write
    // it either way ("relational database" / "relational databases"). Without this the phrase
    // fails to match and its words scatter into unrelated single terms.
    const re = new RegExp(`\\b${escapeRegex(phrase)}(?:e?s)?\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower))) {
      map.set(phrase, { token: phrase, label: phrase, skill: true });
      claimed.fill(1, match.index, match.index + match[0].length);
      if (match.index === re.lastIndex) re.lastIndex += 1;
    }
  }

  // Cloned rather than reused: a module-level /g/ regex carries `lastIndex` across calls.
  const tokenRe = new RegExp(VOCABULARY_TOKEN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(lower))) {
    if (claimed[match.index]) continue;
    const raw = match[0].replace(/[./]+$/, "");
    if (!raw || vocab.stopwords.has(raw) || vocab.stopwords.has(stem(raw))) continue;

    const mapped = km.synonyms[raw] ?? raw;
    if (mapped.includes(" ")) {
      if (!map.has(mapped)) map.set(mapped, { token: mapped, label: mapped, skill: true });
      continue;
    }
    const token = stem(mapped);
    if (!map.has(token)) map.set(token, { token, label: raw, skill: vocab.skillTokens.has(token) });
  }

  return map;
}

/**
 * Folds a raw word to the same canonical key `extractVocabulary` would file it under, so
 * alternation detection and term lookup agree on what counts as "the same skill".
 */
function canonicalize(raw: string, km: AtsEnginePolicy["keywordMatch"], vocab: Vocabulary) {
  const word = raw.toLowerCase().replace(/[./]+$/, "");
  if (!word || vocab.stopwords.has(word) || vocab.stopwords.has(stem(word))) return null;
  const mapped = km.synonyms[word] ?? word;
  return mapped.includes(" ") ? mapped : stem(mapped);
}

/**
 * Groups terms a posting offers as alternatives — "Go or Java", "React, Vue, or Angular" —
 * so the group is satisfied by any one member and counts once toward the total.
 *
 * Without this, every posting that names a substitute penalises the candidate for not holding
 * both sides of a choice it explicitly said was a choice. Scanned per line, because alternation
 * is a within-sentence relationship; a term appearing on its own elsewhere joins the same group
 * through the union-find, which is what makes chained lists collapse correctly.
 *
 * `or` is the only separator honoured. A slash would be ambiguous against tokens that legally
 * contain one — ci/cd, tcp/ip, a/b — and splitting those would do more harm than the extra
 * coverage is worth.
 */
function alternationGroups(
  lines: string[],
  km: AtsEnginePolicy["keywordMatch"],
  vocab: Vocabulary,
) {
  const parent = new Map<string, string>();
  const find = (token: string): string => {
    const seen = parent.get(token);
    if (seen === undefined || seen === token) return token;
    const root = find(seen);
    parent.set(token, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const [rootA, rootB] = [find(a), find(b)];
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  /**
   * A term joins at most one alternation group — the first that names it.
   *
   * Without this the union-find chains transitively across the whole posting, and any word that
   * turns up beside two different "or"s silently welds their requirements together. Measured:
   * a posting asking for "Java or equivalent" and "Python or equivalent" scored a Java-only
   * resume at 100 and dropped Python from the missing list entirely, because "equivalent"
   * bridged them. Treating "Java or Kotlin" and "Kotlin or Swift" as two separate choices rather
   * than one three-way choice is also simply the more faithful reading.
   */
  const grouped = new Set<string>();

  for (const line of lines) {
    // Split first, then scan outwards from each "or" by hand. The obvious regex for this —
    // a comma-list followed by "or" — nests a quantifier inside a repetition, and on a line
    // holding a long comma-separated list with no "or" in it the engine backtracks through
    // every possible split at every start position. Measured at 546 ms for one such job
    // description against 10 ms for a normal one, on an endpoint that is free, unauthenticated,
    // and single-threaded. The hand-rolled scan below is linear and needs no such care.
    const parts = line.split(/\bor\b/i);
    if (parts.length < 2) continue;

    for (let i = 1; i < parts.length; i += 1) {
      const members = [...trailingList(parts[i - 1]), ...leadingList(parts[i])]
        .map((word) => canonicalize(word, km, vocab))
        .filter((token): token is string => token !== null && !grouped.has(token));

      for (const member of members) grouped.add(member);
      for (let member = 1; member < members.length; member += 1) union(members[0], members[member]);
    }
  }

  return find;
}

const isTermChar = (char: string) => /[a-z0-9+#./-]/i.test(char);

/**
 * Caps how many alternatives one "or" can bind together. A real posting offers a handful;
 * anything longer is prose that happens to contain a comma list, and grouping all of it would
 * make a single match satisfy a dozen unrelated requirements.
 */
const MAX_ALTERNATION_MEMBERS = 8;

/** The comma-separated run immediately preceding an "or": "React, Vue, " -> [react, vue]. */
function trailingList(text: string) {
  const tokens: string[] = [];
  let index = text.length;

  // Step over an Oxford comma. "React, Vue, or Angular" leaves a trailing comma right before
  // the "or"; without this the backward scan hits it immediately and returns nothing, silently
  // reducing the commonest three-way alternative to three separate requirements.
  while (index > 0 && /\s/.test(text[index - 1])) index -= 1;
  if (index > 0 && text[index - 1] === ",") index -= 1;

  while (tokens.length < MAX_ALTERNATION_MEMBERS) {
    while (index > 0 && /\s/.test(text[index - 1])) index -= 1;
    const end = index;
    while (index > 0 && isTermChar(text[index - 1])) index -= 1;
    if (index === end) break;

    tokens.unshift(text.slice(index, end));

    let comma = index;
    while (comma > 0 && /\s/.test(text[comma - 1])) comma -= 1;
    if (comma === 0 || text[comma - 1] !== ",") break;
    index = comma - 1;
  }

  return tokens;
}

/** The single term immediately following an "or": " Angular and more" -> [angular]. */
function leadingList(text: string) {
  let index = 0;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  const start = index;
  while (index < text.length && isTermChar(text[index])) index += 1;
  return start === index ? [] : [text.slice(start, index)];
}

type Vocabulary = {
  /** Stopwords stored both raw and stemmed, so "experiences" is filtered like "experience". */
  stopwords: Set<string>;
  /** Canonical tokens the policy explicitly recognises as skills. */
  skillTokens: Set<string>;
  /** Canonical skill -> canonical capabilities it demonstrates. Resume side only. */
  implies: Map<string, string[]>;
};

const vocabularyCache = new WeakMap<AtsEnginePolicy["keywordMatch"], Vocabulary>();

function buildVocabulary(km: AtsEnginePolicy["keywordMatch"]): Vocabulary {
  const cached = vocabularyCache.get(km);
  if (cached) return cached;

  const stopwords = new Set<string>();
  for (const word of km.stopwords) {
    stopwords.add(word);
    stopwords.add(stem(word));
  }

  // Everything the policy names explicitly — phrases plus both sides of the synonym map — is a
  // known skill by construction. Anything else has to earn the classification at match time.
  const skillTokens = new Set<string>();
  for (const phrase of km.phrases) skillTokens.add(phrase);
  for (const [abbreviation, canonical] of Object.entries(km.synonyms)) {
    skillTokens.add(stem(abbreviation));
    skillTokens.add(canonical.includes(" ") ? canonical : stem(canonical));
  }

  const vocabulary: Vocabulary = { stopwords, skillTokens, implies: new Map() };

  // Both sides of the implication map are folded through the same canonicalisation the term
  // maps use, so "PostgreSQL" -> "relational database" lines up with whatever spelling the
  // posting happened to use.
  for (const [skill, capabilities] of Object.entries(km.implies)) {
    const from = canonicalize(skill, km, vocabulary);
    if (!from) continue;
    const to = capabilities
      .map((capability) => canonicalize(capability, km, vocabulary))
      .filter((token): token is string => Boolean(token));
    if (to.length) vocabulary.implies.set(from, to);
  }

  vocabularyCache.set(km, vocabulary);
  return vocabulary;
}

/**
 * The resume's literal terms plus everything they demonstrate. Matching against this rather
 * than the literal set is what stops the report telling a candidate who listed Terraform that
 * they are missing "infrastructure as code".
 */
function resumeCapabilities(resumeTerms: Map<string, Term>, vocab: Vocabulary) {
  const capabilities = new Set(resumeTerms.keys());
  for (const token of resumeTerms.keys())
    for (const implied of vocab.implies.get(token) ?? []) capabilities.add(implied);
  return capabilities;
}

/**
 * Scores the resume against the posting.
 *
 * Two independent defences keep boilerplate out of the score, because either one alone is
 * defeatable. Section scoping drops "About us", benefits, and EEO copy entirely — but only
 * works on a posting that has headings. Specificity weighting discounts ordinary English
 * against recognised skills and proper nouns — and works on any posting, headings or not.
 * Without both, a strong candidate scored around 30 against a posting they matched completely,
 * because "dental", "stipend" and the employer's own name counted the same as "Kubernetes".
 */
function computeJobMatch(
  resumeText: string,
  jobDescription: string | undefined,
  policy: AtsEnginePolicy,
) {
  const km = policy.keywordMatch;
  const jobText = jobDescription?.trim();
  if (!jobText)
    return { score: null as number | null, matched: [] as string[], missing: [] as string[] };

  const vocab = buildVocabulary(km);
  const sections = segmentJob(jobText, km);
  const proper = properNounTokens(jobText);

  const sectionWeight: Record<JobSectionKind, number> = {
    required: km.requiredWeight,
    preferred: km.preferredWeight,
    responsibilities: km.responsibilitiesWeight,
    body: km.defaultWeight,
    excluded: 0,
  };

  // A term can appear in more than one block. Keep the strongest claim: a skill listed under
  // Requirements is required even if it is mentioned again in the responsibilities prose.
  const terms = new Map<string, { label: string; weight: number; skill: boolean }>();
  const scoredLines: string[] = [];

  for (const section of sections) {
    const weight = sectionWeight[section.kind];
    if (weight <= 0) continue;
    // Appended rather than spread: a posting is capped at 20k characters, which is more than
    // enough newlines to push a spread past the engine's argument-count limit.
    for (const line of section.text.split("\n")) scoredLines.push(line);

    for (const [token, term] of extractVocabulary(section.text, km, vocab)) {
      const skill = term.skill || proper.has(term.label) || proper.has(token);
      const specificity = skill ? 1 : km.generalTermWeight;
      const scored = weight * specificity;
      const existing = terms.get(token);
      if (!existing || scored > existing.weight)
        terms.set(token, { label: term.label, weight: scored, skill });
    }
  }

  if (terms.size === 0) return { score: null, matched: [], missing: [] };

  const held = resumeCapabilities(extractVocabulary(resumeText, km, vocab), vocab);
  const find = alternationGroups(scoredLines, km, vocab);

  // Alternatives collapse into one requirement worth one member's weight, satisfied by any of
  // them. "Go or Java" is a single ask, not two.
  type Group = {
    members: Array<{ label: string; skill: boolean }>;
    weight: number;
    matched: string | null;
  };
  const groups = new Map<string, Group>();

  for (const [token, term] of terms) {
    const root = find(token);
    const group = groups.get(root) ?? { members: [], weight: 0, matched: null };
    group.members.push({ label: term.label, skill: term.skill });
    group.weight = Math.max(group.weight, term.weight);
    if (group.matched === null && held.has(token)) group.matched = term.label;
    groups.set(root, group);
  }

  let totalWeight = 0;
  let matchedWeight = 0;
  const matched: Array<{ label: string; weight: number; skill: boolean }> = [];
  const missing: Array<{ label: string; weight: number; skill: boolean }> = [];

  for (const group of groups.values()) {
    totalWeight += group.weight;
    const skill = group.members.some((member) => member.skill);
    if (group.matched !== null) {
      matchedWeight += group.weight;
      matched.push({ label: group.matched, weight: group.weight, skill });
    } else {
      // Named as the choice the posting actually offered, so the advice reads "Go or Java"
      // rather than listing each alternative as a separate gap.
      missing.push({
        label: group.members.map((member) => member.label).join(" or "),
        weight: group.weight,
        skill,
      });
    }
  }

  // Recognised skills lead both lists regardless of section weight: a missing skill is always
  // more actionable advice than a missing ordinary word, and these lists are what the user is
  // shown and what the AI layer is handed as evidence.
  const rank = (a: { weight: number; skill: boolean }, b: { weight: number; skill: boolean }) =>
    Number(b.skill) - Number(a.skill) || b.weight - a.weight;

  matched.sort(rank);
  missing.sort(rank);

  return {
    score: totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : null,
    matched: matched.slice(0, 12).map((m) => m.label),
    missing: missing.slice(0, 12).map((m) => m.label),
  };
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

  static check(resume: unknown, jobDescription?: string, layout?: AtsLayoutSignals): AtsReport {
    const policy = getAtsEnginePolicy();
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
