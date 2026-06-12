import { backendApiUrl } from "@/lib/constants";
import { clearInvalidSessionAndRedirect, isInvalidSessionResponse } from "@/lib/invalid-session";

import { useUserStore } from "@/store/useUserStore";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
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
    ) {
      return null;
    }

    const response = await fetch(backendApiUrl("/users/me"), {
      method: "GET",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      credentials: cookieHeader ? undefined : "include",
    });

    if (!response.ok) {
      if (typeof window !== "undefined" && isInvalidSessionResponse("/users/me", response.status)) {
        await clearInvalidSessionAndRedirect();
      }
      return null;
    }

    const payload = (await response.json()) as AccountProfileResponse;
    const user = payload.data;

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
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

    if (typeof window !== "undefined") {
      useUserStore.getState().logout();
    }
  }
}

export async function updateCurrentUserName(name: string): Promise<SessionUser> {
  const response = await fetch(backendApiUrl("/users/me/name"), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    throw new Error(payload.message || "Could not update name");
  }

  const payload = (await response.json()) as {
    data?: SessionUser;
  };

  const updatedUser = payload.data;

  if (!updatedUser) {
    throw new Error("Could not update name");
  }

  const summary = await fetchAccountProfileSummary();
  const merged = {
    ...updatedUser,
    ...summary,
  };

  memoryCache = merged;

  return merged;
}
