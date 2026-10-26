"use client";

import {
  safeSetLocalStorageItem,
  type LocalStorageWriteResult,
} from "./storage/safe-local-storage";
import {
  getDocumentIndexRevision,
  listLocalStorageKeys,
  readDocumentIndex,
  wasDocumentIndexCorrupt,
  writeDocumentIndex,
} from "./document-index";
import { withDocumentIdentity } from "@/features/documents/core/content-identity";
import { BaseDocumentData, DocumentIndex, DocumentIndexEntry } from "@/types/document";

export interface SaveDocumentOptions {
  debounceMs?: number;
  flush?: boolean;
  /**
   * Called with the real write's result once a debounced save lands.
   *
   * A debounced `saveDocument` returns `{ ok: true, queued: true }` immediately — the
   * write itself happens `debounceMs` later — so the returned value can never describe a
   * quota failure. Callers that report save state to the user must listen here, or a
   * full-storage autosave stays invisible.
   */
  onFlush?: (result: SaveDocumentResult) => void;
}

export type SaveDocumentResult =
  | {
      ok: true;
      queued: boolean;
      /**
       * Set when the save was redirected because the document had moved to this id (see
       * `rekeyDocument`). The caller holds a stale id and should switch to this one.
       */
      movedTo?: string;
    }
  | {
      ok: false;
      /** `removed`: the document was deleted (here or on another device) since it was opened. */
      reason: "quota-exceeded" | "unknown" | "removed";
    };

export interface LocalStorageConfig<T extends BaseDocumentData> {
  /** Namespace within the shared index, and the `<TYPE>` segment of document keys. */
  scope: string;
  documentKey: (id: string) => string;
  documentKeyPrefix: string;
  /** Pre-v3 single-blob key, read once to migrate then deleted. */
  legacyCollectionKey: string;
  updatedEventName: string;
  parseItem: (input: unknown) => T | null;
  /** Projects a document down to what list views need. See DocumentIndexEntry. */
  toIndexEntry: (item: T) => DocumentIndexEntry;
  /**
   * Rebuilds the shared index from every type's document bodies. The index spans all types,
   * so one scope cannot rebuild it alone; the workspace service, which knows every type,
   * supplies this.
   */
  repairIndex?: () => LocalStorageWriteResult;
  /** The revision whose content the last cloud merge wrote for `id`, or null. See `persist`. */
  cloudContentRevision?: (id: string) => number | null;
  /** The id a document was moved to (following every move), or null when it never moved. */
  resolveMovedId?: (id: string) => string | null;
  /** Who a document first written now belongs to (`DocumentIndexEntry.owner`). */
  newEntryOwner?: () => string | null;
}

const CORRUPT_SUFFIX = ":corrupt";

/**
 * Per-document localStorage store with a shared metadata index.
 *
 * The important property: `persist`, `loadById`, and `patchSync` touch exactly one
 * document key plus the (small, body-free) index. None of them scale with how many
 * documents the user has. See storage-keys.ts for why v2's single-blob layout had to go.
 *
 * `listIndex` and `getRevision` never write: the document library calls them from a
 * `useSyncExternalStore` getSnapshot. Every other method first runs {@link prepare}
 * (legacy migration and corrupt-index repair), which can.
 */
export class LocalStorageService<T extends BaseDocumentData> {
  private migrated = false;

  /**
   * Ids deleted in this tab. An editor still holding a removed document (deleted from the
   * library, or by the sync worker because another device deleted it) must not write it back.
   */
  private removedIds = new Set<string>();

  constructor(private config: LocalStorageConfig<T>) {}

  private isBrowser() {
    return typeof window !== "undefined";
  }

  private emitUpdatedEvent() {
    if (!this.isBrowser()) return;
    window.dispatchEvent(new Event(this.config.updatedEventName));
  }

  private indexKeyFor(id: string) {
    return `${this.config.scope}:${id}`;
  }

  /**
   * The item's index entry. A document keeps the owner it has; only a new one takes the
   * current writer's, so an edit or a sync never moves a document between accounts.
   */
  private entryFor(index: DocumentIndex, item: T): DocumentIndexEntry {
    const previous = index.items[this.indexKeyFor(item.id)];
    const owner = previous ? previous.owner : this.config.newEntryOwner?.();
    const entry = this.config.toIndexEntry(item);

    return owner === undefined ? entry : { ...entry, owner };
  }

  private toComparablePayload(item: T | null | undefined) {
    if (!item) return null;
    const { updatedAt, sync, ...payload } = item;
    void updatedAt;
    void sync;

    if (payload && typeof payload === "object" && "content" in payload) {
      const content = (payload as { content: unknown }).content;

      if (content && typeof content === "object") {
        const contentPayload = { ...(content as Record<string, unknown>) };
        delete contentPayload.updatedAt;
        delete contentPayload.sync;
        return {
          ...payload,
          content: contentPayload,
        };
      }
    }

    return payload;
  }

