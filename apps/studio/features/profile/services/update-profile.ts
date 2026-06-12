import type { AccountProfile } from "@/features/profile/services/account-profile";

import { fetchApiData } from "@/utils/fetchApiData";

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
    errorMessage: "Failed to set username",
  });
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  return fetchApiData<{ available: boolean; reason?: string }>(
    `/users/${encodeURIComponent(username)}/availability`,
    { method: "GET", errorMessage: "Failed to check username availability" },
  );
}
