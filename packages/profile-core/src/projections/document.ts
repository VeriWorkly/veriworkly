/**
 * The document-envelope pieces a projection has to fill in.
 *
 * A projection produces a whole document body, not just the profile-derived half, so it
 * needs the shape of the sync block. Declaring it here rather than in apps/studio is what
 * stops the studio and the server disagreeing about what a freshly created document's sync
 * state is — the studio re-exports these under the names it already used (`SyncStatus`,
 * `DocumentSyncState`), so nothing downstream changed.
 */

export type DocumentSyncStatus = "local-only" | "pending" | "syncing" | "synced" | "conflicted";

export interface DocumentSyncState {
  enabled: boolean;
  status: DocumentSyncStatus;
  cloudDocumentId: string | null;
  lastSyncedAt: string | null;
  revision: number;
}

/**
 * The sync block a newly projected document starts with.
 *
 * Always local-only: a document that has never been written has nothing in the cloud to be
 * pending against. The studio's `createDocument` overwrites `enabled`/`status` from the
 * workspace auto-sync setting immediately afterwards, and that setting has to win.
 */
export function createLocalOnlySyncState(): DocumentSyncState {
  return {
    enabled: false,
    status: "local-only",
    cloudDocumentId: null,
    lastSyncedAt: null,
    revision: 1,
  };
}