  private hasPayloadChanged(previous: T | null | undefined, next: T) {
    const previousPayload = this.toComparablePayload(previous);
    const nextPayload = this.toComparablePayload(next);
    return JSON.stringify(previousPayload) !== JSON.stringify(nextPayload);
  }

  /** Sets the envelope's sync block and the content's own copy of it, when it has one. */
  private withSync(item: T, sync: T["sync"]): T {
    const content = (item as { content?: unknown }).content;

    return {
      ...item,
      sync,
      ...(content === undefined ? {} : { content: withDocumentIdentity(content, { sync }) }),
    };
  }

  /** Sets the envelope's id and the content's own copy of it, when it has one. */
  private withId(item: T, id: string): T {
    const content = (item as { content?: unknown }).content;

    return {
      ...item,
      id,
      ...(content === undefined ? {} : { content: withDocumentIdentity(content, { id }) }),
    };
  }

  /**
   * Splits a pre-v3 single-blob collection into per-document keys, once.
   *
   * Runs on first storage access rather than at import time so it cannot throw during
   * module evaluation or run on the server, and never from a render (see {@link prepare}).
   * The legacy key is removed only after every document has been written, so an interrupted
   * migration (quota, crash) retries on next load instead of losing documents. A retry skips
   * documents that already have a v3 key: those may hold edits made since the first attempt.
   * An item that does not parse is parked under `<legacy key>:corrupt` and keeps the legacy
   * key alive, so nothing is ever deleted unread.
   */
  private migrateLegacyCollectionIfNeeded() {
    if (this.migrated || !this.isBrowser()) return;

    const storage = window.localStorage;
    const raw = storage.getItem(this.config.legacyCollectionKey);

    if (!raw) {
      this.migrated = true;
      return;
    }

    let legacyItems: Record<string, unknown> = {};

    try {
      const parsed: unknown = JSON.parse(raw);
      const items =
        typeof parsed === "object" && parsed !== null
          ? (parsed as { items?: unknown }).items
          : undefined;

      if (typeof items === "object" && items !== null) {
        legacyItems = items as Record<string, unknown>;
      }
    } catch {
      // Unparseable as a whole: park the raw text, and drop the legacy key only once it is safe.
      const parked = safeSetLocalStorageItem(
        storage,
        `${this.config.legacyCollectionKey}${CORRUPT_SUFFIX}`,
        raw,
      );

      if (parked.ok) storage.removeItem(this.config.legacyCollectionKey);
      this.migrated = true;
      return;
    }

    const index = this.readHealthyIndex();
    if (!index) return;

    const unparseable: Record<string, unknown> = {};
    let wroteEverything = true;

    for (const [legacyId, value] of Object.entries(legacyItems)) {
      const item = this.config.parseItem(value);

      if (!item) {
        wroteEverything = false;
        unparseable[legacyId] = value;
        continue;
      }

      const indexKey = this.indexKeyFor(item.id);
      const existing = storage.getItem(this.config.documentKey(item.id)) !== null;

      if (existing) {
        if (!index.items[indexKey]) {
          const current = this.readDocument(item.id);
          if (current) index.items[indexKey] = this.config.toIndexEntry(current);
        }
        continue;
      }

      const write = safeSetLocalStorageItem(
        storage,
        this.config.documentKey(item.id),
        JSON.stringify(item),
      );

      if (!write.ok) {
        wroteEverything = false;
        continue;
      }

      index.items[indexKey] = this.config.toIndexEntry(item);
    }

    if (Object.keys(unparseable).length > 0) {
      const parked = safeSetLocalStorageItem(
        storage,
        `${this.config.legacyCollectionKey}${CORRUPT_SUFFIX}`,
        JSON.stringify({ items: unparseable }),
      );

      if (!parked.ok) wroteEverything = false;
    }

    // Not marked migrated when the index write fails, so the next access retries.
    if (!writeDocumentIndex(index).ok) return;

    this.migrated = true;
    if (wroteEverything) storage.removeItem(this.config.legacyCollectionKey);
  }

  /**
   * The index, repaired first when it is corrupt. Null when the repair could not be written:
   * the caller must then fail its own write, because writing the index it holds (empty, or
   * one entry) over the corrupt one would drop every other document from the library.
   */
  private readHealthyIndex(): DocumentIndex | null {
    const index = readDocumentIndex();

    if (!wasDocumentIndexCorrupt() || !this.config.repairIndex) return index;

    if (!this.config.repairIndex().ok) return null;

    return readDocumentIndex();
  }

