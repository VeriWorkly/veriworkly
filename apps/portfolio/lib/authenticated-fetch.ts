"use client";

import { backendApiUrl } from "@/lib/backend";
import { siteConfig } from "@/config/site";

let cleanupPromise: Promise<void> | null = null;

// Whether this tab is signed in, set from the workspace store. A guest has no session to lose:
// a 401 on their request is the normal answer, not an expired login, so it must never sign them
// out and throw them to the studio login mid-edit (P-034, P-005).
let signedIn = false;

export function setSignedIn(value: boolean) {
  signedIn = value;
}

export function isInvalidSessionResponse(path: string, status: number, hadSession: boolean) {
  if (!hadSession) return false;
  return status === 401 || (status === 404 && path.split("?")[0] === "/users/me");
}

/** The studio login, coming back to this page. Studio is another origin, so a full page load. */
export function studioLoginUrl() {
  return `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(window.location.href)}`;
}

async function clearInvalidSessionAndRedirect() {
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = (async () => {
    try {
      await fetch(backendApiUrl("/auth/sign-out"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      window.location.replace(studioLoginUrl());
    }
  })();

  return cleanupPromise;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function authenticatedFetch(path: string, init?: RequestInit) {
  // Only time out requests that didn't already bring their own abort signal
  // — a hung backend used to leave callers (editor saves, AI generation,
  // asset uploads) waiting indefinitely with no feedback.
  const controller = init?.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;

  try {
    const response = await fetch(backendApiUrl(path), {
      credentials: "include",
      ...init,
      signal: init?.signal ?? controller?.signal,
    });

    if (isInvalidSessionResponse(path, response.status, signedIn)) {
      await clearInvalidSessionAndRedirect();
    }

    return response;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
