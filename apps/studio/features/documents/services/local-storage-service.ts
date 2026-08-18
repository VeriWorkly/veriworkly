"use client";

import {
  safeSetLocalStorageItem,
  type LocalStorageWriteResult,
} from "./storage/safe-local-storage";
import {
  DOCUMENT_INDEX_STORAGE_KEY,
  type DocumentIndexRevisionListener,
  readDocumentIndex,
  subscribeToDocumentIndexRevision,
  writeDocumentIndex,
} from "./document-index";
import {
  BaseDocumentData,
  DocumentCollection,
  DocumentIndex,
  DocumentIndexEntry,
} from "@/types/document";

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
  { ok: true; queued: boolean } | { ok: false; reason: "quota-exceeded" | "unknown" };

export interface LocalStorageConfig<T extends BaseDocumentData> {
  /** Namespace within the shared index, and the `<TYPE>` segment of document keys. */
  scope: string;
  documentKey: (id: string) => string;
  documentKeyPrefix: string;
  /** Pre-v3 single-blob key, read once to migrate then deleted. */
  legacyCollectionKey: string;
  activeIdKey: string;
  activeIdScope?: string;
  updatedEventName: string;
  parseItem: (input: unknown) => T | null;
  /** Projects a document down to what list views need. See DocumentIndexEntry. */
  toIndexEntry: (item: T) => DocumentIndexEntry;
}

export { DOCUMENT_INDEX_STORAGE_KEY };
export type { DocumentIndexEntry, DocumentIndexRevisionListener };
export { subscribeToDocumentIndexRevision };

/**
 * Per-document localStorage store with a shared metadata index.
 *
 * The important property: `persist`, `loadById`, and `patchSync` touch exactly one
 * document key plus the (small, body-free) index. None of them scale with how many
 * documents the user has. See storage-keys.ts for why v2's single-blob layout had to go.
 *
 * `loadCollection`/`saveCollection` still exist for the few callers that genuinely need
 * every body at once, but they are the slow path — prefer `listIndex()` when metadata suffices.
 */
export class LocalStorageService<T extends BaseDocumentData> {
  private migrated = false;

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

  private formatActiveId(id: string) {
    return this.config.activeIdScope ? `${this.config.activeIdScope}:${id}` : id;
  }

  private parseActiveId(value: string | null) {
    if (!value) return null;
    if (!this.config.activeIdScope) return value;

    const prefix = `${this.config.activeIdScope}:`;
    return value.startsWith(prefix) ? value.slice(prefix.length) : null;
  }

  /**
   * Splits a pre-v3 single-blob collection into per-document keys, once.
   *
   * Runs lazily on first storage access rather than at import time so it cannot
   * throw during module evaluation or run on the server. The legacy key is removed
   * only after every document has been written, so an interrupted migration
   * (quota, crash) retries cleanly on next load instead of losing documents.
   */
  private migrateLegacyCollectionIfNeeded() {
    if (this.migrated || !this.isBrowser()) return;
    this.migrated = true;

    const raw = window.localStorage.getItem(this.config.legacyCollectionKey);
    if (!raw) return;

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
      // Corrupted legacy blob: nothing recoverable inside it, so drop it rather
      // than leaving it to be re-parsed (and re-failed) on every future load.
      window.localStorage.removeItem(this.config.legacyCollectionKey);
      return;
    }

    const index = readDocumentIndex();
    let wroteEverything = true;

    for (const value of Object.values(legacyItems)) {
      const item = this.config.parseItem(value);
      if (!item) continue;

      const write = safeSetLocalStorageItem(
        window.localStorage,
        this.config.documentKey(item.id),
        JSON.stringify(item),
      );

      if (!write.ok) {
        wroteEverything = false;
        continue;
      }

      index.items[this.indexKeyFor(item.id)] = this.config.toIndexEntry(item);
    }

