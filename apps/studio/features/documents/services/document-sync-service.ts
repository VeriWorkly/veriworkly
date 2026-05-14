"use client";

import { DocumentApi, type CloudDocument, type DocumentType } from "./document-api";
import { SyncEngine, type SyncStatus } from "./sync-engine";
import { LocalStorageService } from "./local-storage-service";
import { BaseDocumentData } from "@/types/document";

export type SyncResult = {
  ok: boolean;
  message: string;
  reason?: "conflict" | "auth" | "forbidden" | "not-found" | "network" | "unknown";
};

export interface SyncNowOptions {
  force?: boolean;
}

export interface SyncWorkerOptions {
  enabled: boolean;
  idleDelayMs?: number;
}

export interface HydrateOptions {
  force?: boolean;
  minIntervalMs?: number;
}

export interface DocumentSyncConfig<T extends BaseDocumentData> {
  documentType: DocumentType;
  localStorage: LocalStorageService<T>;
  updatedEventName: string;
  parseItem: (input: unknown) => T | null;
  getDocumentTitle: (item: T) => string;
}

export class DocumentSyncService<T extends BaseDocumentData> {
  private workerTickTimer: number | null = null;
  private workerEnabled = false;
  private listenersAttached = false;
  private workerTickInFlight = false;
  private workerIdleDelayMs = 12_000;
  private cloudHydrateMetaKey: string;

  private readonly DEFAULT_MIN_HYDRATE_INTERVAL_MS = 2 * 60 * 1000;

  constructor(private config: DocumentSyncConfig<T>) {
    this.cloudHydrateMetaKey = `veriworkly:cloud-hydrate-meta:${config.documentType.toLowerCase()}`;
  }

  private isBrowser() {
    return typeof window !== "undefined";
  }

  private toTimestamp(value: string | null | undefined) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // --- Sync Worker Logic ---

  private scheduleWorkerTick(delayMs: number) {
    if (!this.isBrowser()) return;
    if (this.workerTickTimer !== null) {
      window.clearTimeout(this.workerTickTimer);
    }
    this.workerTickTimer = window.setTimeout(
      () => {
        this.workerTickTimer = null;
        void this.runWorkerTick();
      },
      Math.max(0, delayMs),
    );
  }

  private getNextDueOutboxItem() {
    const now = Date.now();
    const outbox = SyncEngine.getOutbox();
    const items = Object.values(outbox)
      .filter((item) => item.state !== "conflicted")
      .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt);

