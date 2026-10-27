/**
 * Formatting helpers shared by every admin table and stat card, so the same number never
 * renders three different ways across the dashboard.
 */

const currencyFormatters = new Map<string, Intl.NumberFormat>();

const compactNumberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" });

/**
 * Money is stored in minor units ("cents") everywhere in this codebase. Never format a raw cents
 * value. Amounts default to USD; an affiliate commission carries its own ISO 4217 currency.
 */
export function formatCents(cents: number | null | undefined, currency = "USD") {
  let formatter = currencyFormatters.get(currency);

  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    currencyFormatters.set(currency, formatter);
  }

  return formatter.format((cents ?? 0) / 100);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatCompactNumber(value: number | null | undefined) {
  const numeric = value ?? 0;
  return numeric >= 10_000 ? compactNumberFormatter.format(numeric) : formatNumber(numeric);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "—";

  const elapsed = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(elapsed);

  for (const [unit, size] of RELATIVE_UNITS) {
    if (absolute >= size) return relativeFormatter.format(Math.round(elapsed / size), unit);
  }

  return "just now";
}

export function formatBytes(bytes: number | null | undefined) {
  const value = bytes ?? 0;
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);

  return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, Math.round(seconds ?? 0));

  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined) return "—";

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** Turns `affiliate.commission.create` or `PAST_DUE` into readable title case. */
export function humanizeKey(key: string) {
  return key
    .replace(/[._]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function truncate(value: string | null | undefined, length = 60) {
  if (!value) return "—";
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/** The server stores an admin suspension as `moderation:<reason>`; show only the reason. */
export function formatSuspensionReason(value: string | null | undefined) {
  if (!value) return "—";

  return value.startsWith("moderation:") ? value.slice("moderation:".length).trim() : value;
}

/** One state for an API key: revoked wins, then an admin disable, then a lapsed expiry. */
export function apiKeyState(key: {
  revokedAt: string | null;
  isActive: boolean;
  expiresAt: string | null;
}) {
  if (key.revokedAt) return "REVOKED";
  if (!key.isActive) return "DISABLED";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) return "EXPIRED";

  return "ACTIVE";
}

/** A queue count that could not be read is `null`: shown as "—", never as 0. */
export function formatQueueCount(value: number | null) {
  return value === null ? "—" : formatNumber(value);
}

/** Where the last page of a list starts: "Previous" from past the end goes there, not to a gap. */
export function lastPageOffset(total: number, limit: number) {
  return total > 0 ? Math.floor((total - 1) / limit) * limit : 0;
}

/**
 * The period end of a subscription in words that match its state: only a live, renewing
 * subscription "renews"; a cancelling one "ends"; a finished one "ended".
 */
export function formatPeriodEnd(subscription: {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}) {
  if (!subscription.currentPeriodEnd) return "no period end";

  const date = formatDate(subscription.currentPeriodEnd);

  if (subscription.status === "CANCELED" || subscription.status === "INACTIVE") {
    return `ended ${date}`;
  }

  return subscription.cancelAtPeriodEnd ? `ends ${date}` : `renews ${date}`;
}
