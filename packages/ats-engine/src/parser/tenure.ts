import type { AtsParsedDate, AtsParsedRole } from "../types.js";

/** Calendar months covered by at least one role, so concurrent jobs are not counted twice. */
export function monthsOfExperience(roles: AtsParsedRole[], now: Date) {
  const toIndex = (date: AtsParsedDate) => date.year * 12 + (date.month ?? 1) - 1;
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();

  const spans = roles
    .filter((role) => role.start)
    .map((role) => {
      const start = toIndex(role.start as AtsParsedDate);
      const end = role.current ? nowIndex : role.end ? toIndex(role.end) : start;
      return { start, end: Math.max(start, Math.min(end, nowIndex)) };
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
