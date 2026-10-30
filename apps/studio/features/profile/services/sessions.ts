import { authClient } from "@/lib/auth-client";

/**
 * Ends every session of this account except the one making the request, so a sign-in left open
 * on a shared or public computer can be closed from anywhere (S-376). The server tombstones the
 * revoked sessions, so their cookies stop working at once.
 */
export async function signOutOtherDevices(): Promise<void> {
  const { error } = await authClient.revokeOtherSessions();

  if (error) throw new Error(error.message || "Could not sign out the other devices.");
}
