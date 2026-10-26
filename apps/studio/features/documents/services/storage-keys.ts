import type { DocumentType } from "@/features/documents/core/document-types";

/**
 * Single source of truth for the `veriworkly:docs:*` localStorage key scheme.
 * Every module that reads/writes documents (workspace autosave, the sync engine,
 * the document library snapshot) must derive keys from here so the key format can
 * never drift between call sites.
 *
 * ## v3 layout: one key per document, plus a metadata index
 *
 * v2 stored every document of a type inside a single `…:resume` JSON blob. That made
 * every write O(total library size): each autosave had to `JSON.parse` + zod-validate
 * *every* document just to replace one of them, then re-`stringify` the whole set.
 * At 50 resumes that measured ~15ms of main-thread work every 300ms while typing, and
 * it made two tabs editing two different documents clobber each other, because both
 * were rewriting the same key.
 *
 * v3 splits it:
 *   - `…:v3:doc:<TYPE>:<id>` holds one document. Reads and writes are O(1).
 *   - `…:v3:index` holds only what list views need (title, template, updatedAt, sync,
 *     a short description) — no document bodies. The library and the sync worker's
 *     pending-scan read this instead of loading every document.
 *
 * `index.revision` increments on every write so cache keys can be a single integer
 * rather than a hash of the entire library.
 */
const DOCUMENT_STORAGE_VERSION = "v3";
const LEGACY_DOCUMENT_STORAGE_VERSION = "v2";

/**
 * Owned here (rather than by document-sync.ts) so document-workspace-service.ts
 * and document-sync.ts can both depend on this module without importing from
 * each other — avoids a circular dependency between the autosave and sync layers.
 */
export const DOCUMENT_STORAGE_UPDATED_EVENT = "veriworkly:docs-storage-updated";
export const DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT = "veriworkly:sync-outbox-updated";

/**
 * Fired when the sync layer learns a document was deleted on another device. `detail` is
 * {@link RemoteDeletionDetail}; `kept` is true when unsynced edits kept it here as local-only.
 */
export const DOCUMENT_REMOTE_DELETION_EVENT = "veriworkly:document-deleted-elsewhere";

export interface RemoteDeletionDetail {
  type: DocumentType;
  id: string;
  kept: boolean;
  message: string;
  /** Set when the document was moved to a new id; an open editor follows it there. */
  newId?: string;
}

export const DOCUMENT_INDEX_STORAGE_KEY = `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:index`;

/** `TYPE:oldId` → new id, for documents moved to a fresh id. See `rekeyDocument`. */
export const DOCUMENT_MOVES_STORAGE_KEY = `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:moves`;

/**
 * The id of the account this device's documents belong to; absent for a guest's documents.
 * Under the `veriworkly:docs:` prefix so clearing the workspace forgets the owner too.
 */
export const WORKSPACE_OWNER_STORAGE_KEY = `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:owner`;

/**
 * Edits an editor was holding (another tab had saved a different version) when it was left
 * before the user chose; offered back the next time the document opens.
 */
export function getRecoveredEditsKey(type: DocumentType, id: string): string {
  return `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:recovered:${type.toLowerCase()}:${id}`;
}

export function getDocumentKey(type: DocumentType, id: string): string {
  return `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:doc:${type.toLowerCase()}:${id}`;
}

export function getDocumentKeyPrefix(type: DocumentType): string {
  return `veriworkly:docs:${DOCUMENT_STORAGE_VERSION}:doc:${type.toLowerCase()}:`;
}

/** The pre-v3 single-blob-per-type key. Read once during migration, then removed. */
export function getLegacyDocumentCollectionKey(type: DocumentType): string {
  return `veriworkly:docs:${LEGACY_DOCUMENT_STORAGE_VERSION}:${type.toLowerCase()}`;
}
