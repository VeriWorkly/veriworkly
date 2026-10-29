import type { Instrumentation } from "next";

import { createErrorReporter } from "@/lib/error-reporter";

/** Forwards server errors to ERROR_REPORT_URL (else one stderr line); request headers are left out because they carry cookies. */

const report = createErrorReporter({ reportUrl: process.env.ERROR_REPORT_URL });

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  await report({
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    digest,
    // No query string: it can carry search terms or referral codes.
    path: request.path.split("?")[0]!,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
