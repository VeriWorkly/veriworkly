import type { SaveDocumentResult } from "./local-storage-service";

export type SaveFailureReason = "quota-exceeded" | "unknown" | "removed";

/**
 * User-facing text for a failed local save.
 *
 * Shared so both editors say the same thing. This wording lived inline in
 * `ResumeToolbar`, and the cover letter editor had no equivalent at all — it discarded
 * the save result, so a full-storage failure silently lost the user's edits.
 */
export function getSaveFailureMessage(reason: SaveFailureReason): string {
  if (reason === "quota-exceeded") {
    return "Storage is full. Remove older documents or exports and try again.";
  }

  if (reason === "removed") {
    return "This document was deleted, so this change was not saved.";
  }

  return "Unable to save locally right now. Please try again.";
}

/** Returns the failure message for a save result, or `null` when it succeeded. */
export function describeSaveResult(result: SaveDocumentResult): string | null {
  return result.ok ? null : getSaveFailureMessage(result.reason);
}

/**
 * Status-line copy for the two halves of an autosave, shared so both editors say the same
 * thing.
 *
 * A debounced save returns `{ ok: true, queued: true }` immediately — the write itself
 * happens `debounceMs` later. Reporting "Saved on this device" at that point claims a persisted
 * write that has not happened yet (and that may still fail on quota), so the queued state
 * gets its own wording and only `onFlush` may promote it.
 */
export const SAVE_QUEUED_MESSAGE = "Saving...";
export const SAVE_PERSISTED_MESSAGE = "Saved on this device";

/**
 * Whether the editor's status line says the last save failed, so the edits since exist only
 * in the page and leaving it (back arrow, reload, closing the tab) would lose them (S-408).
 * A guest has no cloud copy to fall back on.
 */
export function leavingLosesEdits(statusMessage: string): boolean {
  return (
    statusMessage === getSaveFailureMessage("quota-exceeded") ||
    statusMessage === getSaveFailureMessage("unknown")
  );
}
