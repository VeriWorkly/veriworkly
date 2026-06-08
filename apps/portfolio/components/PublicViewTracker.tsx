"use client";

import { useEffect } from "react";
import { backendApiUrl } from "@/lib/backend";

export function PublicViewTracker({ subdomain }: { subdomain: string }) {
  useEffect(() => {
    const key = `veriworkly:portfolio-view:${subdomain}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage can be unavailable in private modes; tracking still remains best effort.
    }

    const track = () => {
      try {
        const url = backendApiUrl(`/portfolios/public/${encodeURIComponent(subdomain)}/view`);
        const body = JSON.stringify({ referrer: document.referrer });

        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(url, blob);
          return;
        }

        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // Analytics must never interrupt the published portfolio.
      }
    };

    try {
      if ("requestIdleCallback" in window) {
        const idleId = window.requestIdleCallback(track, { timeout: 3500 });
        return () => window.cancelIdleCallback(idleId);
      }
      const timeoutId = globalThis.setTimeout(track, 1500);
      return () => globalThis.clearTimeout(timeoutId);
    } catch {
      // Analytics must never interrupt the published portfolio.
    }
  }, [subdomain]);
  return null;
}
