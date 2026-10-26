import { useEffect } from "react";

import type { SyncResult } from "@/features/documents/services/document-sync";

import { useUserStore } from "@/store/useUserStore";

/** Where an editor is in resolving the document its URL names. */
export type EditorLoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "not-found" }
  | { status: "error"; message: string };

/**
 * An editor's load result, keyed by the id it was for. Reading it through
 * {@link loadStateFor} makes a new URL id "loading" on the very render it appears, so the
 * previous document can never be shown (or edited) under the next one's URL.
 */
export type KeyedLoadState = EditorLoadState & {
  id: string;
  /**
   * Set when the document moved to `id` from this id. The route catches up a moment later;
   * until then the old URL id still counts as this document, so the editor stays mounted.
   */
  movedFrom?: string;
};

export const INITIAL_LOAD_STATE: KeyedLoadState = { id: "", status: "loading" };

export function loadStateFor(state: KeyedLoadState, documentId: string): EditorLoadState {
  return state.id === documentId || state.movedFrom === documentId ? state : { status: "loading" };
}

/**
 * What a document that is not on this device and did not come from the cloud means.
 *
 * Only a 404 is "not found". A guest has no cloud, so for them any miss is one too. Every
 * other failure (a 500, an expired session, a copy that could not be read) keeps its real
 * reason: calling it "not found" sends the user hunting for a document that still exists.
 */
export function cloudLoadFailureState(
  result: SyncResult,
): Extract<EditorLoadState, { status: "not-found" | "error" }> {
  if (result.reason === "not-found" || !useUserStore.getState().isLoggedIn) {
    return { status: "not-found" };
  }

  return {
    status: "error",
    message: result.ok ? "The cloud copy could not be opened on this device." : result.message,
  };
}

/**
 * Names the browser tab after the open document. The server cannot know a local document's
 * title, and Next writes the route's generic metadata title after a client-side navigation,
 * possibly after this effect ran, so the title is re-applied whenever something replaces it.
 * On cleanup the route's own title comes back.
 */
export function useDocumentTabTitle(title: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const wanted = `${title} – VeriWorkly Studio`;
    const routeTitle = window.document.title;
    const apply = () => {
      if (window.document.title !== wanted) window.document.title = wanted;
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(window.document.head, { subtree: true, childList: true, characterData: true });

    return () => {
      observer.disconnect();
      // Leaving the document (or a new URL id still loading) must not keep its name in the tab.
      // Only when the tab still shows this hook's title: the next page may already have set its own.
      if (window.document.title === wanted) window.document.title = routeTitle;
    };
  }, [title, enabled]);
}
