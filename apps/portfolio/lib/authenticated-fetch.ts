"use client";

import { backendApiUrl } from "@/lib/backend";

let cleanupPromise: Promise<void> | null = null;

function isInvalidSessionResponse(path: string, status: number) {
  return status === 401 || (status === 404 && path.split("?")[0] === "/users/me");
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
      const loginUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001/login"
          : "https://app.veriworkly.com/login";
      window.location.replace(
        `${loginUrl}?callbackURL=${encodeURIComponent(window.location.href)}`,
      );
    }
  })();

  return cleanupPromise;
}

export async function authenticatedFetch(path: string, init?: RequestInit) {
  const response = await fetch(backendApiUrl(path), { credentials: "include", ...init });

  if (isInvalidSessionResponse(path, response.status)) {
    await clearInvalidSessionAndRedirect();
  }

  return response;
}
