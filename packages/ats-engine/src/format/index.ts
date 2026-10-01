/**
 * @veriworkly/ats-engine/format — presentation helpers for ATS reports.
 *
 * Dependency-free and policy-free, so a browser bundle can import it without pulling in the
 * scorer or its schema library. Everything here is display: nothing changes a score.
 *
 * English only. ponytail: labels are literals; take them as parameters when a second locale ships.
 */

import type { AtsDegreeLevel, AtsIscedLevel, AtsParsedDate, AtsParsedRole } from "../types.js";
import { own } from "../util/own.js";

export type AtsScoreTone = "good" | "warn" | "bad";

/** Lower bounds of the display bands. Presentation only — the verdict has its own thresholds. */
export const SCORE_BANDS = { good: 80, warn: 55 } as const;

export function scoreTone(score: number): AtsScoreTone {
  if (score >= SCORE_BANDS.good) return "good";
  if (score >= SCORE_BANDS.warn) return "warn";
  return "bad";
}

/**
 * Category ids in the order a report reads best: can it be trusted, read, found, navigated,
 * believed. Integrity leads because a finding there outweighs everything below it.
 */
export const CATEGORY_ORDER = [
  "integrity",
  "parse",
  "contact",
  "structure",
  "content",
  "format",
] as const;

export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  parse: "Parsing",
  contact: "Contact & links",
  structure: "Structure",
  content: "Evidence",
  format: "Format risk",
  integrity: "Integrity",
};

/** A policy may define categories this list does not know; they are title-cased, not hidden. */
export function categoryLabel(category: string) {
  return own(CATEGORY_LABELS, category) ?? category.charAt(0).toUpperCase() + category.slice(1);
}

/** Known categories first in `CATEGORY_ORDER`, unknown ones after, each group stable. */
export function sortByCategoryOrder<T extends { category: string }>(items: readonly T[]): T[] {
  const rank = (category: string) => {
    const index = (CATEGORY_ORDER as readonly string[]).indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return [...items].sort((a, b) => rank(a.category) - rank(b.category));
}

const MONTH_LABELS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** "Mar 2021", or "2021" when only the year is known, or `null` when there is no date. */
export function formatParsedDate(date: AtsParsedDate | null): string | null {
  if (!date) return null;
  return date.month ? `${MONTH_LABELS[date.month - 1]} ${date.year}` : String(date.year);
}

/** "Mar 2021 – Present", "2018 – 2020", or `null` when the role has no start. */
export function formatRoleDates(role: Pick<AtsParsedRole, "start" | "end" | "current">) {
  const from = formatParsedDate(role.start);
  if (!from) return null;
  const to = role.current ? "Present" : (formatParsedDate(role.end) ?? "?");
  return `${from} – ${to}`;
}

/** "3 yr 2 mo", "3 yr", "7 mo". */
export function formatTenure(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest} mo`;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

/**
 * Calendar months one role spans, inclusive of both ends. A current role runs to `now`; a role
 * with only a start counts as that one month. A missing start month reads as January and a
 * missing end month as December, the generous reading the parser also uses.
 */
export function roleSpanMonths(
  role: Pick<AtsParsedRole, "start" | "end" | "current">,
  now: Date = new Date(),
): number {
  if (!role.start) return 0;
  const from = role.start.year * 12 + (role.start.month ?? 1) - 1;
  const to = role.current
    ? now.getUTCFullYear() * 12 + now.getUTCMonth()
    : role.end
      ? role.end.year * 12 + (role.end.month ?? 12) - 1
      : from;
  return Math.max(0, to - from + 1);
}

export const DEGREE_LABELS: Readonly<Record<AtsDegreeLevel, string>> = {
  diploma: "Diploma",
  associate: "Associate",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};

/**
 * What each ISCED 2011 level is called on a report. Short and international: "Bachelor's or
 * equivalent" is true of a B.Tech, a Licence and a Bachelor alike.
 */
export const ISCED_LABELS: Readonly<Record<AtsIscedLevel, string>> = {
  2: "Lower secondary",
  3: "Upper secondary",
  4: "Post-secondary",
  5: "Short-cycle tertiary",
  6: "Bachelor's or equivalent",
  7: "Master's or equivalent",
  8: "Doctorate",
};
