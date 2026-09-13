import { backendApiUrl } from "@/lib/constants";
import { clearInvalidSessionAndRedirect, isInvalidSessionResponse } from "@/lib/invalid-session";

import { useUserStore } from "@/store/useUserStore";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string | null;
  createdAt?: string;
  emailVerified?: boolean;
  autoSyncEnabled?: boolean;
  shareResumeCount?: number;
};

type AccountProfileResponse = {
  data?: {
    id: string;
    email: string;
    name?: string | null;
    username?: string | null;
    createdAt?: string;
    emailVerified?: boolean;
    autoSyncEnabled?: boolean;
    _count?: {
      shareLinks?: number;
    };
  };
};

let memoryCache: SessionUser | null = null;

async function fetchAccountProfileSummary(cookieHeader?: string) {
  try {
    if (
      typeof window === "undefined" &&
      cookieHeader !== undefined &&
      !cookieHeader.includes("veriworkly-auth")
    )
      return null;

    const response = await fetch(backendApiUrl("/users/me"), {
      method: "GET",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      credentials: cookieHeader ? undefined : "include",
    });

    if (!response.ok) {
      if (typeof window !== "undefined" && isInvalidSessionResponse("/users/me", response.status))
        await clearInvalidSessionAndRedirect();

      return null;
    }

    const payload = (await response.json()) as AccountProfileResponse;
    const user = payload.data;

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      username: user.username ?? undefined,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      autoSyncEnabled: user.autoSyncEnabled,
      shareResumeCount: user._count?.shareLinks,
    } satisfies Partial<SessionUser>;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(force = false): Promise<SessionUser | null> {
  const isServer = typeof window === "undefined";

  if (isServer) {
    try {
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      const summary = await fetchAccountProfileSummary(cookieHeader);

      if (!summary?.id || !summary?.email) return null;

      return summary as SessionUser;
    } catch {
      return null;
    }
  }

  if (!force && memoryCache) return memoryCache;

  try {
    const summary = await fetchAccountProfileSummary();
    if (!summary?.id || !summary?.email) {
      memoryCache = null;
      return null;
    }

    memoryCache = summary as SessionUser;

    return memoryCache;
  } catch {
    return null;
  }
}

export async function signOutCurrentUser() {
  try {
    await fetch(backendApiUrl("/auth/sign-out"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
  } finally {
    memoryCache = null;

    if (typeof window !== "undefined") useUserStore.getState().logout();
  }
}
