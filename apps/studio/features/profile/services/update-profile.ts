import type { AccountProfile } from "@/features/profile/services/account-profile";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

export async function updateAccountName(name: string): Promise<AccountProfile> {
  return fetchApiData<AccountProfile>("/users/me/name", {
    method: "PUT",
    body: JSON.stringify({ name }),
    errorMessage: "Failed to update profile name",
  });
}

export async function updateAccountUsername(username: string): Promise<AccountProfile> {
  return fetchApiData<AccountProfile>("/users/me/username", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });
}

export type UsernameAvailability = {
  available: boolean;
  /** The handle the server would store: lowercased, with stray and repeated hyphens folded. */
  normalizedUsername: string;
  reason?: "too_short" | "too_long" | "invalid_characters" | "reserved" | "taken";
};

export async function checkUsernameAvailability(username: string): Promise<UsernameAvailability> {
  return fetchApiData<UsernameAvailability>(`/users/${encodeURIComponent(username)}/availability`, {
    method: "GET",
    errorMessage: "Failed to check username availability",
  });
}

export async function updateAutoSyncPreference(enabled: boolean): Promise<AccountProfile> {
  return fetchApiData<AccountProfile>("/users/me/sync", {
    method: "PUT",
    body: JSON.stringify({ enabled }),
    errorMessage: "Failed to update sync preference",
  });
}

/**
 * The unpaid affiliate balance a deletion would forfeit (V-234, owner decision 10): the 409
 * `AFFILIATE_BALANCE_FORFEIT` details, in cents of `currency`.
 */
export type AffiliateForfeit = {
  amountCents: number;
  currency: string;
  availableCents: number;
  pendingCents: number;
};

/** The forfeit a refused deletion names, or `null` when the 409 is about something else. */
export function affiliateForfeitFrom(error: unknown): AffiliateForfeit | null {
  if (!(error instanceof ApiRequestError) || error.code !== "AFFILIATE_BALANCE_FORFEIT")
    return null;

  const details = error.details as Partial<AffiliateForfeit>;
  if (typeof details.amountCents !== "number") return null;

  return {
    amountCents: details.amountCents,
    currency: typeof details.currency === "string" ? details.currency : "USD",
    availableCents: typeof details.availableCents === "number" ? details.availableCents : 0,
    pendingCents: typeof details.pendingCents === "number" ? details.pendingCents : 0,
  };
}

/**
 * Deletes the account. The server's message reaches the user as is, notably the 409 telling them
 * to cancel a live subscription before deleting. An unpaid affiliate balance is refused with 409
 * `AFFILIATE_BALANCE_FORFEIT` until the user confirms the amount it named: pass it back as
 * `confirmedForfeitCents`, and a balance that grew past it is refused again.
 */
export async function deleteAccount(
  options: { confirmedForfeitCents?: number } = {},
): Promise<void> {
  return fetchApiData<void>("/users/me", {
    method: "DELETE",
    ...(options.confirmedForfeitCents === undefined
      ? {}
      : {
          body: JSON.stringify({
            confirmAffiliateForfeit: true,
            confirmedAffiliateForfeitCents: options.confirmedForfeitCents,
          }),
        }),
  });
}
