"use client";

import {
  safeSetLocalStorageItem,
  type LocalStorageWriteResult,
} from "./storage/safe-local-storage";
import { BaseDocumentData, DocumentCollection } from "@/types/document";

export interface SaveDocumentOptions {
  debounceMs?: number;
  flush?: boolean;
}

export type SaveDocumentResult =
  | { ok: true; queued: boolean }
  | { ok: false; reason: "quota-exceeded" | "unknown" };

export interface LocalStorageConfig<T extends BaseDocumentData> {
  collectionKey: string;
  activeIdKey: string;
  legacyKey?: string;
  updatedEventName: string;
  parseItem: (input: unknown) => T | null;
  parseCollection: (input: unknown) => DocumentCollection<T>;
}

export class LocalStorageService<T extends BaseDocumentData> {
  private pendingItem: T | null = null;
  private pendingSaveTimer: number | null = null;

  constructor(private config: LocalStorageConfig<T>) {}

  private isBrowser() {
    return typeof window !== "undefined";
  }

  private emitUpdatedEvent() {
    if (!this.isBrowser()) return;
    window.dispatchEvent(new Event(this.config.updatedEventName));
  }

  private clearPendingSaveTimer() {
    if (this.pendingSaveTimer === null || !this.isBrowser()) return;
    window.clearTimeout(this.pendingSaveTimer);
    this.pendingSaveTimer = null;
  }

  private toComparablePayload(item: T | null | undefined) {
    if (!item) return null;
    const { updatedAt, sync, ...payload } = item;
    void updatedAt;
    void sync;
    return payload;
  }

  private hasPayloadChanged(previous: T | null | undefined, next: T) {
    const previousPayload = this.toComparablePayload(previous);
    const nextPayload = this.toComparablePayload(next);
    return JSON.stringify(previousPayload) !== JSON.stringify(nextPayload);
  }

  private writeCollection(collection: DocumentCollection<T>): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const payload = JSON.stringify(collection);
    const result = safeSetLocalStorageItem(window.localStorage, this.config.collectionKey, payload);

    if (!result.ok && result.reason === "quota-exceeded" && this.config.legacyKey) {
      window.localStorage.removeItem(this.config.legacyKey);
      return safeSetLocalStorageItem(window.localStorage, this.config.collectionKey, payload);
    }

    return result;
  }

  getActiveId(): string | null {
    if (!this.isBrowser()) return null;
    return window.localStorage.getItem(this.config.activeIdKey);
  }

  setActiveId(id: string) {
    if (!this.isBrowser()) return;
    safeSetLocalStorageItem(window.localStorage, this.config.activeIdKey, id);
  }

  loadCollection(): DocumentCollection<T> {
    if (!this.isBrowser()) return this.config.parseCollection({});

    const raw = window.localStorage.getItem(this.config.collectionKey);
    if (!raw) {
      const legacy = this.loadLegacy();
      if (!legacy) return this.config.parseCollection({});

      const migrated = this.config.parseCollection({
        version: 1,
        items: { [legacy.id]: legacy },
      });
      this.saveCollection(migrated);
      this.setActiveId(legacy.id);
      return migrated;
    }

    try {
      return this.config.parseCollection(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(this.config.collectionKey);
      return this.config.parseCollection({});
    }
  }

  saveCollection(collection: DocumentCollection<T>): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };
    const result = this.writeCollection(collection);
    if (result.ok) this.emitUpdatedEvent();
    return result;
  }

  loadLegacy(): T | null {
    if (!this.isBrowser() || !this.config.legacyKey) return null;
    const raw = window.localStorage.getItem(this.config.legacyKey);
    if (!raw) return null;
    try {
      return this.config.parseItem(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(this.config.legacyKey);
      return null;
    }
  }

  loadActive(): T | null {
    const collection = this.loadCollection();
    const activeId = this.getActiveId();
    if (activeId && collection.items[activeId]) return collection.items[activeId];

    const first = Object.values(collection.items)[0] ?? null;
    if (first) this.setActiveId(first.id);
    return first;
  }

  loadById(id: string): T | null {
    const collection = this.loadCollection();
    return collection.items[id] ?? null;
  }

  list(): T[] {
    const collection = this.loadCollection();
    return Object.values(collection.items).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  persist(item: T): SaveDocumentResult {
    if (!this.isBrowser()) return { ok: true, queued: false };

    const normalized = this.config.parseItem(item);
    if (!normalized) return { ok: false, reason: "unknown" };

    const collection = this.loadCollection();
    const existing = collection.items[normalized.id];
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

    collection.items[toPersist.id] = toPersist;
    const saveResult = this.saveCollection(collection);

    if (!saveResult.ok) return { ok: false, reason: saveResult.reason };

    this.setActiveId(toPersist.id);

    if (this.config.legacyKey) {
      safeSetLocalStorageItem(
        window.localStorage,
        this.config.legacyKey,
        JSON.stringify(toPersist),
      );
    }

    return { ok: true, queued: false };
  }

  save(item: T, options?: SaveDocumentOptions): SaveDocumentResult {
    if (!this.isBrowser()) return { ok: true, queued: false };

    const normalized = this.config.parseItem(item);
    if (!normalized) return { ok: false, reason: "unknown" };

    if (options?.flush) {
      this.pendingItem = null;
      return this.persist(normalized);
    }

    const debounceMs = Math.max(0, options?.debounceMs ?? 0);
    if (debounceMs > 0) {
      this.pendingItem = normalized;
      this.clearPendingSaveTimer();
      this.pendingSaveTimer = window.setTimeout(() => {
        this.flush();
      }, debounceMs);
      return { ok: true, queued: true };
    }

    return this.persist(normalized);
  }

  flush(): SaveDocumentResult {
    this.clearPendingSaveTimer();
    if (!this.pendingItem) return { ok: true, queued: false };
    const toSave = this.pendingItem;
    this.pendingItem = null;
    return this.persist(toSave);
  }

  delete(id: string): string | null {
    if (!this.isBrowser()) return null;

    const collection = this.loadCollection();
    if (!collection.items[id]) return this.getActiveId();

    delete collection.items[id];
    const saveResult = this.saveCollection(collection);
    if (!saveResult.ok) return this.getActiveId();

    this.emitUpdatedEvent();

    const remainingIds = Object.keys(collection.items);
    const nextId = remainingIds[0] ?? null;

    if (nextId) {
      this.setActiveId(nextId);
      if (this.config.legacyKey) {
        safeSetLocalStorageItem(
          window.localStorage,
          this.config.legacyKey,
          JSON.stringify(collection.items[nextId]),
        );
      }
    } else {
      window.localStorage.removeItem(this.config.activeIdKey);
      if (this.config.legacyKey) window.localStorage.removeItem(this.config.legacyKey);
    }

    return nextId;
  }

  clear() {
    if (!this.isBrowser()) return;
    this.pendingItem = null;
    this.clearPendingSaveTimer();

    window.localStorage.removeItem(this.config.collectionKey);
    window.localStorage.removeItem(this.config.activeIdKey);
    if (this.config.legacyKey) window.localStorage.removeItem(this.config.legacyKey);

    this.emitUpdatedEvent();
  }
}
