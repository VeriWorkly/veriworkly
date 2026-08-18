import type { DocumentSyncStatus } from "@veriworkly/profile-core";

/**
 * Aliased, not declared. The projections in `@veriworkly/profile-core` build a document's
 * sync block, so the status union has to be the same one on both sides; the historical name
 * stays because several dozen call sites import it.
 */
export type SyncStatus = DocumentSyncStatus;

export interface SyncTelemetry {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface OutboxItem {
  id: string;
  scope: string | null;
  state: "pending" | "syncing" | "conflicted";
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
}

const STORAGE_KEYS = {
  OUTBOX: "veriworkly:sync-outbox",
  TELEMETRY: "veriworkly:sync-telemetry",
};

export class SyncEngine {
  private static isBrowser() {
    return typeof window !== "undefined";
  }

  private static normalizeKey(id: string, scope?: string) {
    return scope ? `${scope}:${id}` : id;
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

    const parsed = this.safeParse<{ items?: unknown }>(STORAGE_KEYS.OUTBOX, {});
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

  static saveOutbox(items: Record<string, OutboxItem>) {
    if (!this.isBrowser()) return;

    localStorage.setItem(STORAGE_KEYS.OUTBOX, JSON.stringify({ items }));

    window.dispatchEvent(new Event("veriworkly:sync-outbox-updated"));
  }

  static upsertOutboxItem(id: string, patch: Partial<OutboxItem> = {}, scope?: string) {
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

    this.saveOutbox(outbox);
  }

  static removeOutboxItem(id: string, scope?: string) {
    const key = this.normalizeKey(id, scope);
    const outbox = this.getOutbox();

    delete outbox[key];

    this.saveOutbox(outbox);
  }

  static getTelemetry(id: string, scope?: string): SyncTelemetry {
    if (!this.isBrowser()) return this.defaultTelemetry();

    const key = this.normalizeKey(id, scope);
    const state = this.safeParse<{ byDocumentId?: Record<string, SyncTelemetry> }>(
      STORAGE_KEYS.TELEMETRY,
      {},
    );

    return state.byDocumentId?.[key] || this.defaultTelemetry();
  }

  static updateTelemetry(id: string, patch: Partial<SyncTelemetry>, scope?: string) {
    if (!this.isBrowser()) return;

    const key = this.normalizeKey(id, scope);
    const state = this.safeParse<{ byDocumentId: Record<string, SyncTelemetry> }>(
      STORAGE_KEYS.TELEMETRY,
      { byDocumentId: {} },
    );

    state.byDocumentId[key] = {
      ...(state.byDocumentId[key] || this.defaultTelemetry()),
      ...patch,
    };

    localStorage.setItem(STORAGE_KEYS.TELEMETRY, JSON.stringify(state));
  }

  private static defaultTelemetry(): SyncTelemetry {
    return {
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
    };
  }
}
