import type { AtsEnginePolicy } from "../policy/schema.js";
import { wordListRegex } from "../text/text.js";
import { policyRegex } from "../policy/regex.js";
import type { AtsDegreeLevel, AtsIscedLevel, AtsParsedDate, AtsParsedEducation } from "../types.js";
import { findDateRange, isPlausibleDate } from "./dates.js";
import { memo } from "../util/memo.js";

/** The pre-ISCED label each level is still reported under. */
export function degreeLabel(isced: AtsIscedLevel): AtsDegreeLevel {
  if (isced >= 8) return "doctorate";
  if (isced === 7) return "master";
  if (isced === 6) return "bachelor";
  if (isced === 5) return "associate";
  return "diploma";
}

type EducationMatchers = {
  schools: RegExp;
  /** Highest level first, so a line naming two credentials is recorded at the higher one. */
  levels: Array<{ isced: AtsIscedLevel; re: RegExp }>;
};

/** Compiled once per policy rather than once per call; the policy is stable for its lifetime. */
const matchersFor = memo((rp: AtsEnginePolicy["resumeParse"]): EducationMatchers => ({
  schools: wordListRegex(rp.schoolWords),
  levels: Object.entries(rp.degrees)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([level, pattern]) => ({
      isced: Number(level) as AtsIscedLevel,
      re: policyRegex(pattern, "i"),
    }))
    .sort((a, b) => b.isced - a.isced),
}));

type NamedLevel = { isced: AtsIscedLevel; level: AtsDegreeLevel; matched: string };

/** Every education level a piece of text names, highest first, with the words that named each. */
export function degreeLevels(text: string, policy: AtsEnginePolicy): NamedLevel[] {
  return matchersFor(policy.resumeParse).levels.flatMap(({ isced, re }) => {
    const match = re.exec(text);
    return match ? [{ isced, level: degreeLabel(isced), matched: match[0].trim() }] : [];
  });
}

/** The highest education level a piece of text names: what a resume's line holds. */
export function degreeLevel(text: string, policy: AtsEnginePolicy): NamedLevel | null {
  return degreeLevels(text, policy)[0] ?? null;
}

/** The level fields of an education row whose credential is already known to be one. */
export function educationLevel(credential: string, policy: AtsEnginePolicy) {
  const degree = credential ? degreeLevel(credential, policy) : null;
  return { isced: degree?.isced ?? null, level: degree?.level ?? null };
}

export function parseEducation(
  lines: string[],
  policy: AtsEnginePolicy,
  now: Date = new Date(),
): AtsParsedEducation[] {
  const { schools } = matchersFor(policy.resumeParse);
  const entries: AtsParsedEducation[] = [];

  // The line that named the last entry, while that entry still lacks a school or a credential.
  let open: { at: number; entry: AtsParsedEducation } | null = null;

  lines.forEach((line, at) => {
    const degree = degreeLevel(line, policy);
    const isSchool = schools.test(line);
    if (!degree && !isSchool) return;

    const range = findDateRange(line, policy.resumeParse, now);

    // The date range comes out before the institution is read, otherwise it rides along on the
    // end of the school name — an entry reading "University of California - 2014 - 2018" is not
    // the employer-equivalent field a recruiter would search on.
    const school = isSchool
      ? schoolName(range ? line.replace(range.matched, " ") : line, degree?.matched ?? "", policy)
      : "";
    const entry: AtsParsedEducation = {
      school,
      credential: degree?.matched ?? "",
      isced: degree?.isced ?? null,
      level: degree?.level ?? null,
      end: range ? range.range.end : loneYear(line, now),
    };

    // A degree printed over its school ("B.S., Computer Science 2015 - 2019" / "University of
    // Washington"), or under it, is one entry. Read line by line it was two half-empty rows.
    const other = open?.at === at - 1 ? open.entry : null;
    if (other && (other.school ? !entry.school && entry.isced : entry.school && !entry.isced)) {
      other.school ||= entry.school;
      other.credential ||= entry.credential;
      other.isced ??= entry.isced;
      other.level ??= entry.level;
      other.end ??= entry.end;
      open = null;
      return;
    }

    entries.push(entry);
    open = entry.school && entry.isced ? null : { at, entry };
  });

  return entries;
}

const YEAR = /(?<!\d)(?:19|20)\d{2}(?!\d)/g;

/** The separators an education line's parts are printed between, kept by `split`. */
// A dash's spaces are matched from the start of their run: from inside it, a long run of spaces
// with no dash would be rescanned from every position.
const PART = /([|,•·]|(?<!\s)\s+[–—-]\s+)/;

/**
 * The institution named in an education line, its date range already taken out.
 *
 * - The part naming the school, not the credential: "High School Diploma, Lincoln High School"
 *   has a school word in both, and the first is the diploma.
 * - Ending at its comma. A campus after one ("University of California, Berkeley") cannot be
 *   told from a city ("Harvard University, Cambridge") or a field of study ("Universität
 *   Hamburg, Informatik") without vocabulary, and a name cut short is better than a wrong one.
 * - A lone graduation year goes: "State University 2016" is not the institution's name.
 */
function schoolName(text: string, credential: string, policy: AtsEnginePolicy) {
  const { schools } = matchersFor(policy.resumeParse);
  const pieces = text.split(PART);
  const name = (at: number) =>
    pieces[at]
      .replace(YEAR, " ")
      .trim()
      .replace(/(?<![\s,–—-])[\s,–—-]+$/, "");
  const named = (at: number) => at % 2 === 0 && schools.test(name(at));

  let at = pieces.findIndex((piece, i) => named(i) && !(credential && piece.includes(credential)));
  if (at === -1) at = pieces.findIndex((_, i) => named(i));
  return at === -1 ? "" : name(at);
}

/** "Stanford University, B.S., 2018": the last plausible year on the line, when no range is. */
function loneYear(line: string, now: Date): AtsParsedDate | null {
  const years = line.match(YEAR);
  const year = years ? Number(years[years.length - 1]) : NaN;
  const date = { year, month: null };
  return isPlausibleDate(date, now) ? date : null;
}

/** The highest level among the entries, by ISCED. */
export function highestIsced(entries: AtsParsedEducation[]) {
  let best: AtsIscedLevel | null = null;
  for (const { isced } of entries)
    if (isced !== null && (best === null || isced > best)) best = isced;
  return best;
}
