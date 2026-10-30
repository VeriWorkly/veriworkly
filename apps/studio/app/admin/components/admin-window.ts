/** Matches the range the backend's time-series validator accepts (floored at 7, capped at 180). */
export const ADMIN_WINDOWS = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 180, label: "180d" },
] as const;

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Parses `?days=` into one of the offered windows. A plain module, not the client selector, so the
 * dashboard's server component can call it.
 */
export function parseWindowDays(value: string | undefined) {
  const parsed = Number(value);
  return ADMIN_WINDOWS.some((window) => window.days === parsed) ? parsed : DEFAULT_WINDOW_DAYS;
}
