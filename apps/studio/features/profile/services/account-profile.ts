import { fetchServerAccount } from "@/features/auth/services/current-user";

export type AccountProfile = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: boolean;
  autoSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    apiKeys?: number;
    resumes?: number;
    shareLinks?: number;
  };
};

/**
 * `null` for a guest or a rejected session (401 or 403, as everywhere else); an outage throws to
 * the error boundary. The same read as the layout's, so the page costs no second request.
 */
export async function fetchAccountProfile(): Promise<AccountProfile | null> {
  return (await fetchServerAccount()) as AccountProfile | null;
}
