/** How long a link lasts: a number of days from now, never, or (editing) the date it has. */
export type ShareExpiryChoice = "7" | "14" | "30" | "90" | "never" | "keep";

export const SHARE_EXPIRY_OPTIONS: Array<{ value: ShareExpiryChoice; label: string }> = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "never", label: "Never" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

type StoredShareLink = { expiresAt: string | null } | null | undefined;

/** "Keep" only means something for a link that exists and has not expired. */
export function canKeepShareExpiry(link: StoredShareLink, now = new Date()) {
  return Boolean(link) && (link!.expiresAt === null || new Date(link!.expiresAt) > now);
}

/**
 * The choice that is shown and sent. "Keep" with no link (revoked) or an expired one falls back to
 * the 7-day default (S-393, S-394), so the select and the request can never disagree.
 */
export function effectiveShareExpiryChoice(
  choice: ShareExpiryChoice,
  link: StoredShareLink,
  now = new Date(),
): ShareExpiryChoice {
  return choice === "keep" && !canKeepShareExpiry(link, now) ? "7" : choice;
}

/**
 * What the server is sent for a choice. The server enforces expiry (V-412): with no date and no
 * `noExpiry`, a new link lasts 7 days and a refresh keeps its stored expiry; `noExpiry: true` is
 * never, and a date together with it is a 400. A date must be within a day of 7, 14, 30 or 90 days
 * out, or equal the stored one, which is what "keep" resends. An expired link answers 410.
 */
export function shareExpiryPayload(
  requested: ShareExpiryChoice,
  link: StoredShareLink,
  now = new Date(),
): { expiresAt: string | null; noExpiry: boolean } {
  const choice = effectiveShareExpiryChoice(requested, link, now);
  if (choice === "never") return { expiresAt: null, noExpiry: true };
  if (choice === "keep") return { expiresAt: link!.expiresAt, noExpiry: link!.expiresAt === null };

  return {
    expiresAt: new Date(now.getTime() + Number(choice) * DAY_MS).toISOString(),
    noExpiry: false,
  };
}
