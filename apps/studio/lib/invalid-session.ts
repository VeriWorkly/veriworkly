import { backendApiUrl } from "@/lib/constants";

let cleanupPromise: Promise<void> | null = null;

export function isInvalidSessionResponse(path: string, status: number) {
  return status === 401 || (status === 404 && path.split("?")[0] === "/users/me");
}

export function clearInvalidSessionAndRedirect() {
  if (typeof window === "undefined") return Promise.resolve();
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
      const callbackURL = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?callbackURL=${encodeURIComponent(callbackURL)}`);
    }
  })();

  return cleanupPromise;
}
