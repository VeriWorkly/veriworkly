import type { AtsParsedDate, AtsParsedRole } from "../types.js";

/** Calendar months covered by at least one role, so concurrent jobs are not counted twice. */
export function monthsOfExperience(roles: AtsParsedRole[], now: Date) {
  // A missing month is read generously, as the date parser does: January for a start, December
  // for an end, so "2019 - 2022" is four calendar years rather than three years and a month.
  const toIndex = (date: AtsParsedDate, fallbackMonth: number) =>
    date.year * 12 + (date.month ?? fallbackMonth) - 1;
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();

  const spans = roles
    .flatMap((role) => {
      if (!role.start) return [];
      const start = toIndex(role.start, 1);
      if (start > nowIndex) return []; // not started yet, so no experience yet
      const end = role.current ? nowIndex : role.end ? toIndex(role.end, 12) : start;
      return [{ start, end: Math.max(start, Math.min(end, nowIndex)) }];
    })
    .sort((a, b) => a.start - b.start);

  if (!spans.length) return null;

  let total = 0;
  let cursor = -Infinity;
  for (const span of spans) {
    const from = Math.max(span.start, cursor === -Infinity ? span.start : cursor);
    if (span.end >= from) total += span.end - from + 1;
    cursor = Math.max(cursor, span.end + 1);
  }
  return total;
}
