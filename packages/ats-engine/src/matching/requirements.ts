import { ISCED_LABELS } from "../format/index.js";
import { degreeLevels } from "../parser/education.js";
import { monthsOfExperience } from "../parser/tenure.js";
import type { ResumeSection, ResumeSectionKind } from "../parser/sections.js";
import { policyRegex } from "../policy/regex.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedResume, AtsRequirement } from "../types.js";
import { memo } from "../util/memo.js";
import { own } from "../util/own.js";
import { alternationGroups } from "./alternation.js";
import { segmentJob } from "./jobSections.js";
import { BULLET_PREFIX, escapeRegex, wordListPattern, wordListRegex } from "../text/text.js";
import {
  buildVocabulary,
  extractVocabulary,
  properNounTokens,
  resumeCapabilities,
} from "./vocabulary.js";

/**
 * The posting's requirements, one by one, judged against the resume.
 *
 * A single keyword percentage is not how a resume is screened in 2026: an LLM grader reads each
 * qualification and asks whether the resume shows it (Workday HiredScore's per-qualification
 * grades, Ashby's "meets / does not meet" with citations), and a knockout question filters on
 * years, a degree or the right to work before anyone reads at all. This produces that view:
 * each requirement under the posting's Requirements or Preferred heading, its status, the terms
 * it names, and the resume lines that evidence it — so the candidate sees exactly which ask is
 * unmet, and where the resume already answers the rest.
 *
 * Deterministic and explainable like the rest of the engine: no model is involved. A model can
 * read nuance this cannot ("leadership"); what this reports, it can point to.
 */

const MAX_REQUIREMENTS = 25;
const MAX_REQUIREMENT_CHARS = 300;
const MAX_EVIDENCE = 2;
const MAX_TERMS = 6;
/** Lines searched for evidence. A resume has a few hundred; a document past this is not one. */
const MAX_EVIDENCE_LINES = 1_000;
/** Years of dated work that let "or equivalent experience" stand in for a degree. */
const EQUIVALENT_MONTHS = 24;
const NEGATED_EVIDENCE = /\b(?:not|no|without|lack(?:ing)?|inactive|expired)\b/iu;
const WEAK_LANGUAGE = /\b(?:beginner|basic|elementary|limited|a1|a2)\b/iu;

type Status = "met" | "partial" | "missing";
const STRENGTH: Record<Status, number> = { missing: 0, partial: 1, met: 2 };
const weaker = (a: Status, b: Status) => (STRENGTH[a] <= STRENGTH[b] ? a : b);
const stronger = (a: Status, b: Status) => (STRENGTH[a] >= STRENGTH[b] ? a : b);

/** Where evidence is strongest: work history first, a bare skills list last. */
const EVIDENCE_RANK: Record<ResumeSectionKind, number> = {
  experience: 0,
  projects: 1,
  other: 2,
  education: 3,
  skills: 4,
};

type Matchers = {
  years: RegExp[];
  /** Global: a line may say "proficient in Python" before the language it asks for. */
  languages: RegExp[];
  /** Every language the policy names, in any language: `languageNames` keys and values. */
  languageNames: Set<string>;
  /** Any of those names, as a word, globally: which languages a resume line names. */
  anyLanguage: RegExp;
  /** A line that opens with a language, after any "Label:": "Languages: German (native)". */
  leadingLanguage: RegExp;
  equivalence: RegExp;
  /** Global, for cutting "or related field" out of the text between a degree and the years. */
  equivalences: RegExp;
  /** The words a posting offers alternatives with: "or", "oder". */
  alternation: RegExp;
  authorization: RegExp;
  clearance: RegExp;
};

const matchersOf = memo((km: AtsEnginePolicy["keywordMatch"]): Matchers => {
  const r = km.requirements;
  const names = [...new Set(Object.entries(r.languageNames).flat())].map(escapeRegex);
  return {
    years: r.yearsPatterns.map((pattern) => policyRegex(pattern, "i")),
    languages: r.languagePatterns.map((pattern) => policyRegex(pattern, "gi")),
    languageNames: new Set(
      Object.entries(r.languageNames).flatMap((pair) => pair.map((name) => name.toLowerCase())),
    ),
    anyLanguage: wordListRegex(names, "gi"),
    // Anchored, and the label bounded, so a long line costs one pass.
    leadingLanguage: new RegExp(
      `^\\s*(?:[^:]{1,40}:\\s*)?${wordListPattern(names)}\\s*(?:$|[(,;:/|–—-])`,
      "iu",
    ),
    equivalence: wordListRegex(r.equivalence),
    equivalences: wordListRegex(r.equivalence, "gi"),
    alternation: wordListRegex(km.alternationWords),
    authorization: wordListRegex(r.authorization),
    clearance: wordListRegex(r.clearance),
  };
});

