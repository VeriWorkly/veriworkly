import { toast } from "sonner";

import { resolveConflictUpdatedAt } from "@/features/resume/services/master-profile";
import { ApiRequestError } from "@/utils/fetchApiData";

const SAVE_FAILURE_TOAST_ID = "master-profile-save-failure";

/** Saves what the editor holds when it is called, over the given cursor when there is one. */
export type SaveLatest = (expectedUpdatedAt?: string) => Promise<void>;

/**
 * Says why a Master Profile save failed. The draft stays in the editor, and the toast's action
 * saves whatever the editor holds when it is clicked, never the draft as it was at the failure,
 * so text typed after the toast appeared is not overwritten.
 *
 * A 409 means the stored profile is not the one this edit started from. The server's message
 * says why; "Save my version" overwrites it using the cursor the conflict carries.
 */
export async function reportMasterSaveFailure(error: unknown, saveLatest: SaveLatest) {
  const status = error instanceof ApiRequestError ? error.status : null;
  const message = error instanceof Error ? error.message : "Could not save your master profile.";
  const retry = (cursor?: string) => () => void saveLatest(cursor).catch(() => undefined);

  if (status === 409) {
    const currentUpdatedAt = await resolveConflictUpdatedAt(error);

    toast.error(message, {
      id: SAVE_FAILURE_TOAST_ID,
      description: "Your changes are still in the editor.",
      action: currentUpdatedAt
        ? { label: "Save my version", onClick: retry(currentUpdatedAt) }
        : undefined,
    });

    return;
  }

  if (status === 413) {
    toast.error("This profile is too large to save. Remove some content and try again.", {
      id: SAVE_FAILURE_TOAST_ID,
    });

    return;
  }

  toast.error(message, { id: SAVE_FAILURE_TOAST_ID, action: { label: "Retry", onClick: retry() } });
}

/** Clears a save-failure toast once its retry would no longer be right (a reset, a save). */
export function dismissMasterSaveFailure() {
  toast.dismiss(SAVE_FAILURE_TOAST_ID);
}

/** The retry a toast holds: through the editor's current saver, or nothing once it has gone. */
export function saveThroughRef(ref: { current: SaveLatest | null }): SaveLatest {
  return (cursor) => (ref.current ? ref.current(cursor) : Promise.resolve());
}

/**
 * A retry asked for from a toast. With nothing unsaved (the user reset the editor) it does
 * nothing, so it never overwrites newer stored data with the stored copy; while a save runs it
 * waits for that save to settle instead of being dropped.
 */
export function retryLatestSave(
  editor: {
    isDirty: () => boolean;
    isSaving: () => boolean;
    queue: (cursor?: string) => void;
    save: SaveLatest;
  },
  cursor?: string,
) {
  if (!editor.isDirty()) return Promise.resolve();

  if (editor.isSaving()) {
    editor.queue(cursor);
    return Promise.resolve();
  }

  return editor.save(cursor);
}
