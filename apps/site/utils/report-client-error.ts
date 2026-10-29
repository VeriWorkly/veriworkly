/** Which error boundary caught it; the API logs it beside the message. */
export type ErrorBoundaryName = "root" | "marketing" | "global";

const reported = new Set<string>();

/**
 * Sends a crash the browser hit to the API's /client-errors log (W-090): the site is mostly
 * static, so these never reach a server log otherwise. Once per error per page load, production
 * only, and it never throws: a failed report must not break the error page.
 */
export function reportClientError(error: Error & { digest?: string }, boundary: ErrorBoundaryName) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production" || !backend || typeof window === "undefined") return;

  const key = `${boundary}:${error.digest ?? ""}:${error.message}`;
  if (reported.has(key)) return;
  reported.add(key);

  try {
    void fetch(`${backend}/client-errors`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: "site",
        boundary,
        message: (error.message || "Unknown error").slice(0, 500),
        digest: error.digest?.slice(0, 64),
        // Origin and path only: a query or fragment can carry a search, a token or an email.
        url: `${window.location.origin}${window.location.pathname}`.slice(0, 500),
        stack: error.stack?.slice(0, 4_000),
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting is best effort.
  }
}
