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

// Runs just before an expired session is sent to the login page: the workspace registers one
// that keeps unsaved edits in this browser, so they are offered back after logging in.
let beforeSignOut: (() => void) | null = null;

export function setBeforeSignOut(callback: (() => void) | null) {
  beforeSignOut = callback;
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
      beforeSignOut?.();
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
  // A hung backend would leave editor saves, AI generation and uploads waiting forever, so a
  // request that brings no abort signal of its own gets a timeout.
  const response = await fetch(backendApiUrl(path), {
    credentials: "include",
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (isInvalidSessionResponse(path, response.status, signedIn)) {
    await clearInvalidSessionAndRedirect();
  }

  return response;
}
