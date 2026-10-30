"use client";

import { useEffect } from "react";

import { backendApiUrl } from "@/lib/backend";

/**
 * Sends one view per site per browser session. The body is `text/plain` (a CORS-safelisted type
 * the server parses as JSON), so neither the beacon nor the fetch needs a preflight from a
 * portfolio subdomain (P-002, SV-03). The session key is set only once a send went out, so a
 * failed send is retried on the next page view.
 */
export async function sendView(subdomain: string, referrer: string) {
  const url = backendApiUrl(`/portfolios/public/${encodeURIComponent(subdomain)}/view`);
  const body = JSON.stringify({ referrer });
  const type = "text/plain;charset=UTF-8";

  if (navigator.sendBeacon?.(url, new Blob([body], { type }))) return true;

  // No beacon API, or the browser refused to queue it (quota, size): fall back to a fetch that
  // still survives the page unloading.
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": type },
    body,
    keepalive: true,
  });

  return response.ok;
}

export function PublicViewTracker({ subdomain }: { subdomain: string }) {
  useEffect(() => {
    const key = `veriworkly:portfolio-view:${subdomain}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
    } catch {
      // Storage can be unavailable in private modes; tracking stays best effort.
    }

    const track = () => {
      sendView(subdomain, document.referrer)
        .then((sent) => {
          if (sent) window.sessionStorage.setItem(key, "1");
        })
        // Analytics must never interrupt the published portfolio.
        .catch(() => undefined);
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
