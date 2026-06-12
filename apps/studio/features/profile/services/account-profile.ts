import { headers } from "next/headers";

import { backendApiUrl } from "@/lib/constants";

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

export async function fetchAccountProfile(): Promise<AccountProfile | null> {
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie");

    if (!cookie || !cookie.includes("veriworkly-auth")) {
      return null;
    }

    const response = await fetch(backendApiUrl("/users/me"), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: AccountProfile };

    return payload.data ?? null;
  } catch {
    return null;
  }
}