    if (!writeDocumentIndex(index).ok) return;
    if (wroteEverything) window.localStorage.removeItem(this.config.legacyCollectionKey);
  }

  private readIndex(): DocumentIndex {
    this.migrateLegacyCollectionIfNeeded();
    return readDocumentIndex();
  }

  private readDocument(id: string): T | null {
    if (!this.isBrowser()) return null;

    const raw = window.localStorage.getItem(this.config.documentKey(id));
    if (!raw) return null;

    try {
      return this.config.parseItem(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(this.config.documentKey(id));
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
    nextIndex.items[this.indexKeyFor(item.id)] = this.config.toIndexEntry(item);

    return writeDocumentIndex(nextIndex);
  }

  getActiveId(): string | null {
    if (!this.isBrowser()) return null;
    return this.parseActiveId(window.localStorage.getItem(this.config.activeIdKey));
  }

  setActiveId(id: string) {
    if (!this.isBrowser()) return;
    safeSetLocalStorageItem(window.localStorage, this.config.activeIdKey, this.formatActiveId(id));
  }

  /**
   * Metadata for every document in this scope, newest first. O(1) in document size —
   * this reads the index only and never touches a document body.
   */
  listIndex(): DocumentIndexEntry[] {
    const index = this.readIndex();

    return Object.values(index.items)
      .filter((entry) => entry.type === this.config.scope)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Monotonic counter for cache keys; changes whenever anything in storage changes. */
  getRevision(): number {
    return this.readIndex().revision;
  }

  /**
   * Loads every document body in this scope. The slow path — O(library size).
   * Only for callers that truly need all content; use {@link listIndex} otherwise.
   */
  loadCollection(): DocumentCollection<T> {
    const items: Record<string, T> = {};

    for (const entry of this.listIndex()) {
      const item = this.readDocument(entry.id);
      if (item) items[entry.id] = item;
    }

    return { version: 3, items };
  }

  saveCollection(collection: DocumentCollection<T>): LocalStorageWriteResult {
    return this.persistMany(Object.values(collection.items));
  }

  /**
   * Writes several documents against a single index read/write, so merging a cloud
   * hydration of N documents costs one index round trip rather than N.
   */
  persistMany(items: T[]): LocalStorageWriteResult {
    if (!this.isBrowser() || items.length === 0) return { ok: true };

    const index = this.readIndex();

    for (const item of items) {
      const write = safeSetLocalStorageItem(
        window.localStorage,
        this.config.documentKey(item.id),
        JSON.stringify(item),
      );

      if (!write.ok) return write;

      index.items[this.indexKeyFor(item.id)] = this.config.toIndexEntry(item);
    }

    const result = writeDocumentIndex(index);
    if (result.ok) this.emitUpdatedEvent();

    return result;
  }

  loadActive(): T | null {
    const activeId = this.getActiveId();
    if (activeId) {
      const active = this.readDocument(activeId);
      if (active) return active;
    }

    const first = this.listIndex()[0];
    if (!first) return null;

    const item = this.readDocument(first.id);
    if (item) this.setActiveId(item.id);

    return item;
  }

  loadById(id: string): T | null {
    this.migrateLegacyCollectionIfNeeded();
    return this.readDocument(id);
  }

  list(): T[] {
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

    const existing = this.loadById(id);
    if (!existing) return { ok: false, reason: "unknown" };

    const toPersist: T = {
      ...existing,
      sync: { ...existing.sync, ...syncPatch },
    };

    const saveResult = this.writeDocument(toPersist);
    if (!saveResult.ok) return { ok: false, reason: saveResult.reason };

    this.emitUpdatedEvent();

    return { ok: true, queued: false };
  }

  persist(item: T): SaveDocumentResult {
    if (!this.isBrowser()) return { ok: true, queued: false };

    const normalized = this.config.parseItem(item);
    if (!normalized) return { ok: false, reason: "unknown" };

    const existing = this.readDocument(normalized.id);
    const shouldMarkPending =
      normalized.sync.enabled && this.hasPayloadChanged(existing, normalized);

    const toPersist: T = shouldMarkPending
      ? {
          ...normalized,
          sync: {
            ...normalized.sync,
            status: "pending",
            lastSyncedAt: existing?.sync.lastSyncedAt ?? normalized.sync.lastSyncedAt,
          },
        }
      : normalized;

    const saveResult = this.writeDocument(toPersist);

    if (!saveResult.ok) return { ok: false, reason: saveResult.reason };

    this.emitUpdatedEvent();
    this.setActiveId(toPersist.id);

    return { ok: true, queued: false };
  }

  /*
   * Removed: `save()`/`flush()` and the `pendingItem` debounce they drove.
   *
   * A second, unused copy of the debounce that `document-workspace-service.saveDocument`
   * implements — and it had the same defect that one did: the deferred `flush()` result was
   * discarded, so a quota failure on the real write was invisible to the caller. Every
   * writer goes through `saveDocument`, which reports the deferred result via `onFlush`.
   * This existed only for someone to wire an editor to it and silently lose edits again.
   */

  delete(id: string): string | null {
    if (!this.isBrowser()) return null;

    const index = this.readIndex();
    const indexKey = this.indexKeyFor(id);

    if (!index.items[indexKey]) return this.getActiveId();

    delete index.items[indexKey];
    window.localStorage.removeItem(this.config.documentKey(id));

    if (!writeDocumentIndex(index).ok) return this.getActiveId();

    this.emitUpdatedEvent();

    const nextId = this.listIndex()[0]?.id ?? null;

    if (nextId) {
      this.setActiveId(nextId);
    } else {
      window.localStorage.removeItem(this.config.activeIdKey);
    }

    return nextId;
  }

  clear() {
    if (!this.isBrowser()) return;

    const index = this.readIndex();

    for (const entry of Object.values(index.items)) {
      if (entry.type !== this.config.scope) continue;
      window.localStorage.removeItem(this.config.documentKey(entry.id));
      delete index.items[this.indexKeyFor(entry.id)];
    }

    writeDocumentIndex(index);
    window.localStorage.removeItem(this.config.legacyCollectionKey);
    window.localStorage.removeItem(this.config.activeIdKey);

    this.emitUpdatedEvent();
  }
}