  /** Index read for write paths: migrated and repaired first. Null as for {@link readHealthyIndex}. */
  private readIndex(): DocumentIndex | null {
    this.migrateLegacyCollectionIfNeeded();
    return this.readHealthyIndex();
  }

  /**
   * Runs the one-time legacy migration and repairs a corrupt index. Both write, so this is
   * called from write paths and effects, never from a render.
   */
  prepare() {
    if (this.isBrowser()) this.readIndex();
  }

  /**
   * Index entries rebuilt from this scope's document body keys, for the index repair.
   * Never reads the index itself.
   */
  entriesFromBodies(): Record<string, DocumentIndexEntry> {
    const entries: Record<string, DocumentIndexEntry> = {};

    for (const key of listLocalStorageKeys()) {
      if (!key.startsWith(this.config.documentKeyPrefix) || key.endsWith(CORRUPT_SUFFIX)) continue;

      const item = this.readDocument(key.slice(this.config.documentKeyPrefix.length));
      if (item) entries[this.indexKeyFor(item.id)] = this.config.toIndexEntry(item);
    }

    return entries;
  }

  private readDocument(id: string): T | null {
    if (!this.isBrowser()) return null;

    const key = this.config.documentKey(id);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    try {
      return this.config.parseItem(JSON.parse(raw));
    } catch {
      // Kept for recovery rather than deleted: the text may be one bad byte from a document.
      const parked = safeSetLocalStorageItem(window.localStorage, `${key}${CORRUPT_SUFFIX}`, raw);
      if (parked.ok) window.localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Writes one document and its index entry. The document body is written first so a
   * quota failure cannot leave the index advertising a document that isn't there.
   */
  private writeDocument(item: T, index?: DocumentIndex): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const write = safeSetLocalStorageItem(
      window.localStorage,
      this.config.documentKey(item.id),
      JSON.stringify(item),
    );

    if (!write.ok) return write;

    const nextIndex = index ?? this.readIndex();
    if (!nextIndex) return { ok: false, reason: "unknown" };

    nextIndex.items[this.indexKeyFor(item.id)] = this.entryFor(nextIndex, item);

    return writeDocumentIndex(nextIndex);
  }

  /**
   * Metadata for every document in this scope, newest first. O(1) in document size —
   * this reads the index only and never touches a document body. Never writes.
   */
  listIndex(): DocumentIndexEntry[] {
    const index = readDocumentIndex();

    return Object.values(index.items)
      .filter((entry) => entry.type === this.config.scope)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Monotonic counter for cache keys; changes whenever anything in storage changes. */
  getRevision(): number {
    return getDocumentIndexRevision();
  }

  /**
   * Writes several documents against a single index read/write, so merging a cloud
   * hydration of N documents costs one index round trip rather than N. Writes each
   * document as given, sync block included: the callers are the storage owners (cloud
   * merge, bulk sync toggles).
   */
  persistMany(items: T[]): LocalStorageWriteResult {
    if (!this.isBrowser() || items.length === 0) return { ok: true };

    const index = this.readIndex();
    if (!index) return { ok: false, reason: "unknown" };

    for (const item of items) {
      const toPersist = this.withSync(item, item.sync);
      const write = safeSetLocalStorageItem(
        window.localStorage,
        this.config.documentKey(item.id),
        JSON.stringify(toPersist),
      );

      if (!write.ok) return write;

      index.items[this.indexKeyFor(item.id)] = this.entryFor(index, toPersist);
    }

    const result = writeDocumentIndex(index);
    if (result.ok) this.emitUpdatedEvent();

    return result;
  }

  loadById(id: string): T | null {
    this.prepare();
    return this.readDocument(id);
  }

  list(): T[] {
    this.prepare();

    return this.listIndex()
      .map((entry) => this.readDocument(entry.id))
      .filter((item): item is T => Boolean(item));
  }

  /**
   * Patches only the `sync` sub-object onto whatever is currently in storage for `id`,
   * re-reading fresh immediately before the write. Use this after an `await` (e.g. a
   * network round trip) instead of `persist()` with a pre-await snapshot — otherwise
   * any edit that landed in storage while the network call was in flight gets silently
   * reverted back to the stale pre-await content.
   */
  patchSync(id: string, syncPatch: Partial<T["sync"]>): SaveDocumentResult {
    if (!this.isBrowser()) return { ok: true, queued: false };

    const index = this.readIndex();
    const existing = this.readDocument(id);
    if (!index || !existing) return { ok: false, reason: "unknown" };

    const toPersist = this.withSync(existing, { ...existing.sync, ...syncPatch });

    const saveResult = this.writeDocument(toPersist, index);
    if (!saveResult.ok) return { ok: false, reason: saveResult.reason };

    this.emitUpdatedEvent();

    return { ok: true, queued: false };
  }

  /**
   * Saves an edit. Storage owns the sync block: editors hold the copy they loaded, which goes
   * stale the moment the sync worker records a cloud id or revision, so every sync field —
   * `enabled` included — comes from what is stored and changes only through the sync APIs
   * (bulk toggles, keep-local-only, a completed sync). Creating a document is the one save
   * whose sync block is taken from the caller.
   *
   * A save whose content matches what is stored writes nothing, so opening a document does
   * not move its `updatedAt` (or re-queue a sync). A real edit marks it `pending`, except
   * that a `conflicted` document stays conflicted until the user resolves it, and an edit
   * made on top of content older than the last cloud merge (an editor opened before another
   * device's version was pulled in) becomes `conflicted` rather than silently overwriting it.
   */
  persist(item: T): SaveDocumentResult {
    if (!this.isBrowser()) return { ok: true, queued: false };

    const parsed = this.config.parseItem(item);
    if (!parsed) return { ok: false, reason: "unknown" };

    const index = this.readIndex();
    if (!index) return { ok: false, reason: "unknown" };

    let normalized = parsed;
    let existing = this.readDocument(normalized.id);

    // A caller still on an id the document was moved away from (an editor in this tab before
    // it navigates, or in another tab) saves onto the document's current id, never a stray.
    const movedTo = existing ? null : (this.config.resolveMovedId?.(normalized.id) ?? null);

    if (movedTo) {
      normalized = this.withId(normalized, movedTo);
      existing = this.readDocument(movedTo);
    }

    // A missing document that the caller knows as cloud-linked was deleted (in another tab, or
    // on another device by the sync worker) after the caller loaded it; writing it would
    // resurrect it.
    if (!existing && (this.removedIds.has(normalized.id) || normalized.sync.cloudDocumentId)) {
      return { ok: false, reason: "removed" };
    }

    let toPersist: T;

    if (!existing) {
      toPersist = this.withSync(normalized, normalized.sync);
    } else {
      if (!this.hasPayloadChanged(existing, normalized)) {
        return movedTo ? { ok: true, queued: false, movedTo } : { ok: true, queued: false };
      }

      const status = !existing.sync.enabled
        ? "local-only"
        : existing.sync.status === "conflicted" || this.isStaleEdit(normalized, existing)
          ? "conflicted"
          : "pending";

      toPersist = this.withSync(normalized, { ...existing.sync, status } as T["sync"]);
    }

    const saveResult = this.writeDocument(toPersist, index);

    if (!saveResult.ok) return { ok: false, reason: saveResult.reason };

    this.emitUpdatedEvent();

    return movedTo ? { ok: true, queued: false, movedTo } : { ok: true, queued: false };
  }

  /**
   * Whether an edit was made on content older than the last cloud merge of this document.
   *
   * The caller's `sync.revision` is the one it loaded. Comparing it with the stored revision
   * alone would flag every edit after this device's own sync (which moves the revision but not
   * the content), so the comparison is with the revision whose content a cloud merge last
   * wrote. Equal revisions skip the lookup: the common, per-keystroke case.
   */
  private isStaleEdit(item: T, existing: T) {
    if (item.sync.revision === existing.sync.revision) return false;

    const mergedRevision = this.config.cloudContentRevision?.(item.id) ?? null;

    return mergedRevision !== null && item.sync.revision < mergedRevision;
  }

  /**
   * Removes the index entry first, then the body: a failed index write leaves the document
   * fully intact rather than listed without a body.
   */
  delete(id: string): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const index = this.readIndex();
    if (!index) return { ok: false, reason: "unknown" };

    const indexKey = this.indexKeyFor(id);

    if (index.items[indexKey]) {
      delete index.items[indexKey];

      const written = writeDocumentIndex(index);
      if (!written.ok) return written;
    }

    window.localStorage.removeItem(this.config.documentKey(id));
    this.removedIds.add(id);

    this.emitUpdatedEvent();

    return { ok: true };
  }

  clear(): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const index = this.readIndex();
    if (!index) return { ok: false, reason: "unknown" };

    const ids: string[] = [];

    for (const entry of Object.values(index.items)) {
      if (entry.type !== this.config.scope) continue;
      ids.push(entry.id);
      delete index.items[this.indexKeyFor(entry.id)];
    }

    const written = writeDocumentIndex(index);
    if (!written.ok) return written;

    for (const id of ids) window.localStorage.removeItem(this.config.documentKey(id));

    window.localStorage.removeItem(this.config.legacyCollectionKey);

    this.emitUpdatedEvent();

    return { ok: true };
  }
}
