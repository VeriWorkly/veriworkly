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
 * What the server is sent for a choice. "keep" resends the link's stored expiry: the server
 * reads a missing date as "never", so leaving it out would quietly make the link permanent.
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
