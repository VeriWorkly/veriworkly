import type { DocumentSyncStatus } from "@veriworkly/profile-core";

import {
  safeSetLocalStorageItem,
  type LocalStorageWriteResult,
} from "./storage/safe-local-storage";
import { DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT } from "./storage-keys";

/**
 * Aliased, not declared. The projections in `@veriworkly/profile-core` build a document's
 * sync block, so the status union has to be the same one on both sides; the historical name
 * stays because several dozen call sites import it.
 */
export type SyncStatus = DocumentSyncStatus;

/**
 * Why a sync attempt did not succeed.
 *
 * `upgrade-required` (402), `forbidden` (403) and `rejected` (other 4xx) are terminal: the
 * worker stops retrying until the user syncs by hand. `deleted` means the cloud copy was
 * deleted on another device and the local copy has been removed with it; `deleted-elsewhere`
 * means it was deleted there but the local copy held unsynced edits, so it was kept, unlinked
 * and local-only.
 */
export type SyncFailureReason =
  | "conflict"
  | "auth"
  | "forbidden"
  | "not-found"
  | "network"
  | "deleted"
  | "deleted-elsewhere"
  | "upgrade-required"
  | "rejected"
  | "in-progress"
  | "storage"
  | "unknown";

export interface SyncTelemetry {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  /** Set alongside `lastErrorMessage`; cleared by the next success. */
  lastErrorReason?: SyncFailureReason | null;
}

export interface OutboxItem {
  id: string;
  scope: string | null;
  /** `failed` is a terminal server rejection; the worker skips it like `conflicted`. */
  state: "pending" | "syncing" | "conflicted" | "failed";
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
}

export const SYNC_STORAGE_KEYS = {
  OUTBOX: "veriworkly:sync-outbox",
  TELEMETRY: "veriworkly:sync-telemetry",
  OPT_OUT: "veriworkly:sync-opt-out",
  CONTENT_REVISIONS: "veriworkly:sync-content-revisions",
};

export class SyncEngine {
  private static isBrowser() {
    return typeof window !== "undefined";
  }

  private static normalizeKey(id: string, scope?: string) {
    return scope ? `${scope}:${id}` : id;
  }

  /** This tab's running sync per document, for callers outside the sync service. */
  private static runningSyncs = new Map<string, Promise<unknown>>();

  static trackSync(id: string, scope: string, run: Promise<unknown>) {
    const key = this.normalizeKey(id, scope);
    const settle = () => {
      if (this.runningSyncs.get(key) === run) this.runningSyncs.delete(key);
    };

    this.runningSyncs.set(key, run);
    run.then(settle, settle);
  }

  /**
   * Resolves once this tab's running sync of the document, if any, has finished. Its outcome
   * is the sync caller's to report; a waiter only needs the stored state it leaves behind.
   */
  static async whenSyncSettled(id: string, scope: string): Promise<void> {
    await this.runningSyncs.get(this.normalizeKey(id, scope))?.then(
      () => undefined,
      () => undefined,
    );
  }

  /**
   * Parses a raw localStorage value, self-healing (clearing the key and returning
   * `fallback`) on corrupted JSON instead of throwing. An uncaught throw here would
   * propagate out of the fire-and-forget sync worker tick and silently, permanently
   * stop syncing until the page reloads.
   */
  private static safeParse<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  private static readOutbox(): Record<string, OutboxItem> {
    if (!this.isBrowser()) return {};

    const parsed = this.safeParse<{ items?: unknown }>(SYNC_STORAGE_KEYS.OUTBOX, {});
    const items = parsed.items;
    if (!items || typeof items !== "object") return {};

    return Object.fromEntries(
      Object.entries(items as Record<string, OutboxItem>).map(([key, item]) => [
        key,
        {
          ...item,
          scope: item.scope ?? this.scopeFromKey(key),
        },
      ]),
    );
  }

  private static scopeFromKey(key: string) {
    const separatorIndex = key.indexOf(":");
    return separatorIndex > 0 ? key.slice(0, separatorIndex) : null;
  }

  static getOutbox(scope?: string): Record<string, OutboxItem> {
    const outbox = this.readOutbox();
    if (!scope) return outbox;

    return Object.fromEntries(
      Object.entries(outbox).filter(
        ([key, item]) => item.scope === scope || key === this.normalizeKey(item.id, scope),
      ),
    );
  }

  static getOutboxItem(id: string, scope?: string): OutboxItem | null {
    return this.readOutbox()[this.normalizeKey(id, scope)] ?? null;
  }

  static saveOutbox(items: Record<string, OutboxItem>): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const result = safeSetLocalStorageItem(
      localStorage,
      SYNC_STORAGE_KEYS.OUTBOX,
      JSON.stringify({ items }),
    );

    if (result.ok) window.dispatchEvent(new Event(DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT));

