"use client";

import { createId, type MasterProfileData } from "@veriworkly/profile-core";

import type { DocumentIndexEntry } from "@/types/document";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { BaseDocument, DocumentMeta } from "@/features/documents/core/types";
import type { SaveDocumentOptions, SaveDocumentResult } from "./local-storage-service";

import { LocalStorageService } from "./local-storage-service";
import { DocumentApi, isDocumentApiError } from "./document-api";
import { SyncEngine, SYNC_STORAGE_KEYS } from "./sync-engine";
import {
  emptyDocumentIndex,
  invalidateDocumentIndexCache,
  listLocalStorageKeys,
  parkCorruptDocumentIndex,
  readDocumentIndex,
  writeDocumentIndex,
} from "./document-index";
import {
  safeSetLocalStorageItem,
  type LocalStorageWriteResult,
} from "./storage/safe-local-storage";

import { bumpWorkspaceEpoch } from "./workspace-epoch";
import {
  entriesOfOtherAccounts,
  entriesOwnedBy,
  getWorkspaceViewer,
  readDeviceOwner,
  UNKNOWN_DOCUMENT_OWNER,
  visibleEntries,
} from "./workspace-viewer";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { getMasterProfileForNewDocument } from "@/features/resume/services/master-profile";
import { withDocumentIdentity } from "@/features/documents/core/content-identity";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";
import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { DOCUMENT_TITLE_MAX_LENGTH } from "@/features/documents/core/document-title";
import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";
import {
  DOCUMENT_INDEX_STORAGE_KEY,
  DOCUMENT_MOVES_STORAGE_KEY,
  DOCUMENT_STORAGE_UPDATED_EVENT,
  getDocumentKey,
  getDocumentKeyPrefix,
  getLegacyDocumentCollectionKey,
  getRecoveredEditsKey,
  WORKSPACE_OWNER_STORAGE_KEY,
} from "@/features/documents/services/storage-keys";

const pendingSaves = new Map<
  string,
  {
    document: BaseDocument;
    timer: number | null;
    onFlush?: (result: SaveDocumentResult) => void;
  }
>();
const storageInstances = new Map<DocumentType, LocalStorageService<BaseDocument>>();

function pendingSaveKey(type: DocumentType, id: string) {
  return `${type}:${id}`;
}

/** Fresh document id. Exported because import assigns one too — see import-service.ts. */
export function buildDocumentId(type: DocumentType): string {
  return createId(type.toLowerCase());
}

function toIndexEntry(type: DocumentType, document: BaseDocument): DocumentIndexEntry {
  return {
    id: document.id,
    type,
    title: document.title,
    templateId: document.templateId,
    description: getDocumentDefinition(type).describe(document),
    updatedAt: document.updatedAt,
    sync: document.sync,
  };
}

/**
 * Single shared LocalStorageService instance per document type — reused by
 * both this module (editor autosave) and the sync engine (document-sync.ts)
 * so there is exactly one in-process writer per type instead of two
 * independently-instantiated clients racing against the same storage keys.
 */
export function getWorkspaceStorage(type: DocumentType): LocalStorageService<BaseDocument> {
  let instance = storageInstances.get(type);

  if (!instance) {
    instance = new LocalStorageService<BaseDocument>({
      scope: type,
      documentKey: (id) => getDocumentKey(type, id),
      documentKeyPrefix: getDocumentKeyPrefix(type),
      legacyCollectionKey: getLegacyDocumentCollectionKey(type),
      updatedEventName: DOCUMENT_STORAGE_UPDATED_EVENT,
      parseItem: getDocumentDefinition(type).parse,
      toIndexEntry: (document) => toIndexEntry(type, document),
      repairIndex: rebuildDocumentIndex,
      cloudContentRevision: (id) => SyncEngine.getCloudContentRevision(id, type),
      resolveMovedId: (id) => resolveMovedDocumentId(type, id),
      newEntryOwner: getWorkspaceViewer,
    });
    storageInstances.set(type, instance);
  }

  return instance;
}

/**
 * Rebuilds the shared index from every type's document body keys after it was found
 * unparseable. The corrupt value is parked under `<index key>:corrupt` first.
 */
