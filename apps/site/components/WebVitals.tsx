"use client";

import { useReportWebVitals } from "next/web-vitals";

const ENDPOINT = process.env.NEXT_PUBLIC_VITALS_URL;

/**
 * Field Core Web Vitals: each metric is sent as one small JSON beacon to NEXT_PUBLIC_VITALS_URL
 * (an OTel collector or any endpoint that accepts POST), so the Phase 2 budgets can be checked
 * on real devices and not only in the lab (W-061). The root layout renders this only when the
 * variable is set, so without it no code ships.
 */
const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
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
};

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
