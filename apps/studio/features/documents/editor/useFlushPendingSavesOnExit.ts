"use client";

import { useEffect } from "react";

import type { DocumentType } from "@/features/documents/core/document-types";

import { flushPendingSaves } from "@/features/documents/services/document-workspace-service";

/**
 * Closes the 300ms data-loss window at the end of an editing session.
 *
 * Client-side navigation is mostly safe on its own — the debounce timer survives because
 * the page's JS context does — but unmount, tab close, reload, and mobile backgrounding
 * are not, and there was previously no handler for any of them.
 *
 * `visibilitychange` rather than `beforeunload`: the latter is unreliable on mobile Safari
 * and disqualifies the page from the back/forward cache. The unmount flush in the cleanup
 * covers navigating away inside the app, which never fires a visibility change at all.
 */
export function useFlushPendingSavesOnExit(type: DocumentType) {
  useEffect(() => {
    function flushWhenHidden() {
      if (window.document.visibilityState === "hidden") flushPendingSaves(type);
    }

    window.document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.document.removeEventListener("visibilitychange", flushWhenHidden);
      flushPendingSaves(type);
    };
  }, [type]);
}