function rebuildDocumentIndex(): LocalStorageWriteResult {
  const corrupt = window.localStorage.getItem(DOCUMENT_INDEX_STORAGE_KEY);
  const index = emptyDocumentIndex();

  for (const type of DOCUMENT_TYPES) {
    Object.assign(index.items, getWorkspaceStorage(type).entriesFromBodies());
  }

  // Owners lived only in the index (an unparseable one, or not an object, so nothing of it
  // can be read back): each rebuilt document is marked as of unknown owner.
  for (const entry of Object.values(index.items)) entry.owner = UNKNOWN_DOCUMENT_OWNER;

  // The rebuild overwrites the index key in place, so it needs no extra room; the copy of the
  // corrupt value does, and is skipped under quota rather than blocking every later save.
  const written = writeDocumentIndex(index);
  if (written.ok && corrupt !== null) parkCorruptDocumentIndex(corrupt);
  if (written.ok) indexRebuildListeners.forEach((listener) => listener());

  return written;
}

const indexRebuildListeners = new Set<() => void>();

/**
 * Called after the index was rebuilt from the document bodies. Every document is then of
 * unknown owner, so a signed-in session asks about them again rather than leave backup
 * paused until the next load. Returns the unsubscribe function.
 */
export function subscribeToIndexRebuilds(listener: () => void): () => void {
  indexRebuildListeners.add(listener);
  return () => indexRebuildListeners.delete(listener);
}

/**
 * Runs the one-time storage migration and index repair for every type. Both write, so they
 * run here — from an effect or a subscription — and never from a render's snapshot read.
 */
export function prepareWorkspaceStorage() {
  for (const type of DOCUMENT_TYPES) getWorkspaceStorage(type).prepare();
}

function clearPendingSave(type: DocumentType, id: string) {
  if (typeof window === "undefined") return;

  const key = pendingSaveKey(type, id);
  const pending = pendingSaves.get(key);

  if (!pending) return;

  if (pending.timer !== null) {
    window.clearTimeout(pending.timer);
  }

  pendingSaves.delete(key);
}

/**
 * Every document's index entry on this device, whoever it belongs to. For the ownership and
 * storage bookkeeping only; anything shown to the user goes through {@link listDocuments}.
 */
export function listAllDocumentEntries(type?: DocumentType): DocumentIndexEntry[] {
  const selectedTypes: DocumentType[] = type ? [type] : [...DOCUMENT_TYPES];

  return selectedTypes.flatMap((t) => getWorkspaceStorage(t).listIndex());
}

/**
 * Metadata of the viewer's documents, for list views (another account's or a guest's
 * documents on the same device are not listed). Reads the storage index only — it never
 * loads or validates a document body, so its cost does not grow with document size.
 */
