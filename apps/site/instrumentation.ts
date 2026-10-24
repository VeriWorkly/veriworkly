import type { Instrumentation } from "next";

/**
 * Server-side errors (render, route handler, server action, revalidation) used to end as a
 * console line in the container log and nothing else. This forwards them to whatever
 * `ERROR_REPORT_URL` points at (an OTel collector, a webhook) as one JSON record per error.
 * Without the variable it falls back to one structured line on stderr, so a log scraper can
 * still pick it up. Request headers are left out on purpose: they carry cookies.
 */

const REPORT_URL = process.env.ERROR_REPORT_URL;

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  const report = {
    at: new Date().toISOString(),
    app: "site",
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  };

  if (!REPORT_URL) {
    console.error("[request-error]", JSON.stringify(report));
    return;
  }

  try {
    await fetch(REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(3_000),
    });
  } catch (cause) {
    console.error("[request-error] report failed:", cause, JSON.stringify(report));
  }
};