    return result;
  }

  static upsertOutboxItem(
    id: string,
    patch: Partial<OutboxItem> = {},
    scope?: string,
  ): LocalStorageWriteResult {
    const now = Date.now();

    const key = this.normalizeKey(id, scope);
    const outbox = this.getOutbox();

    const existing = outbox[key];

    outbox[key] = {
      id,
      scope: scope ?? existing?.scope ?? null,
      state: patch.state ?? existing?.state ?? "pending",
      attempts: patch.attempts ?? existing?.attempts ?? 0,
      nextAttemptAt: patch.nextAttemptAt ?? existing?.nextAttemptAt ?? now,
      updatedAt: now,
    };

    return this.saveOutbox(outbox);
  }

  static removeOutboxItem(id: string, scope?: string): LocalStorageWriteResult {
    const key = this.normalizeKey(id, scope);
    const outbox = this.getOutbox();

    if (!outbox[key]) return { ok: true };

    delete outbox[key];

    return this.saveOutbox(outbox);
  }

  static getTelemetry(id: string, scope?: string): SyncTelemetry {
    if (!this.isBrowser()) return this.defaultTelemetry();

    const key = this.normalizeKey(id, scope);

    return this.readTelemetry()[key] || this.defaultTelemetry();
  }

  /** Every document's telemetry, keyed by `scope:id`. */
  static getAllTelemetry(): Record<string, SyncTelemetry> {
    if (!this.isBrowser()) return {};

    return this.readTelemetry();
  }

  private static readTelemetry(): Record<string, SyncTelemetry> {
    const state = this.safeParse<{ byDocumentId?: Record<string, SyncTelemetry> }>(
      SYNC_STORAGE_KEYS.TELEMETRY,
      {},
    );

    return state.byDocumentId && typeof state.byDocumentId === "object" ? state.byDocumentId : {};
  }

  static updateTelemetry(
    id: string,
    patch: Partial<SyncTelemetry>,
    scope?: string,
  ): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const key = this.normalizeKey(id, scope);
    const byDocumentId = this.readTelemetry();

    byDocumentId[key] = {
      ...(byDocumentId[key] || this.defaultTelemetry()),
      ...patch,
    };

    return safeSetLocalStorageItem(
      localStorage,
      SYNC_STORAGE_KEYS.TELEMETRY,
      JSON.stringify({ byDocumentId }),
    );
  }

  /**
   * Documents the user chose to keep on this device only. Bulk sync toggles (settings,
   * sign-in) skip them, and storage refuses to re-enable their sync from a stale editor copy.
   */
  static isSyncOptedOut(id: string, scope?: string): boolean {
    if (!this.isBrowser()) return false;

    return this.readOptOut().includes(this.normalizeKey(id, scope));
  }

  static setSyncOptedOut(id: string, optedOut: boolean, scope?: string): LocalStorageWriteResult {
    if (!this.isBrowser()) return { ok: true };

    const key = this.normalizeKey(id, scope);
    const current = this.readOptOut();
    const has = current.includes(key);

    if (has === optedOut) return { ok: true };

    const next = optedOut ? [...current, key] : current.filter((entry) => entry !== key);

    return safeSetLocalStorageItem(
      localStorage,
      SYNC_STORAGE_KEYS.OPT_OUT,
      JSON.stringify({ items: next }),
    );
  }

  private static readOptOut(): string[] {
    const parsed = this.safeParse<{ items?: unknown }>(SYNC_STORAGE_KEYS.OPT_OUT, {});

    return Array.isArray(parsed.items)
      ? parsed.items.filter((item): item is string => typeof item === "string")
      : [];
  }

  /**
   * The revision whose content a cloud merge last wrote into local storage, per document.
   * Storage compares an editor's loaded revision against it to tell a stale editor (opened
   * before another device's version was pulled in) from one that only missed this device's
   * own sync.
   */
  static getCloudContentRevision(id: string, scope?: string): number | null {
    if (!this.isBrowser()) return null;

    const revision = this.readContentRevisions()[this.normalizeKey(id, scope)];

    return typeof revision === "number" ? revision : null;
  }

  static recordCloudContentRevisions(
    entries: Array<{ id: string; revision: number }>,
    scope?: string,
  ): LocalStorageWriteResult {
    if (!this.isBrowser() || entries.length === 0) return { ok: true };

    const revisions = this.readContentRevisions();

    for (const entry of entries) revisions[this.normalizeKey(entry.id, scope)] = entry.revision;

    return safeSetLocalStorageItem(
      localStorage,
      SYNC_STORAGE_KEYS.CONTENT_REVISIONS,
      JSON.stringify({ items: revisions }),
    );
  }

  private static readContentRevisions(): Record<string, number> {
    const parsed = this.safeParse<{ items?: unknown }>(SYNC_STORAGE_KEYS.CONTENT_REVISIONS, {});

    return parsed.items && typeof parsed.items === "object"
      ? (parsed.items as Record<string, number>)
      : {};
  }

  private static defaultTelemetry(): SyncTelemetry {
    return {
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastErrorReason: null,
    };
  }
}
