"use client";

import { useEffect } from "react";
import { backendApiUrl } from "@/lib/backend";

export function PublicViewTracker({ subdomain }: { subdomain: string }) {
  useEffect(() => {
    try {
      void fetch(backendApiUrl(`/portfolios/public/${encodeURIComponent(subdomain)}/view`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrer: document.referrer }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Analytics must never interrupt the published portfolio.
    }
  }, [subdomain]);
  return null;
}
