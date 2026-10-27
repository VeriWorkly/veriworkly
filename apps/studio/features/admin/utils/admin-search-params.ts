export type AdminSearchParams = Record<string, string | string[] | undefined>;

/**
 * Collapses Next's `string | string[]` search params to the single-value shape the admin API
 * expects. A repeated `?status=A&status=B` is a malformed admin URL, and taking the first
 * value keeps a hand-edited URL from 400ing the whole page.
 */
export function toSingleValueParams(params: AdminSearchParams): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single === undefined || single === "") continue;

    result[key] = single;
  }

  return result;
}

/**
 * The date inputs give a calendar day; the API takes an ISO instant. A range covers whole days
 * in UTC, which the labels say. Anything that is not a date is dropped rather than sent on to
 * fail validation.
 */
export function auditRangeBound(day: string | undefined, edge: "start" | "end") {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;

  const instant = new Date(`${day}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}Z`);
  return Number.isNaN(instant.getTime()) ? undefined : instant.toISOString();
}