/** The language a line asks for or states in a policy pattern: "fluent in German". */
function namedLanguage(text: string, matchers: Matchers) {
  return matchers.languages
    .flatMap((pattern) => [...text.matchAll(pattern)])
    .map((match) => match[1]?.toLowerCase())
    .find((captured) => captured !== undefined && matchers.languageNames.has(captured));
}

/**
 * Whether a resume line lists languages, rather than merely naming one in passing ("launched in
 * the Chinese market", "led UI polish"): it opens with one ("German (native)", "Languages:
 * German"), names two or more, or states one the way a posting asks ("native German speaker").
 */
function listsLanguages(line: string, matchers: Matchers, names: Record<string, string>) {
  const body = line.replace(BULLET_PREFIX, "");
  if (matchers.leadingLanguage.test(body)) return true;
  const named = new Set(
    [...body.matchAll(matchers.anyLanguage)].map((match) => {
      const name = match[0].toLowerCase();
      return own(names, name) ?? name;
    }),
  );
  return named.size >= 2 || namedLanguage(body, matchers) !== undefined;
}

/** Where one clause of a requirement ends: a comma, a semicolon, or the policy's "and" words. */
const clauseBreak = memo(
  (rp: AtsEnginePolicy["resumeParse"]) =>
    new RegExp(`[,;]|${wordListPattern(rp.headingConnectors)}`, "iu"),
);

/**
 * Whether the text between two asks offers them as alternatives: an alternation word joins
 * them. One the degree's own "or related field" / "or equivalent" carries is not that.
 */
const offersAlternatives = (between: string, matchers: Matchers) =>
  matchers.alternation.test(between.replace(matchers.equivalences, " "));

/** The posting's requirement statements: each line, or sentence of a long one, under its headings. */
function requirementLines(jobText: string, policy: AtsEnginePolicy) {
  const sections = segmentJob(jobText, policy);
  const asked = sections.filter((s) => s.kind === "required" || s.kind === "preferred");
  // A posting with no Requirements heading still lists them — as bullets in its body.
  const source = asked.length
    ? asked
    : sections
        .filter((s) => s.kind === "body")
        .map((s) => ({
          kind: "required" as const,
          text: s.text
            .split("\n")
            .filter((line) => BULLET_PREFIX.test(line))
            .join("\n"),
        }));

  return source
    .flatMap((section) =>
      section.text
        .split("\n")
        .flatMap((line) =>
          line.length > MAX_REQUIREMENT_CHARS ? line.split(/(?<=[.;])\s+/) : [line],
        )
        .map((line) => line.replace(BULLET_PREFIX, "").trim())
        .filter((line) => /\p{L}/u.test(line))
        .map((line) => ({
          text: line.slice(0, MAX_REQUIREMENT_CHARS),
          importance: section.kind === "preferred" ? ("preferred" as const) : ("required" as const),
        })),
    )
    .slice(0, MAX_REQUIREMENTS);
}

