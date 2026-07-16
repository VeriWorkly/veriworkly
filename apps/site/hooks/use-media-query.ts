"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getServerSnapshot() {
  return false;
}

/**
 * Subscribes to a media query via `useSyncExternalStore` so client and
 * server snapshots stay consistent (server/first paint is always `false`,
 * matching the SSR-rendered markup) without setState-in-effect churn.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}
