"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getServerSnapshot() {
  return false;
}

export function useScrolled(threshold = 20): boolean {
  const getSnapshot = useCallback(() => {
    return window.scrollY > threshold;
  }, [threshold]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
