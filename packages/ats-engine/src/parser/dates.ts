import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedDate } from "../types.js";

/**
 * Date recognition, built from the policy's vocabulary rather than from constants in source.
 *
 * Month names and the spellings of "still here" are language-bound, so they are data. The
 * patterns are compiled per policy and memoised against it, because building six regexes for
 * every line of every resume is measurable and the policy object is stable for the life of a
 * request.
 */

export type DateRange = {
  start: AtsParsedDate | null;
  end: AtsParsedDate | null;
  current: boolean;
};

type DateMatchers = {
  months: Record<string, number>;
  range: RegExp;
  named: RegExp;
  openEnded: RegExp;
};

const cache = new WeakMap<AtsEnginePolicy["resumeParse"], DateMatchers>();

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A lone year range like "2019 - 2022" is ambiguous with a numeric bullet; require four digits. */
const YEAR_ONLY = /^\d{4}$/;

const RANGE_SEPARATOR = String.raw`\s*(?:–|—|-|~|to|until|through)\s*`;

function buildMatchers(rp: AtsEnginePolicy["resumeParse"]): DateMatchers {
  const cached = cache.get(rp);
  if (cached) return cached;

  const months = rp.months;
  // Insertion order, not sorted. A longest-first sort would be the defensible choice for a new
  // alternation, but the `[a-z]*` following the month already absorbs any longer spelling's
  // suffix, so ordering cannot change a match — and keeping the policy's own order means the
  // compiled pattern is character-identical to the one this replaced.
  const monthNames = Object.keys(months).map(escapeRegex).join("|");
  const openEnded = rp.openEnded
    .map((word) => escapeRegex(word).replace(/\\?\s+/g, String.raw`\s*`))
    .join("|");

  /** A single point in time, in any of the spellings a resume actually uses. */
  const date = String.raw`(?:(?:${monthNames})[a-z]*\.?\s+\d{4}|\d{1,2}\s*[/-]\s*\d{4}|\d{4}\s*-\s*\d{2}|\d{4})`;

  const matchers: DateMatchers = {
    months,
    range: new RegExp(String.raw`(${date})${RANGE_SEPARATOR}(${date}|(?:${openEnded}))`, "i"),
    named: new RegExp(String.raw`^(${monthNames})[a-z]*\.?\s+(\d{4})$`),
    openEnded: new RegExp(`^(?:${openEnded})$`, "i"),
  };

  cache.set(rp, matchers);
  return matchers;
}

export function parseDate(raw: string, rp: AtsEnginePolicy["resumeParse"]): AtsParsedDate | null {
  const { months, named } = buildMatchers(rp);
  const value = raw.trim().toLowerCase();

  const namedMatch = value.match(named);
  if (namedMatch) return { year: Number(namedMatch[2]), month: months[namedMatch[1]] };

  const numeric = value.match(/^(\d{1,2})\s*[/-]\s*(\d{4})$/);
  if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12)
    return { year: Number(numeric[2]), month: Number(numeric[1]) };

  // ISO-ish "2021-03", which is how a Studio document serialises its dates.
  const iso = value.match(/^(\d{4})\s*-\s*(\d{2})$/);
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12)
    return { year: Number(iso[1]), month: Number(iso[2]) };

  if (YEAR_ONLY.test(value)) return { year: Number(value), month: null };
  return null;
}

export function findDateRange(
  line: string,
  rp: AtsEnginePolicy["resumeParse"],
): { range: DateRange; matched: string } | null {
  const matchers = buildMatchers(rp);
  const match = line.match(matchers.range);
  if (!match) return null;

  const end = match[2];
  const current = matchers.openEnded.test(end.trim());

  return {
    range: {
      start: parseDate(match[1], rp),
      end: current ? null : parseDate(end, rp),
      current,
    },
    matched: match[0],
  };
}
