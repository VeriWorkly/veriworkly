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

/**
 * What the server is sent for a choice. The server enforces expiry (V-412): with no date and no
 * `noExpiry`, a new link lasts 7 days and a refresh keeps its stored expiry; `noExpiry: true` is
 * never, and a date together with it is a 400. A date must be within a day of 7, 14, 30 or 90 days
 * out, or equal the stored one, which is what "keep" resends. An expired link answers 410.
 */
export function shareExpiryPayload(
  choice: ShareExpiryChoice,
  storedExpiresAt: string | null,
  now = new Date(),
): { expiresAt: string | null; noExpiry: boolean } {
  if (choice === "never") return { expiresAt: null, noExpiry: true };
  if (choice === "keep") return { expiresAt: storedExpiresAt, noExpiry: storedExpiresAt === null };

  return {
    expiresAt: new Date(now.getTime() + Number(choice) * DAY_MS).toISOString(),
    noExpiry: false,
  };
}
