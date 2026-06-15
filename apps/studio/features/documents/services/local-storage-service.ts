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
  activeIdScope?: string;
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

  private writeCollection(collection: DocumentCollection<T>): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const payload = JSON.stringify(collection);
    return safeSetLocalStorageItem(window.localStorage, this.config.collectionKey, payload);
  }

  getActiveId(): string | null {
    if (!this.isBrowser()) return null;
    return this.parseActiveId(window.localStorage.getItem(this.config.activeIdKey));
  }

  setActiveId(id: string) {
    if (!this.isBrowser()) return;
    safeSetLocalStorageItem(window.localStorage, this.config.activeIdKey, this.formatActiveId(id));
  }

  loadCollection(): DocumentCollection<T> {
    if (!this.isBrowser()) return this.config.parseCollection({});

    const raw = window.localStorage.getItem(this.config.collectionKey);
    if (!raw) return this.config.parseCollection({});

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
    } else {
      window.localStorage.removeItem(this.config.activeIdKey);
    }

    return nextId;
  }

  clear() {
    if (!this.isBrowser()) return;
    this.pendingItem = null;
    this.clearPendingSaveTimer();

    window.localStorage.removeItem(this.config.collectionKey);
    window.localStorage.removeItem(this.config.activeIdKey);

    this.emitUpdatedEvent();
  }
}
