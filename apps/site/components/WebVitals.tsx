"use client";

import { useReportWebVitals } from "next/web-vitals";

const ENDPOINT = process.env.NEXT_PUBLIC_VITALS_URL;

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

// Module scope: the hook re-subscribes whenever the callback's identity changes.
function report(metric: Metric) {
  if (!ENDPOINT) return;

  const body = JSON.stringify({
    app: "site",
    name: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    path: window.location.pathname,
  });

  if (!navigator.sendBeacon?.(ENDPOINT, body))
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
}

/** Rendered by the root layout only when NEXT_PUBLIC_VITALS_URL is set, so web-vitals downloads only then. */
export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