    if (items.length === 0) return null;
    const first = items[0];
    return {
      item: first,
      delayMs: Math.max(0, first.nextAttemptAt - now),
    };
  }

  private async runWorkerTick() {
    if (!this.workerEnabled || this.workerTickInFlight) return;
    const due = this.getNextDueOutboxItem();
    if (!due) return;

    if (due.delayMs > 0) {
      this.scheduleWorkerTick(due.delayMs);
      return;
    }

    this.workerTickInFlight = true;
    try {
      const item = this.config.localStorage.loadById(due.item.id);
      if (item && item.sync.enabled) {
        await this.syncNow(due.item.id);
      } else {
        SyncEngine.removeOutboxItem(due.item.id);
      }
    } finally {
      this.workerTickInFlight = false;
      const nextDue = this.getNextDueOutboxItem();
      if (this.workerEnabled && nextDue) this.scheduleWorkerTick(nextDue.delayMs);
    }
  }

  private attachWorkerListeners() {
    if (!this.isBrowser() || this.listenersAttached) return;
    const requeueAndRun = () => {
      if (!this.workerEnabled) return;
      this.queuePendingForSync();
      const nextDue = this.getNextDueOutboxItem();
      if (nextDue) this.scheduleWorkerTick(nextDue.delayMs);
    };

    window.addEventListener(this.config.updatedEventName, requeueAndRun);
    window.addEventListener("online", requeueAndRun);
    window.addEventListener("focus", requeueAndRun);
    window.addEventListener("visibilitychange", requeueAndRun);
    this.listenersAttached = true;
  }

  private queuePendingForSync() {
    const collection = this.config.localStorage.loadCollection();
    const pending = Object.values(collection.items).filter(
      (item) => item.sync.enabled && item.sync.status === "pending",
    );
    for (const item of pending) {
      SyncEngine.upsertOutboxItem(item.id);
    }
  }

  startWorker(options: SyncWorkerOptions) {
    this.workerEnabled = options.enabled;
    this.workerIdleDelayMs = Math.max(2_000, options.idleDelayMs ?? 12_000);
    this.attachWorkerListeners();

    if (this.workerEnabled) {
      this.queuePendingForSync();
      const nextDue = this.getNextDueOutboxItem();
      if (nextDue) this.scheduleWorkerTick(nextDue.delayMs);
    }
  }

  async syncAllPending() {
    const collection = this.config.localStorage.loadCollection();
    const pending = Object.values(collection.items).filter(
      (item) => item.sync.enabled && item.sync.status === "pending",
    );

    const results = await Promise.all(pending.map((item) => this.syncNow(item.id)));
    return results;
  }

  // --- Sync Actions ---

  async syncNow(id: string): Promise<SyncResult> {
    const item = this.config.localStorage.loadById(id);
    if (!item) return { ok: false, message: "Document not found locally.", reason: "not-found" };

    this.setLocalSyncState(id, "syncing");
    SyncEngine.updateTelemetry(id, { lastAttemptAt: new Date().toISOString() });
    SyncEngine.upsertOutboxItem(id, { state: "syncing" });

    try {
      const isNew = !item.sync.cloudDocumentId;
      let cloud: CloudDocument;

      if (isNew) {
        cloud = await DocumentApi.create({
          id: item.id,
          type: this.config.documentType,
          title: this.config.getDocumentTitle(item),
          content: item,
          templateId: item.templateId,
        });
      } else {
        cloud = await DocumentApi.update(item.id, {
          title: this.config.getDocumentTitle(item),
          content: item,
          templateId: item.templateId,
          revision: item.sync.revision,
        });
      }

      const updated = this.applyCloudSyncMetadata(item, cloud);
      this.config.localStorage.persist(updated);
      SyncEngine.removeOutboxItem(id);
      SyncEngine.updateTelemetry(id, { lastSuccessAt: new Date().toISOString() });

      return { ok: true, message: "Document synced successfully." };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isConflict = message.includes("Conflict");
      this.setLocalSyncState(id, isConflict ? "conflicted" : "pending");

      SyncEngine.upsertOutboxItem(id, {
        state: isConflict ? "conflicted" : "pending",
        nextAttemptAt: Date.now() + (isConflict ? 60000 : this.workerIdleDelayMs),
      });

      SyncEngine.updateTelemetry(id, {
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: message,
      });

      return {
        ok: false,
        message: message,
        reason: isConflict ? "conflict" : "network",
      };
    }
  }

  private setLocalSyncState(id: string, status: SyncStatus) {
    const item = this.config.localStorage.loadById(id);
    if (!item) return;
    this.config.localStorage.persist({
      ...item,
      sync: { ...item.sync, status },
    });
  }

  private applyCloudSyncMetadata(item: T, record: CloudDocument): T {
    return {
      ...item,
      sync: {
        ...item.sync,
        enabled: true,
        status: "synced",
        cloudDocumentId: record.id,
        lastSyncedAt: record.lastSyncedAt ?? record.updatedAt,
        revision: record.revision,
      },
    } as T;
  }

  // --- Hydration / Merging ---

  async hydrateById(id: string): Promise<SyncResult> {
    try {
      const record = await DocumentApi.get(id);
      const merged = this.mergeCloudDocumentsIntoLocalStorage([record]);
      return merged.ok
        ? { ok: true, message: "Cloud document loaded successfully." }
        : { ok: false, message: "Unable to merge the cloud document." };
    } catch (error: unknown) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  async hydrate(options?: HydrateOptions): Promise<SyncResult> {
    if (!this.shouldHydrate(options)) {
      return { ok: true, message: "Fresh enough." };
    }

    try {
      const records = await DocumentApi.list(this.config.documentType);
      const merged = this.mergeCloudDocumentsIntoLocalStorage(records);

      this.setLastHydrateMeta({
        lastHydratedAt: Date.now(),
        lastServerCursor: new Date().toISOString(),
      });

      return merged.ok
        ? { ok: true, message: `Merged ${merged.mergedCount} documents.` }
        : { ok: false, message: "Merge failed." };
    } catch (error: unknown) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  private mergeCloudDocumentsIntoLocalStorage(records: CloudDocument[]) {
    let mergedCount = 0;
    const collection = this.config.localStorage.loadCollection();

    for (const record of records) {
      const cloudItem = this.config.parseItem(record.content);
      if (!cloudItem) continue;

      const localItem = collection.items[cloudItem.id];
      const localUpdatedAt = this.toTimestamp(localItem?.updatedAt);
      const cloudUpdatedAt = this.toTimestamp(record.updatedAt);

      if (!localItem || cloudUpdatedAt > localUpdatedAt) {
        collection.items[cloudItem.id] = this.applyCloudSyncMetadata(cloudItem, record);
        mergedCount += 1;
      }
    }

    if (mergedCount > 0) {
      this.config.localStorage.saveCollection(collection);
      if (this.isBrowser()) window.dispatchEvent(new Event("storage"));
    }

    return { ok: true, mergedCount };
  }

  // --- Lifecycle Actions ---

  keepLocalOnly(id: string): SyncResult {
    const item = this.config.localStorage.loadById(id);
    if (!item) return { ok: false, message: "Document not found.", reason: "not-found" };
    this.config.localStorage.persist({
      ...item,
      sync: {
        ...item.sync,
        enabled: false,
        status: "local-only",
        cloudDocumentId: null,
        revision: 1,
      },
    } as T);
    SyncEngine.removeOutboxItem(id);
    return { ok: true, message: "Sync disabled for this document." };
  }

  async resolveConflictUseLocal(id: string) {
    return this.syncNow(id);
  }

  async resolveConflictUseCloud(id: string) {
    const result = await this.hydrateById(id);
    if (result.ok) SyncEngine.removeOutboxItem(id);
    return result;
  }

  // --- Internal Helpers ---

  private getHydrateMeta() {
    if (!this.isBrowser()) return { lastHydratedAt: 0 };
    const raw = localStorage.getItem(this.cloudHydrateMetaKey);
    return raw ? JSON.parse(raw) : { lastHydratedAt: 0 };
  }

  private setLastHydrateMeta(meta: { lastHydratedAt: number; lastServerCursor: string }) {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.cloudHydrateMetaKey, JSON.stringify(meta));
  }

  private shouldHydrate(options?: HydrateOptions) {
    if (options?.force) return true;
    const minInterval = options?.minIntervalMs ?? this.DEFAULT_MIN_HYDRATE_INTERVAL_MS;
    return Date.now() - this.getHydrateMeta().lastHydratedAt >= minInterval;
  }
}