export function judgeRequirements(
  jobDescription: string | undefined,
  sections: readonly ResumeSection[],
  parsed: AtsParsedResume,
  policy: AtsEnginePolicy,
): AtsRequirement[] {
  const jobText = typeof jobDescription === "string" ? jobDescription.trim() : "";
  if (!jobText) return [];

  const km = policy.keywordMatch;
  const vocab = buildVocabulary(km);
  const matchers = matchersOf(km);
  const proper = properNounTokens(jobText, km.nounsCapitalized);

  // The resume line by line, each with its section and what it demonstrates. Two bounds keep
  // this linear in practice: only the phrases the resume contains at all are searched for line
  // by line (a tuned policy can carry hundreds), and no more lines than any resume has.
  const ranked = sections
    .flatMap((section) => section.lines.map((line) => ({ line, kind: section.kind })))
    .slice(0, MAX_EVIDENCE_LINES);
  const whole = ranked
    .map((entry) => entry.line)
    .join("\n")
    .toLowerCase();
  const present = { ...km, phrases: km.phrases.filter((phrase) => whole.includes(phrase)) };
  const resumeLines = ranked.map(({ line, kind }) => ({
    line,
    rank: EVIDENCE_RANK[kind],
    holds: resumeCapabilities(extractVocabulary(line, present, vocab), vocab),
  }));
  const held = new Set(resumeLines.flatMap((entry) => [...entry.holds]));
  const evidenceFor = (test: (entry: (typeof resumeLines)[number]) => boolean) =>
    resumeLines
      .filter(test)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_EVIDENCE)
      .map((entry) => entry.line.replace(BULLET_PREFIX, "").trim().slice(0, 160));
  let lists: boolean | undefined;
  const listsAny = () =>
    (lists ??= resumeLines.some((entry) =>
      listsLanguages(entry.line, matchers, km.requirements.languageNames),
    ));
  const rolesWith = (tokens: readonly string[]) => {
    const matched = new Set<number>();
    let role = -1;
    for (const section of sections) {
      if (section.kind !== "experience") continue;
      for (const line of section.lines) {
        const next = parsed.roles.findIndex(
          (item, index) =>
            index > role &&
            ((item.title && line.includes(item.title)) ||
              (item.employer && line.includes(item.employer))),
        );
        if (next >= 0) role = next;
        if (role >= 0) {
          const holds = resumeCapabilities(extractVocabulary(line, present, vocab), vocab);
          if (tokens.some((token) => holds.has(token))) matched.add(role);
        }
      }
    }
    return [...matched].map((index) => parsed.roles[index]!).filter(Boolean);
  };

  const lines = requirementLines(jobText, policy).flatMap((line) => {
    const years = matchers.years.map((re) => re.exec(line.text)).find(Boolean) ?? null;
    if (!years || (!matchers.authorization.test(line.text) && !matchers.clearance.test(line.text)))
      return [line];
    return [
      { ...line, text: line.text.slice(0, years.index).trim() },
      { ...line, text: line.text.slice(years.index).trim() },
    ].filter((part) => part.text.length > 0);
  });

  return lines.map(({ text, importance }) => {
    const base = { text, importance };

    // The right to work and a clearance: settled in the application, unless the resume says.
    for (const kind of ["authorization", "clearance"] as const) {
      if (!matchers[kind].test(text)) continue;
      const evidence = evidenceFor(
        (entry) => matchers[kind].test(entry.line) && !NEGATED_EVIDENCE.test(entry.line),
      );
      return {
        ...base,
        kind,
        status: evidence.length ? "met" : "unverifiable",
        terms: [],
        evidence,
      } satisfies AtsRequirement;
    }

    // A language: met when the resume names it, in any of the names the packs know for it. Only
    // a name the policy lists is one: "proficient in Python" has the shape of "fluent in German".
    const name = namedLanguage(text, matchers);
    if (name) {
      const names = km.requirements.languageNames;
      const english = own(names, name) ?? name;
      const aliases = [english, ...Object.keys(names).filter((alias) => names[alias] === english)];
      const named = wordListRegex([...new Set([name, ...aliases])].map(escapeRegex));
      const evidence = evidenceFor(
        (entry) => named.test(entry.line) && !WEAK_LANGUAGE.test(entry.line),
      );
      return {
        ...base,
        kind: "language",
        // Unnamed is not absent: a resume written in English rarely says "English". A resume that
        // lists its languages and leaves this one off is missing it; one that lists none (a
        // language named in passing is not a list) leaves the question to the application.
        status: evidence.length ? "met" : listsAny() ? "missing" : "unverifiable",
        terms: [{ term: name, found: evidence.length > 0 }],
        evidence,
      } satisfies AtsRequirement;
    }

    const years = matchers.years.map((re) => re.exec(text)).find(Boolean) ?? null;
    // Every level the line names, highest first, and where in the line each is named.
    const levels = degreeLevels(text, policy);
    const placed = levels
      .map(({ matched }) => ({ start: text.indexOf(matched), length: matched.length }))
      .filter(({ start }) => start >= 0)
      .map(({ start, length }) => ({ start, end: start + length }))
      .sort((a, b) => a.start - b.start);
    // Offered as alternatives ("Bachelor's or Master's", "BS/MS") the levels accept the lowest;
    // asked together ("a Master's and a teaching certificate") the highest is the bar.
    const alternatives = placed.slice(1).some((at, i) => {
      const between = text.slice(placed[i]!.end, at.start);
      return between.includes("/") || matchers.alternation.test(between);
    });
    const degree = (alternatives ? levels.at(-1) : levels[0]) ?? null;
    // "A Bachelor's degree or 4+ years": either ask meets the line, when an alternation word
    // stands between the years and the degree nearest them — in the clause next to the years,
    // so "in Computer Science, Engineering or a related field, and 3+ years" offers no choice.
    const eitherAsk = (() => {
      if (!years) return false;
      const from = years.index;
      const to = from + years[0].length;
      const clauses = clauseBreak(policy.resumeParse);
      const nearest = placed
        .map(({ start, end }) =>
          end <= from
            ? text.slice(end, from).split(clauses).at(-1)!
            : start >= to
              ? text.slice(to, start).split(clauses)[0]!
              : null,
        )
        .filter((between): between is string => between !== null)
        .sort((a, b) => a.length - b.length)[0];
      return nearest !== undefined && offersAlternatives(nearest, matchers);
    })();

    // What the requirement names beyond its years and degree. Named skills when it has any —
    // "experience with Python and AWS" is about Python and AWS — else its plainer words.
    const rest = [years?.[0], ...levels.map((level) => level.matched)].reduce<string>(
      (out, matched) => (matched ? out.replace(matched, " ") : out),
      text,
    );
    // "Go or Java" is one ask: a group is met by any of its members.
    const { find } = alternationGroups([rest], km, vocab);
    const named = [...extractVocabulary(rest, km, vocab)].filter(
      ([token, term]) => term.label.length > 2 || term.skill || proper.has(token),
    );
    const isSkill = ([token, term]: (typeof named)[number]) =>
      term.skill || proper.has(term.label) || proper.has(token);
    // Offered as the alternative to a skill, a word is one too: "Kafka" in "Kafka or RabbitMQ"
    // opens the line, so its capital says nothing, but the choice beside it does.
    const skillRoots = new Set(named.filter(isSkill).map(([token]) => find(token)));
    const skills = named.filter((entry) => isSkill(entry) || skillRoots.has(find(entry[0])));
    const picked = (
      skills.length ? skills : named.filter(([, term]) => term.label.length > 3)
    ).slice(0, MAX_TERMS);
    const groups = new Map<string, Array<[string, string]>>();
    for (const [token, term] of picked) {
      const root = find(token);
      groups.set(root, [...(groups.get(root) ?? []), [token, term.label]]);
    }
    const groupsMet = [...groups.values()].filter((members) =>
      members.some(([token]) => held.has(token)),
    ).length;
    const terms = picked.map(([token, term]) => ({ term: term.label, found: held.has(token) }));
    const termEvidence = evidenceFor((entry) => picked.some(([token]) => entry.holds.has(token)));
    const termsMet = groups.size === 0 || groupsMet === groups.size;

    // The level is what a knockout filters on. The field counts against it only when it is a
    // named subject ("Nursing"), not a plain word another language's resume would not repeat.
    const educationHolds = new Set(
      resumeLines
        .filter((entry) => entry.rank === EVIDENCE_RANK.education)
        .flatMap((entry) => [...entry.holds]),
    );
    const fieldMet =
      skills.length === 0 ||
      [...groups.values()].every((members) => members.some(([token]) => educationHolds.has(token)));

    // The degree's verdict, when the line names one.
    const degreeVerdict = degree
      ? (() => {
          const have = parsed.highestIsced;
          const met = have !== null && have >= degree.isced;
          const equivalent =
            !met &&
            matchers.equivalence.test(text) &&
            (parsed.monthsOfExperience ?? 0) >= EQUIVALENT_MONTHS;
          return {
            status: (met && fieldMet ? "met" : met || equivalent ? "partial" : "missing") as Status,
            detail: `${have === null ? "No degree read" : `${ISCED_LABELS[have]} read`}; ${ISCED_LABELS[degree.isced]} asked${equivalent ? ", or equivalent experience" : ""}`,
          };
        })()
      : null;

    if (years) {
      const asked = Number(years[1]);
      const have = parsed.monthsOfExperience === null ? null : parsed.monthsOfExperience / 12;
      const skillMonths =
        skills.length === 0
          ? null
          : monthsOfExperience(rolesWith(skills.map(([token]) => token)), new Date());
      const enough =
        skillMonths === null ? have !== null && have >= asked : skillMonths / 12 >= asked;
      const judged = (termsOk: boolean): Status =>
        enough && termsOk
          ? "met"
          : enough || (groupsMet > 0 && have !== null)
            ? "partial"
            : "missing";
      const detail =
        have === null
          ? `No dated roles to count; ${asked} years asked`
          : `${Math.floor(have)} years in the work history, ${asked} asked`;
      // "A Master's and 5+ years": both are asked, so the line is as met as the weaker of the two.
      // "A Bachelor's or 4+ years": either will do, so it is as met as the stronger, and the years
      // are held to the line's named skills as the degree is, not to its plain words ("relevant").
      const status = !degreeVerdict
        ? judged(termsMet)
        : eitherAsk
          ? stronger(judged(fieldMet), degreeVerdict.status)
          : weaker(judged(termsMet), degreeVerdict.status);
      return {
        ...base,
        kind: "experience",
        status,
        terms,
        evidence: termEvidence,
        detail: degreeVerdict ? `${detail}; ${degreeVerdict.detail}` : detail,
      } satisfies AtsRequirement;
    }

    if (degreeVerdict)
      return {
        ...base,
        kind: "education",
        status: degreeVerdict.status,
        terms,
        evidence: evidenceFor((entry) => entry.rank === EVIDENCE_RANK.education),
        detail: degreeVerdict.detail,
      } satisfies AtsRequirement;

    return {
      ...base,
      kind: "skills",
      status:
        groups.size === 0
          ? "unverifiable"
          : termsMet
            ? "met"
            : groupsMet > 0
              ? "partial"
              : "missing",
      terms,
      evidence: termEvidence,
    } satisfies AtsRequirement;
  });
}