export function listDocuments(type?: DocumentType): DocumentMeta[] {
  return visibleEntries(listAllDocumentEntries(type))
    .map((entry) => ({
      id: entry.id,
      type: entry.type as DocumentType,
      title: entry.title,
      templateId: entry.templateId,
      updatedAt: entry.updatedAt,
      sync: entry.sync,
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** Index entries including the card description, for the document library. */
export function listDocumentIndexEntries(type?: DocumentType): DocumentIndexEntry[] {
  return visibleEntries(listAllDocumentEntries(type)).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

/** Monotonic storage revision, for cache keys. Cheap — see document-index.ts. */
export function getWorkspaceRevision(): number {
  return Math.max(...DOCUMENT_TYPES.map((type) => getWorkspaceStorage(type).getRevision()), 0);
}

/** The viewer's document with this id; null when it is absent or belongs to someone else. */
export function loadDocumentById(type: DocumentType, id: string): BaseDocument | null {
  const entry = readDocumentIndex().items[`${type}:${id}`];

  if (entry && visibleEntries([entry]).length === 0) return null;

  return getWorkspaceStorage(type).loadById(id);
}

/** Records who documents belong to (see `DocumentIndexEntry.owner`), in one index write. */
export function setDocumentOwners(
  documents: Array<{ type: string; id: string }>,
  owner: string | null,
): LocalStorageWriteResult {
  const index = readDocumentIndex();

  for (const { type, id } of documents) {
    const entry = index.items[`${type}:${id}`];
    if (entry) index.items[`${type}:${id}`] = { ...entry, owner };
  }

  const result = writeDocumentIndex(index);
  if (result.ok) window.dispatchEvent(new Event(DOCUMENT_STORAGE_UPDATED_EVENT));

  return result;
}

/** One document's index entry (version and sync state), without reading its body. */
export function getDocumentIndexEntry(type: DocumentType, id: string): DocumentIndexEntry | null {
  return readDocumentIndex().items[`${type}:${id}`] ?? null;
}

export interface RecoveredEdits {
  savedAt: string;
  /** The editor store's document, as it was when the editor was left. */
  document: unknown;
}

/** Keeps an editor's held, unsaved version of a document for the next time it opens. */
export function saveRecoveredEdits(
  type: DocumentType,
  id: string,
  document: unknown,
): LocalStorageWriteResult {
  const edits: RecoveredEdits = { savedAt: new Date().toISOString(), document };

  return safeSetLocalStorageItem(
    window.localStorage,
    getRecoveredEditsKey(type, id),
    JSON.stringify(edits),
  );
}

export function readRecoveredEdits(type: DocumentType, id: string): RecoveredEdits | null {
  const raw = window.localStorage.getItem(getRecoveredEditsKey(type, id));
  if (!raw) return null;

  try {
    const edits = JSON.parse(raw) as Partial<RecoveredEdits>;
    if (typeof edits.savedAt === "string" && edits.document) return edits as RecoveredEdits;
  } catch {
    // Unreadable: removed below, like one of the wrong shape.
  }

  console.warn("Discarded unreadable recovered edits.", { type, id });
  clearRecoveredEdits(type, id);
  return null;
}

export function clearRecoveredEdits(type: DocumentType, id: string): void {
  window.localStorage.removeItem(getRecoveredEditsKey(type, id));
}

/** Whether an edit to the document is still waiting in the autosave debounce. */
export function hasPendingSave(type: DocumentType, id: string): boolean {
  return pendingSaves.has(pendingSaveKey(type, id));
}

/** Drops the document's debounced autosave unwritten (the user chose another version). */
export function discardPendingSave(type: DocumentType, id: string): void {
  clearPendingSave(type, id);
}

/**
 * The version (`updatedAt`) of each document this tab's editors last wrote. An editor tells its
 * own writes from another tab's or a cloud pull's by it: the stores and `saveResume` stamp the
 * time differently, so the editor's copy cannot.
 */
const ownVersions = new Map<string, string>();

function persistDocument(document: BaseDocument): SaveDocumentResult {
  ownVersions.set(pendingSaveKey(document.type, document.id), document.updatedAt);

  return getWorkspaceStorage(document.type).persist(document);
}

/** Whether `updatedAt` is the version of the document this tab last wrote. */
export function isOwnVersion(type: DocumentType, id: string, updatedAt: string): boolean {
  return ownVersions.get(pendingSaveKey(type, id)) === updatedAt;
}

export function saveDocument(
  document: BaseDocument,
  options?: SaveDocumentOptions,
): SaveDocumentResult {
  if (typeof window === "undefined") return { ok: true, queued: false };

  if (options?.flush) {
    clearPendingSave(document.type, document.id);
    return persistDocument(document);
  }

  const debounceMs = Math.max(0, options?.debounceMs ?? 0);

  if (debounceMs > 0) {
    const key = pendingSaveKey(document.type, document.id);

    clearPendingSave(document.type, document.id);

    const timer = window.setTimeout(() => {
      const pending = pendingSaves.get(key);
      pendingSaves.delete(key);

      if (!pending) return;

      // Persist unconditionally, then report: `onFlush?.(persistDocument(…))` would skip
      // the write entirely whenever no callback was supplied, because an optional call
      // does not evaluate its arguments.
      const result = persistDocument(pending.document);

      // The write's own result — the caller's `{ queued: true }` said nothing about it.
      pending.onFlush?.(result);
    }, debounceMs);

    pendingSaves.set(key, { document, timer, onFlush: options?.onFlush });
    return { ok: true, queued: true };
  }

  return persistDocument(document);
}

/**
 * Renames a document on this device; the sync worker pushes it like any other edit. A resume's
 * envelope title is rebuilt from `content.title` on every editor save, so the content takes the
 * new title too, or the next open would undo the rename. `null` when the document is not here.
 */
export function renameDocument(
  type: DocumentType,
  id: string,
  title: string,
): { document: BaseDocument; saved: SaveDocumentResult } | null {
  const stored = loadDocumentById(type, id);
  if (!stored) return null;

  // The server refuses a longer title, which would stop every backup (S-405).
  title = title.slice(0, DOCUMENT_TITLE_MAX_LENGTH);

  const document: BaseDocument = {
    ...stored,
    title,
    content:
      type === "RESUME"
        ? { ...(stored.content as Record<string, unknown>), title }
        : stored.content,
    updatedAt: new Date().toISOString(),
  };

  return { document, saved: saveDocument(document, { flush: true }) };
}

/**
 * Persists every pending debounced save right now, synchronously.
 *
 * Autosave debounces at 300ms via a `setTimeout` held in {@link pendingSaves}. Without
 * forcing that timer early, closing the tab, reloading, or backgrounding on mobile (where
 * the browser may discard the page outright) would drop whatever was typed in the last
 * 300ms — the moment it hurts most, since users finish a sentence and leave.
 *
 * Deliberately synchronous: `localStorage.setItem` already is, and an unload path must not
 * await anything. Each pending entry still reports through its own `onFlush`, so an editor
 * finds out about a quota failure here exactly as it would have on the timer.
 */
export function flushPendingSaves(type?: DocumentType): void {
  if (typeof window === "undefined") return;

  for (const [key, pending] of [...pendingSaves.entries()]) {
    if (type && !key.startsWith(`${type}:`)) continue;

    pendingSaves.delete(key);

    if (pending.timer !== null) window.clearTimeout(pending.timer);

    // Written first: an optional call skips evaluating its argument when there is no callback.
    const result = persistDocument(pending.document);
    pending.onFlush?.(result);
  }
}

/**
 * Persists one document's pending debounced save now, if it has one. The sync layer calls
 * this before it decides a document is clean, so the last 300ms of typing count.
 */
export function flushPendingSave(type: DocumentType, id: string): void {
  if (typeof window === "undefined") return;

  const key = pendingSaveKey(type, id);
  const pending = pendingSaves.get(key);

  if (!pending) return;

  pendingSaves.delete(key);
  if (pending.timer !== null) window.clearTimeout(pending.timer);

  const result = persistDocument(pending.document);
  pending.onFlush?.(result);
}

function readDocumentMoves(): Record<string, string> {
  const raw = window.localStorage.getItem(DOCUMENT_MOVES_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The id `id` was moved to, following every later move; null when it never moved. */
function resolveMovedDocumentId(type: DocumentType, id: string): string | null {
  if (typeof window === "undefined") return null;

  const moves = readDocumentMoves();
  let current = id;

  // Bounded: a corrupt map must not loop.
  for (let hop = 0; hop < 16; hop += 1) {
    const next = moves[`${type}:${current}`];
    if (!next) break;
    current = next;
  }

  return current === id ? null : current;
}

/**
 * Drops the moves whose final destination is no longer on this device (deleted since), so the
 * map does not grow with every re-key for the life of the device.
 */
function pruneDocumentMoves(moves: Record<string, string>): Record<string, string> {
  const live = new Set(listAllDocumentEntries().map((entry) => `${entry.type}:${entry.id}`));

  return Object.fromEntries(
    Object.entries(moves).filter(([key]) => {
      const type = key.slice(0, key.indexOf(":"));
      let current = key.slice(type.length + 1);

      for (let hop = 0; hop < 16; hop += 1) {
        const next = moves[`${type}:${current}`];
        if (!next) break;
        current = next;
      }

      return live.has(`${type}:${current}`);
    }),
  );
}

/**
 * Moves a document to a fresh id, unlinked from the cloud and waiting to sync.
 *
 * For a document whose id the server will never accept again (it was deleted in the cloud):
 * the content is kept, the old id is removed, and the new document is created as new.
 * Returns the new document, or null when it could not be written (the old one is then kept).
 */
export function rekeyDocument(type: DocumentType, id: string): BaseDocument | null {
  flushPendingSave(type, id);

  const current = getWorkspaceStorage(type).loadById(id);
  if (!current) return null;

  const nextId = buildDocumentId(type);
  const sync: BaseDocument["sync"] = {
    ...current.sync,
    enabled: true,
    status: "pending",
    cloudDocumentId: null,
    lastSyncedAt: null,
    revision: 1,
  };

  const next: BaseDocument = {
    ...current,
    id: nextId,
    sync,
    content: withDocumentIdentity(current.content, { id: nextId, sync }),
  };

  if (!persistDocument(next).ok) return null;

  // Recorded before the old id goes, so no editor (in any tab) still holding it can save
  // into the gap: its saves are redirected to the new id from here on.
  const moves = pruneDocumentMoves(readDocumentMoves());
  moves[`${type}:${id}`] = nextId;

  if (
    !safeSetLocalStorageItem(window.localStorage, DOCUMENT_MOVES_STORAGE_KEY, JSON.stringify(moves))
      .ok
  ) {
    deleteDocument(type, nextId);
    return null;
  }

  // Held edits follow the document to its new id (deleting the old one clears its key).
  const recovered = window.localStorage.getItem(getRecoveredEditsKey(type, id));

  if (
    recovered !== null &&
    !safeSetLocalStorageItem(window.localStorage, getRecoveredEditsKey(type, nextId), recovered).ok
  ) {
    console.error("Unsaved edits could not follow the document to its new id: storage is full.");
  }

  deleteDocument(type, id);
  SyncEngine.setSyncOptedOut(id, false, type);

  return next;
}

/**
 * Builds and persists a new document.
 *
 * `master` is the profile to seed from. Synchronous on purpose — the registry's
 * `createDefault` cannot await — so callers that want the *database* copy resolve it first;
 * see {@link createDocumentFromMasterProfile}.
 */
export type CreatedDocument = BaseDocument & {
  /** Whether the new document reached storage. Never navigate to it when this failed. */
  saveResult: SaveDocumentResult;
};

export function createDocument(
  type: DocumentType,
  master?: MasterProfileData,
  options?: { sample?: boolean },
): CreatedDocument {
  const id = buildDocumentId(type);
  const defaultDoc = getDocumentDefinition(type).createDefault(id, master, options);
  const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();

  const sync: BaseDocument["sync"] = {
    ...defaultDoc.sync,
    enabled: workspaceSettings.autoSyncEnabled,
    status: workspaceSettings.autoSyncEnabled ? "pending" : "local-only",
  };

  const doc: BaseDocument = {
    ...defaultDoc,
    sync,
    // The workspace setting has to reach the content's own sync copy too, or the resume
    // editor's first autosave reverts it — see withDocumentIdentity.
    content: withDocumentIdentity(defaultDoc.content, { id, sync }),
  };

  const saveResult = saveDocument(doc);

  return { ...doc, saveResult };
}

/**
 * `createDocument`, with the master profile fetched first.
 *
 * The entry point every user-facing "new document" action should use. The profile lives in
 * the database, so reaching it means an await; doing that here rather than in each of the
 * four call sites is what stops one of them quietly going back to demo data — which is the
 * bug this whole path exists to fix. Resolution never throws and never blocks: with no
 * profile, offline, or signed out, the document is still created from each type's own
 * fallback content.
 */
export async function createDocumentFromMasterProfile(type: DocumentType) {
  return createDocument(type, await getMasterProfileForNewDocument());
}

export function deleteDocument(type: DocumentType, id: string): LocalStorageWriteResult {
  clearPendingSave(type, id);

  const result = getWorkspaceStorage(type).delete(id);

  if (result.ok) {
    SyncEngine.removeOutboxItem(id, type);
    clearRecoveredEdits(type, id);
  }

  return result;
}

/**
 * For an editor whose document left storage in another tab (S-403): when it is gone, and not
 * moved to a new id (whose saves follow it), its pending autosave is dropped and every later
 * save of it is refused, so a local-only document the user deleted is not written back by the
 * next keystroke. Returns whether it was gone. The body is checked as well as the index, which
 * reads as empty while it is being rebuilt.
 */
export function forgetDocumentRemovedElsewhere(type: DocumentType, id: string): boolean {
  if (getDocumentIndexEntry(type, id) || window.localStorage.getItem(getDocumentKey(type, id))) {
    return false;
  }

  if (resolveMovedDocumentId(type, id)) return false;

  clearPendingSave(type, id);
  getWorkspaceStorage(type).markRemoved(id);

  return true;
}

/**
 * Deletes a document from the cloud (when it is linked there) and then from this device.
 *
 * Every user-facing delete goes through here. Deleting only the local copy left the cloud row
 * counting toward the free-tier limit and its public share link still serving. A 404 means
 * the cloud copy is already gone, so the local delete goes ahead; any other failure throws
 * with the server's message and leaves the local copy in place, still linked, so the delete
 * can be retried.
 */
export async function deleteDocumentEverywhere(
  type: DocumentType,
  doc: { id: string },
): Promise<void> {
  // Another account's document is not the viewer's to delete, here or in the cloud (S-372).
  const entry = getDocumentIndexEntry(type, doc.id);

  if (entry && entriesOfOtherAccounts([entry]).length > 0) {
    throw new Error("This document could not be found.");
  }

  // A first upload still in flight would land after the local delete, take the free slot and
  // come back on the next pull; once it settles, the linkage below includes it.
  await SyncEngine.whenSyncSettled(doc.id, type);

  // Storage owns the sync block: an editor's copy can predate the first successful sync.
  const linked = Boolean(loadDocumentById(type, doc.id)?.sync.cloudDocumentId);

  if (linked) {
    try {
      await DocumentApi.delete(doc.id);
    } catch (error) {
      if (!isDocumentApiError(error, 404)) throw error;
    }
  }

  const result = deleteDocument(type, doc.id);

  if (!result.ok) {
    throw new Error(
      result.reason === "quota-exceeded"
        ? "The document was deleted from the cloud, but this device's storage is full and the local copy could not be removed."
        : "The local copy could not be removed. Please try again.",
    );
  }
}

const WORKSPACE_KEY_PREFIXES = [
  "veriworkly:docs:",
  "veriworkly:cloud-hydrate-meta:",
  MASTER_PROFILE_STORAGE_KEY,
  ...Object.values(SYNC_STORAGE_KEYS),
];

/**
 * Removes everything this device holds about the signed-in user's work: every document body
 * and index (parked `:corrupt` copies included), the sync outbox, telemetry, opt-outs and
 * hydrate cursors, and the cached master profile. For sign-out and account deletion, so the
 * next person on a shared device starts empty. Workspace preferences are kept.
 *
 * `leaving` is the account signing out (null for a guest). Only its own documents go: those
 * another account left here stay for it, still hidden from everyone else (S-372), and so do a
 * guest's and those of unknown owner still waiting for an answer, which may not be the leaving
 * account's at all. Signing out is not a way to delete someone else's work. A guest leaving
 * keeps only other accounts' documents. Without `leaving`, every document goes.
 */
export function clearWorkspaceStorage(leaving?: string | null): void {
  if (typeof window === "undefined") return;

  const kept = leaving === undefined ? null : captureDocumentsNotLeaving(leaving);

  // First, so a sync or pull already in flight drops its reply instead of writing it back.
  bumpWorkspaceEpoch();
  dropPendingSaves();

  // Index-driven first, so storage without key enumeration is still cleared of documents.
  for (const type of DOCUMENT_TYPES) getWorkspaceStorage(type).clear();

  for (const key of listLocalStorageKeys()) {
    if (WORKSPACE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  }

  if (kept) restoreDocumentsNotLeaving(kept);

  invalidateDocumentIndexCache();
  window.dispatchEvent(new Event(DOCUMENT_STORAGE_UPDATED_EVENT));
  announceWorkspaceCleared();
}

interface KeptDocuments {
  documents: Array<{ entry: DocumentIndexEntry; body: string; recovered: string | null }>;
  /** Kept with them, so a document of unknown owner stays hidden from a guest. */
  deviceOwner: string | null;
  /** Each sync record (outbox, telemetry, opt-outs, cloud revisions), as stored. */
  syncRecords: Array<[key: string, raw: string | null]>;
}

/** What {@link clearWorkspaceStorage} puts back: every document that is not `leaving`'s. */
function captureDocumentsNotLeaving(leaving: string | null): KeptDocuments {
  const deviceOwner = readDeviceOwner();
  const all = listAllDocumentEntries();
  const leavingOwn = new Set(entriesOwnedBy(all, leaving));
  const kept =
    leaving === null
      ? entriesOfOtherAccounts(all, null)
      : all.filter((entry) => !leavingOwn.has(entry));

  const documents = kept.flatMap((entry) => {
    const type = entry.type as DocumentType;
    const body = window.localStorage.getItem(getDocumentKey(type, entry.id));
    // Written out: an entry without an owner is the device owner's, and that record is cleared.
    const owner = entry.owner === undefined ? deviceOwner : entry.owner;

    return body === null
      ? []
      : [
          {
            entry: { ...entry, owner },
            body,
            recovered: window.localStorage.getItem(getRecoveredEditsKey(type, entry.id)),
          },
        ];
  });

  return {
    documents,
    deviceOwner,
    syncRecords: Object.values(SYNC_STORAGE_KEYS).map((key) => [
      key,
      window.localStorage.getItem(key),
    ]),
  };
}

/**
 * Narrows one stored sync record to `keys` (`TYPE:id`). Every record is a JSON object whose
 * fields are maps keyed by document, or a list of such keys (the opt-outs). Null when it holds
 * nothing to put back or cannot be read.
 */
function narrowSyncRecord(raw: string | null, keys: Set<string>): string | null {
  if (!raw) return null;

  try {
    const record = JSON.parse(raw) as Record<string, unknown>;
    const narrowed = Object.fromEntries(
      Object.entries(record).map(([field, value]) => [
        field,
        Array.isArray(value)
          ? value.filter((key) => keys.has(key))
          : typeof value === "object" && value !== null
            ? Object.fromEntries(Object.entries(value).filter(([key]) => keys.has(key)))
            : value,
      ]),
    );

    return JSON.stringify(narrowed);
  } catch {
    return null;
  }
}

function restoreDocumentsNotLeaving({ documents, deviceOwner, syncRecords }: KeptDocuments) {
  if (documents.length === 0) return;

  const storage = window.localStorage;
  const index = readDocumentIndex();
  const keys = new Set<string>();

  for (const { entry, body, recovered } of documents) {
    const type = entry.type as DocumentType;
    // Room was just made by the clear; a write that still fails loses only that document here.
    if (!safeSetLocalStorageItem(storage, getDocumentKey(type, entry.id), body).ok) continue;

    if (recovered !== null) {
      safeSetLocalStorageItem(storage, getRecoveredEditsKey(type, entry.id), recovered);
    }

    index.items[`${type}:${entry.id}`] = entry;
    keys.add(`${type}:${entry.id}`);
  }

  if (!writeDocumentIndex(index).ok) {
    console.error(
      "Documents that are not the leaving account's could not be kept: storage is full.",
    );
    return;
  }

  if (deviceOwner !== null) {
    safeSetLocalStorageItem(storage, WORKSPACE_OWNER_STORAGE_KEY, deviceOwner);
  }

  for (const [key, raw] of syncRecords) {
    const narrowed = narrowSyncRecord(raw, keys);
    if (narrowed !== null) safeSetLocalStorageItem(storage, key, narrowed);
  }
}

/** Discards debounced autosaves without writing them. */
function dropPendingSaves() {
  for (const [key, pending] of [...pendingSaves.entries()]) {
    if (pending.timer !== null) window.clearTimeout(pending.timer);
    pendingSaves.delete(key);
  }
}

const WORKSPACE_CHANNEL_NAME = "veriworkly:workspace";
const WORKSPACE_CLEARED_MESSAGE = "workspace-cleared";
/** Written and removed at once: its `storage` event is the signal where BroadcastChannel is missing. */
const WORKSPACE_CLEARED_SIGNAL_KEY = "veriworkly:workspace-cleared";

let workspaceChannel: BroadcastChannel | null | undefined;

/** One channel per tab: a channel never receives its own messages, so this tab ignores its clears. */
function getWorkspaceChannel() {
  if (workspaceChannel === undefined) {
    workspaceChannel =
      typeof window.BroadcastChannel === "function"
        ? new window.BroadcastChannel(WORKSPACE_CHANNEL_NAME)
        : null;
  }

  return workspaceChannel;
}

function announceWorkspaceCleared() {
  const channel = getWorkspaceChannel();

  if (channel) {
    channel.postMessage(WORKSPACE_CLEARED_MESSAGE);
    return;
  }

  // Best effort under quota: the other tabs still lose every document key this tab removed,
  // and their next save of the previous user's document has no index to land in.
  safeSetLocalStorageItem(window.localStorage, WORKSPACE_CLEARED_SIGNAL_KEY, String(Date.now()));
  window.localStorage.removeItem(WORKSPACE_CLEARED_SIGNAL_KEY);
}

/**
 * Calls `onCleared` when another tab clears the workspace (sign-out, account deletion). This
 * tab's pending autosaves and in-flight syncs are dropped first, so an editor still holding
 * the previous user's document cannot write it back. Returns the unsubscribe function.
 */
export function subscribeToWorkspaceClears(onCleared: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCleared = () => {
    bumpWorkspaceEpoch();
    dropPendingSaves();
    invalidateDocumentIndexCache();
    onCleared();
  };

  const onMessage = (event: MessageEvent) => {
    if (event.data === WORKSPACE_CLEARED_MESSAGE) handleCleared();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_CLEARED_SIGNAL_KEY && event.newValue !== null) handleCleared();
  };

  const channel = getWorkspaceChannel();

  channel?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}

const SIGNED_IN_MESSAGE_PREFIX = "signed-in:";
/** Written and removed at once, like the clear signal: its value is the account's id. */
const SIGNED_IN_SIGNAL_KEY = "veriworkly:workspace-signed-in";

const accountSwitchListeners = new Set<() => void>();

/**
 * Tells the other tabs which account this browser is now signed in as. A tab still showing
 * another account would otherwise upload that account's documents with this one's cookie.
 */
export function announceSignedIn(userId: string) {
  const channel = getWorkspaceChannel();

  if (channel) {
    channel.postMessage(`${SIGNED_IN_MESSAGE_PREFIX}${userId}`);
    return;
  }

  safeSetLocalStorageItem(window.localStorage, SIGNED_IN_SIGNAL_KEY, userId);
  window.localStorage.removeItem(SIGNED_IN_SIGNAL_KEY);
}

/**
 * The browser's session belongs to another account than the one this tab shows. Its typing is
 * kept on this device, every sync still in flight drops its reply, and the listeners stop the
 * workers and leave the page.
 */
export function leaveSwitchedAccount() {
  bumpWorkspaceEpoch();
  flushPendingSaves();
  invalidateDocumentIndexCache();

  for (const listener of [...accountSwitchListeners]) listener();
}

/**
 * Calls `onSwitched` when another tab signs in as an account other than this tab's viewer,
 * or when this tab finds its session is someone else's (`leaveSwitchedAccount`). Returns the
 * unsubscribe function.
 */
export function subscribeToAccountSwitches(onSwitched: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleSignedIn = (userId: string) => {
    if (userId !== getWorkspaceViewer()) leaveSwitchedAccount();
  };

  const onMessage = (event: MessageEvent) => {
    if (typeof event.data === "string" && event.data.startsWith(SIGNED_IN_MESSAGE_PREFIX)) {
      handleSignedIn(event.data.slice(SIGNED_IN_MESSAGE_PREFIX.length));
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === SIGNED_IN_SIGNAL_KEY && event.newValue) handleSignedIn(event.newValue);
  };

  const channel = getWorkspaceChannel();

  accountSwitchListeners.add(onSwitched);
  channel?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);

  return () => {
    accountSwitchListeners.delete(onSwitched);
    channel?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}
