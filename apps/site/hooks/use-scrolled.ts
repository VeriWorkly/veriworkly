"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getServerSnapshot() {
  return false;
}

/**
 * Returns `true` if the vertical scroll position is greater than `threshold` px.
 *
 * Uses `useSyncExternalStore` for immediate initial state evaluation (e.g. on page reload)
 * and reactive window scroll listening without setState-in-effect churn.
 */
export function useScrolled(threshold = 20): boolean {
  const getSnapshot = useCallback(() => {
    return window.scrollY > threshold;
  }, [threshold]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
