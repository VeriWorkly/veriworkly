"use client";

import { useEffect } from "react";

const ENDPOINT = process.env.NEXT_PUBLIC_VITALS_URL;

type Metric = {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
};
type OnMetric = (callback: (metric: Metric) => void) => void;

/** web-vitals is imported inside the effect so it only downloads when NEXT_PUBLIC_VITALS_URL is set. */
export function WebVitals() {
  useEffect(() => {
    if (!ENDPOINT) return;

    const report = (metric: Metric) => {
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

    // @ts-expect-error Next's compiled copy of web-vitals ships without type declarations.
    void import("next/dist/compiled/web-vitals")
      .then((vitals: Record<string, OnMetric>) => {
        for (const name of ["onLCP", "onINP", "onCLS", "onFCP", "onTTFB"]) vitals[name]?.(report);
      })
      // A private Next path: if an upgrade moves it, lose the metrics, not the page.
      .catch(() => {});
  }, []);

  return null;
}
