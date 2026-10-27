/**
 * An entitlement grant's end date, from a date input (`YYYY-MM-DD`, empty for no end).
 *
 * The grant runs to the end of that day where the operator is, not to 23:59 UTC, which ends
 * it in the afternoon for anyone east of Greenwich and the evening before for anyone west. A
 * day that has already ended is refused: the server would store a grant that never applies.
 */
export function parseEntitlementEnd(day: string, now = Date.now()) {
  if (!day) return { ok: true as const, endsAt: null };

  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const end = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 23, 59, 59, 999)
    : null;

  if (!end || Number.isNaN(end.getTime())) {
    return { ok: false as const, message: "Pick a valid end date." };
  }
  if (end.getTime() <= now) {
    return { ok: false as const, message: "That day has passed. Pick today or a later day." };
  }

  return { ok: true as const, endsAt: end.toISOString() };
}
