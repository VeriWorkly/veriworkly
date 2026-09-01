"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `true` once the component has mounted on the client, and `false`
 * during server-side rendering and initial hydration.
 *
 * Uses `useSyncExternalStore` so SSR markup matches initial client paint without
 * triggering setState-in-effect linter warnings or unnecessary re-render passes.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
