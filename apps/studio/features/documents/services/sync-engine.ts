export type SyncStatus = "local-only" | "pending" | "syncing" | "synced" | "conflicted";

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

  private static readOutbox(): Record<string, OutboxItem> {
    if (!this.isBrowser()) return {};

    const raw = localStorage.getItem(STORAGE_KEYS.OUTBOX);

    const items = raw ? JSON.parse(raw).items : {};
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
    const raw = localStorage.getItem(STORAGE_KEYS.TELEMETRY);
    const state = raw ? JSON.parse(raw).byDocumentId : {};

    return state[key] || this.defaultTelemetry();
  }

  static updateTelemetry(id: string, patch: Partial<SyncTelemetry>, scope?: string) {
    if (!this.isBrowser()) return;

    const key = this.normalizeKey(id, scope);
    const raw = localStorage.getItem(STORAGE_KEYS.TELEMETRY);
    const state = raw ? JSON.parse(raw) : { byDocumentId: {} };

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
