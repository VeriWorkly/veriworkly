"use client";

import { BaseDocumentData } from "@/types/document";
import { SyncEngine, type SyncFailureReason, type SyncStatus } from "./sync-engine";
import {
  DocumentApi,
  DocumentApiError,
  DOCUMENT_PAGE_SIZE_WITH_CONTENT,
  createPageGuard,
  isDocumentApiError,
  type CloudDocument,
  type CloudDocumentSummary,
  type DocumentType,
} from "./document-api";
import { LocalStorageService, type SaveDocumentResult } from "./local-storage-service";
import { safeSetLocalStorageItem } from "./storage/safe-local-storage";
import { DOCUMENT_REMOTE_DELETION_EVENT, type RemoteDeletionDetail } from "./storage-keys";
import { getWorkspaceEpoch } from "./workspace-epoch";
import { entriesOfOtherAccounts, getWorkspaceViewer } from "./workspace-viewer";

/**
 * Max concurrent document syncs. Browsers allow ~6 connections per host, so going
 * wider just queues requests until they time out while holding every document in the
 * "syncing" state.
 */
const SYNC_CONCURRENCY = 4;

/** Ceiling for the retry backoff, so a long outage still retries a few times an hour. */
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

/**
 * An outbox item left in `syncing` this long is treated as abandoned (its tab closed
 * mid-request) and becomes due again.
 */
const STALE_SYNCING_MS = 2 * 60 * 1000;
/** How long a check that the session is still this tab's account covers the next uploads. */
const SESSION_CONFIRM_MAX_AGE_MS = 30 * 1000;
/** After a check that failed or found another account, when the worker asks again. */
const SESSION_RECHECK_MS = 30 * 1000;

export type SyncResult = {
  ok: boolean;
  message: string;
  reason?: SyncFailureReason;
};

export interface SyncNowOptions {
  /** Also move the public share-link slug to the new title (rename). */
  updateShareSlug?: boolean;
}

export interface SyncWorkerOptions {
  enabled: boolean;
  idleDelayMs?: number;
}

export interface HydrateOptions {
  force?: boolean;
  minIntervalMs?: number;
  /** Told the account's live document count of this type, when the server's first page says it. */
  onTotal?: (total: number) => void;
}

/** Where a failed pull stopped: the page cursor of a walk from `updatedSince` (null: a full one). */
interface ResumePoint {
  updatedSince: string | null;
  cursor: string;
}

interface HydrateMeta {
  lastHydratedAt: number;
  lastServerCursor?: string;
  resume?: ResumePoint;
}

function isResumePoint(value: unknown): value is ResumePoint {
  if (typeof value !== "object" || value === null) return false;
  const { updatedSince, cursor } = value as Partial<ResumePoint>;

  return (
    typeof cursor === "string" &&
    cursor.length > 0 &&
    (updatedSince === null || typeof updatedSince === "string")
  );
}

export interface DocumentSyncConfig<T extends BaseDocumentData> {
  documentType: DocumentType;
  localStorage: LocalStorageService<T>;
  updatedEventName: string;
  parseItem: (input: unknown) => T | null;
  getDocumentTitle: (item: T) => string;
  /**
   * Removes a document from this device the way a library delete does (pending autosave
   * included). Called when the server says the cloud copy was deleted on another device.
   */
  removeLocal: (id: string) => void;
  /** Persists a pending debounced save for `id` now, so a cleanliness check sees it. */
  flushPendingEdits: (id: string) => void;
  /**
   * Moves a document to a fresh id (unlinked, pending), for an id the server refuses because
   * it was deleted in the cloud. Returns the moved document, or null when it could not be saved.
   */
  rekeyLocal: (id: string) => T | null;
  /**
   * False while this device's documents are not confirmed as the signed-in account's (see
   * workspace-owner.ts): nothing is uploaded or pulled until the user has chosen. Default true.
   */
  canReachCloud?: () => boolean;
  /**
   * Resolves false when the browser's session is no longer this tab's account. Asked when a tab
   * comes back into focus and before each worker upload: the tab may have sat behind a sign-in
   * as someone else. `maxAgeMs` allows reusing an answer that recent.
   */
  confirmSessionIsViewer?: (options?: { maxAgeMs?: number }) => Promise<boolean>;
}

type SyncFailure =
  | { kind: "deleted" }
  | { kind: "conflict"; message: string }
  | { kind: "terminal"; reason: SyncFailureReason; message: string }
  | { kind: "retry"; reason: SyncFailureReason; message: string };

type RetainedFailure = Exclude<SyncFailure, { kind: "deleted" }>;

const DELETED_ELSEWHERE_MESSAGE =
  "This document was deleted on another device, so it was removed here too.";

const KEPT_AFTER_REMOTE_DELETE_MESSAGE =
  "This document was deleted on another device. It had changes the cloud never received, so it was kept here as a local-only copy.";

const REKEYED_MESSAGE =
  "The cloud copy of this document had been deleted, so it is being backed up again as a new document.";

/** A reply that arrived after this device's workspace was cleared; nothing was written. */
const WORKSPACE_CLEARED_RESULT: SyncResult = {
  ok: false,
  reason: "unknown",
  message: "This device was signed out while the sync ran, so its result was dropped.",
};

/** In place of the server's "Revision mismatch. Client: 3, Server: 4". */
const CONFLICT_MESSAGE = "This document changed on another device. Choose which version to keep.";

const AWAITING_OWNER_MESSAGE =
  "Choose what happens to the documents already on this device before they sync with your account.";

/** For a document another account left on this device; nothing about it was sent or changed. */
const ANOTHER_ACCOUNT_RESULT: SyncResult = {
  ok: false,
  reason: "not-found",
  message: "Document not found.",
};

function hasDeletedAt(details: unknown) {
  return (
    typeof details === "object" &&
    details !== null &&
    typeof (details as { deletedAt?: unknown }).deletedAt === "string"
  );
}

/**
 * Maps a failed create/update onto what the worker does next. Decided on the status and the
 * structured details, never on message text.
 */
function classifySyncFailure(error: unknown, phase: "create" | "update"): SyncFailure {
  if (!(error instanceof DocumentApiError)) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "retry", reason: "network", message: message || "Network error." };
  }

  const { status, message, details } = error;

  if (status === 409 && hasDeletedAt(details)) return { kind: "deleted" };
  if (status === 404 && phase === "update") return { kind: "deleted" };
  if (status === 409 && phase === "update") return { kind: "conflict", message: CONFLICT_MESSAGE };
  if (status === 401) return { kind: "retry", reason: "auth", message };
  if (status === 408 || status === 429 || status >= 500) {
    return { kind: "retry", reason: "network", message };
  }
  if (status === 402) return { kind: "terminal", reason: "upgrade-required", message };
  if (status === 403) return { kind: "terminal", reason: "forbidden", message };

  return { kind: "terminal", reason: "rejected", message };
}

export class DocumentSyncService<T extends BaseDocumentData> {
  private workerTickTimer: number | null = null;
  private workerEnabled = false;
  private listenersAttached = false;
  private workerTickInFlight = false;
  private workerIdleDelayMs = 12_000;
  private cloudHydrateMetaKey: string;

  /** One sync per document in this tab; a second caller shares the first one's result. */
  private inFlight = new Map<string, Promise<SyncResult>>();

  /** The pull walking the cloud now, and the workspace it is writing into. */
  private pullInFlight: {
    epoch: number;
    viewer: string | null;
    promise: Promise<SyncResult>;
  } | null = null;

  private readonly DEFAULT_MIN_HYDRATE_INTERVAL_MS = 2 * 60 * 1000;

  constructor(private config: DocumentSyncConfig<T>) {
    this.cloudHydrateMetaKey = `veriworkly:cloud-hydrate-meta:${config.documentType.toLowerCase()}`;
  }

  private isBrowser() {
    return typeof window !== "undefined";
  }

  private get type() {
    return this.config.documentType;
  }

  private sessionIsViewer() {
    return this.config.confirmSessionIsViewer?.({ maxAgeMs: SESSION_CONFIRM_MAX_AGE_MS }) ?? true;
  }

  private canReachCloud() {
    return this.config.canReachCloud?.() ?? true;
  }

  /**
   * Ids of this type's documents that another account left on this device (S-372). Every path
   * that uploads, pulls, deletes in the cloud or bulk-toggles sync skips them: they stay as that
   * account left them, its outbox items included, until it signs in again.
   */
  private otherAccountsIds(): Set<string> {
    return new Set(
      entriesOfOtherAccounts(this.config.localStorage.listIndex()).map((entry) => entry.id),
    );
  }

  private scheduleWorkerTick(delayMs: number) {
    if (!this.isBrowser()) return;

    if (this.workerTickTimer !== null) window.clearTimeout(this.workerTickTimer);

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

    const outbox = SyncEngine.getOutbox(this.type);
    const othersIds = this.otherAccountsIds();
    const items = Object.values(outbox)
      .filter(
        (item) =>
          !othersIds.has(item.id) &&
          (item.state === "pending" ||
            (item.state === "syncing" && now - item.updatedAt > STALE_SYNCING_MS)),
      )
      .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt);

    if (items.length === 0) return null;

    const first = items[0];

    return {
      item: first,
      delayMs: Math.max(0, first.nextAttemptAt - now),
    };
  }

  private async runWorkerTick() {
    // Not rescheduled while the device's documents await their owner's answer: the sign-in
    // that settles it restarts the workers.
    if (!this.workerEnabled || this.workerTickInFlight || !this.canReachCloud()) return;

    let sessionRefused = false;

    try {
      const due = this.getNextDueOutboxItem();

      if (!due) return;

      if (due.delayMs > 0) {
        this.scheduleWorkerTick(due.delayMs);
        return;
      }

      this.workerTickInFlight = true;

      // The upload carries whatever session cookie the browser holds now (S-320 (b)).
      if (!(await this.sessionIsViewer())) {
        sessionRefused = true;
        return;
      }

      const item = this.config.localStorage.loadById(due.item.id);

      if (item && item.sync.enabled) {
        await this.syncNow(due.item.id);
      } else {
        SyncEngine.removeOutboxItem(due.item.id, this.type);
      }
    } catch (error) {
      console.error(`Document sync worker (${this.type}) failed`, error);
    } finally {
      this.workerTickInFlight = false;

      try {
        const nextDue = this.getNextDueOutboxItem();
        // An unconfirmed session is asked again later, not in a loop.
        if (this.workerEnabled && nextDue) {
          this.scheduleWorkerTick(
            sessionRefused ? Math.max(nextDue.delayMs, SESSION_RECHECK_MS) : nextDue.delayMs,
          );
        }
      } catch (error) {
        console.error(`Document sync worker (${this.type}) could not reschedule`, error);
      }
    }
  }

  private attachWorkerListeners() {
    if (!this.isBrowser() || this.listenersAttached) return;

    const requeueAndRun = (event: Event) => {
      if (!this.workerEnabled) return;

      try {
        const isManualSave = event.type === this.config.updatedEventName;
        this.queuePendingForSync(isManualSave);

        const nextDue = this.getNextDueOutboxItem();

        if (nextDue) this.scheduleWorkerTick(nextDue.delayMs);
      } catch (error) {
        console.error(`Document sync worker (${this.type}) could not queue changes`, error);
      }
    };

    const confirmThenRun = (event: Event) => {
      if (!this.workerEnabled) return;
      // `visibilitychange` fires going away too; only coming back is a reason to ask.
      if (event.type === "visibilitychange" && document.visibilityState === "hidden") return;

      const confirm = this.config.confirmSessionIsViewer;
      if (!confirm) return requeueAndRun(event);

      void confirm().then((confirmed) => {
        if (confirmed) requeueAndRun(event);
      });
    };

    window.addEventListener(this.config.updatedEventName, requeueAndRun);
    window.addEventListener("online", requeueAndRun);
    window.addEventListener("focus", confirmThenRun);
    window.addEventListener("visibilitychange", confirmThenRun);

    this.listenersAttached = true;
  }

  /**
   * Ids of documents waiting to sync.
   *
   * Reads the storage index, not document bodies: `sync.enabled`/`sync.status` are both
   * mirrored there. This runs on every storage-updated event (i.e. on every autosave),
   * so loading and re-validating the whole library here was a per-keystroke cost.
   */
  private listPendingIds(): string[] {
    const othersIds = this.otherAccountsIds();

    return this.config.localStorage
      .listIndex()
      .filter(
        (entry) =>
          entry.sync.enabled && entry.sync.status === "pending" && !othersIds.has(entry.id),
      )
      .map((entry) => entry.id);
  }

  /**
   * Puts every pending document in the outbox. An edit makes a fresh item due now, but never
   * pulls a retrying item's backoff forward and never revives a terminal failure: autosave
   * runs per keystroke, and either would turn a failing sync into a request per keystroke.
   */
  private queuePendingForSync(forceImmediate = false) {
    const outbox = SyncEngine.getOutbox(this.type);
    const now = Date.now();

    for (const id of this.listPendingIds()) {
      const existing = outbox[`${this.type}:${id}`];

      if (!existing) {
        SyncEngine.upsertOutboxItem(id, { state: "pending", nextAttemptAt: now }, this.type);
      } else if (existing.state === "conflicted") {
        // The index says pending, so the conflict was resolved; the outbox follows the index.
        SyncEngine.upsertOutboxItem(
          id,
          { state: "pending", attempts: 0, nextAttemptAt: now },
          this.type,
        );
      } else if (forceImmediate && existing.state === "pending" && existing.attempts === 0) {
        SyncEngine.upsertOutboxItem(id, { nextAttemptAt: now }, this.type);
      }
    }
  }

  /**
   * Gives free-plan (402) rejections another try. The plan may have changed since (an upgrade,
   * or a document deleted to make room), and nothing else would ever retry them. Runs when the
   * worker starts, i.e. on every signed-in app load: one request per such document.
   */
  private reviveUpgradeRequiredFailures() {
    const othersIds = this.otherAccountsIds();

    for (const item of Object.values(SyncEngine.getOutbox(this.type))) {
      if (item.state !== "failed" || othersIds.has(item.id)) continue;
      if (SyncEngine.getTelemetry(item.id, this.type).lastErrorReason !== "upgrade-required") {
        continue;
      }

      SyncEngine.upsertOutboxItem(
        item.id,
        { state: "pending", attempts: 0, nextAttemptAt: Date.now() },
        this.type,
      );
    }
  }

  startWorker(options: SyncWorkerOptions) {
    this.workerEnabled = options.enabled;
    this.workerIdleDelayMs = Math.max(2_000, options.idleDelayMs ?? 12_000);
    this.attachWorkerListeners();

    if (this.workerEnabled) {
      this.config.localStorage.prepare();
      this.reviveUpgradeRequiredFailures();
      this.queuePendingForSync(false);
      const nextDue = this.getNextDueOutboxItem();
      if (nextDue) this.scheduleWorkerTick(nextDue.delayMs);
    }
  }

  /**
   * Syncs every pending document, at most {@link SYNC_CONCURRENCY} in flight.
   *
   * A bare `Promise.all` over all pending ids would fire one request per document at once —
   * well past the browser's ~6-per-host limit — and each `syncNow` also writes to storage.
   */
  async syncAllPending(): Promise<SyncResult[]> {
    this.config.localStorage.prepare();

    const pendingIds = this.listPendingIds();
    const results: SyncResult[] = [];
    let cursor = 0;

    const worker = async () => {
      while (cursor < pendingIds.length) {
        const index = cursor;
        cursor += 1;

        try {
          results.push(await this.syncNow(pendingIds[index]));
        } catch (error) {
          results.push({
            ok: false,
            message: error instanceof Error ? error.message : String(error),
            reason: "unknown",
          });
        }
      }
    };

    await Promise.allSettled(
      Array.from({ length: Math.min(SYNC_CONCURRENCY, pendingIds.length) }, worker),
    );

    return results;
  }

  /**
   * Turns sync on or off for every document of this type in one index write.
   *
   * Turning it on leaves alone documents the user chose to keep local (they stay opted out),
   * documents already syncing normally, and conflicts, which only the user can resolve.
   * It also clears terminal failures, so a document rejected before (say, over the free-tier
   * limit) gets another try.
   */
  setAllSyncEnabled(enabled: boolean): SaveDocumentResult {
    const othersIds = this.otherAccountsIds();
    const items = this.config.localStorage.list().filter((item) => !othersIds.has(item.id));
    const updated: T[] = [];

    for (const item of items) {
      if (enabled) {
        if (item.sync.enabled || SyncEngine.isSyncOptedOut(item.id, this.type)) continue;

        updated.push({ ...item, sync: { ...item.sync, enabled: true, status: "pending" } });
      } else if (item.sync.enabled || item.sync.status !== "local-only") {
        updated.push({ ...item, sync: { ...item.sync, enabled: false, status: "local-only" } });
      }
    }

    if (enabled) {
      for (const outboxItem of Object.values(SyncEngine.getOutbox(this.type))) {
        if (outboxItem.state === "failed" && !othersIds.has(outboxItem.id)) {
          SyncEngine.removeOutboxItem(outboxItem.id, this.type);
        }
      }
    }

    const result = this.config.localStorage.persistMany(updated);

    if (!result.ok) return { ok: false, reason: result.reason };

    return { ok: true, queued: false };
  }

  /** Every document's sync block, for restoring after a bulk toggle the server rejected. */
  captureSyncStates(): Record<string, T["sync"]> {
    const othersIds = this.otherAccountsIds();

    return Object.fromEntries(
      this.config.localStorage
        .listIndex()
        .filter((entry) => !othersIds.has(entry.id))
        .map((entry) => [entry.id, entry.sync as T["sync"]]),
    );
  }

  restoreSyncStates(states: Record<string, T["sync"]>): SaveDocumentResult {
    const othersIds = this.otherAccountsIds();
    const updated = this.config.localStorage
      .list()
      .filter((item) => states[item.id] && !othersIds.has(item.id))
      .map((item) => ({ ...item, sync: states[item.id] }));

    const result = this.config.localStorage.persistMany(updated);

    return result.ok ? { ok: true, queued: false } : { ok: false, reason: result.reason };
  }

  /**
   * Pushes one document to the cloud.
   *
   * At most one sync per document runs at a time: a second call in this tab gets the first
   * call's result, and another tab (via `navigator.locks` where available) is told the
   * document is already syncing. Without that, two overlapping PATCHes carry the same
   * revision and the second one fails as a false conflict.
   */
  syncNow(id: string, options?: SyncNowOptions): Promise<SyncResult> {
    const running = this.inFlight.get(id);

    // A running sync answers a plain request. One that must also move the share slug waits
    // for it and then runs its own, so the slug change is never dropped.
    if (running && !options?.updateShareSlug) return running;

    const run = (running ?? Promise.resolve())
      .then(() => this.withCrossTabLock(id, () => this.performSync(id, options)))
      .finally(() => {
        if (this.inFlight.get(id) === run) this.inFlight.delete(id);
      });

    this.inFlight.set(id, run);
    SyncEngine.trackSync(id, this.type, run);

    return run;
  }

  private async withCrossTabLock(id: string, task: () => Promise<SyncResult>): Promise<SyncResult> {
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks;

    if (!locks) return task();

    return locks.request(
      `veriworkly:sync:${this.type}:${id}`,
      { ifAvailable: true },
      async (lock) => {
        if (lock) return task();

        SyncEngine.upsertOutboxItem(
          id,
          { nextAttemptAt: Date.now() + this.workerIdleDelayMs },
          this.type,
        );

        return {
          ok: false,
          reason: "in-progress",
          message: "This document is already syncing in another tab.",
        };
      },
    );
  }

  private async performSync(id: string, options?: SyncNowOptions): Promise<SyncResult> {
    if (!this.canReachCloud()) {
      return { ok: false, reason: "in-progress", message: AWAITING_OWNER_MESSAGE };
    }

    if (this.otherAccountsIds().has(id)) return ANOTHER_ACCOUNT_RESULT;

    const epoch = getWorkspaceEpoch();

    // The last 300 ms of typing are part of what the user asked to back up or share.
    this.config.flushPendingEdits(id);

    const item = this.config.localStorage.loadById(id);

    if (!item) {
      SyncEngine.removeOutboxItem(id, this.type);
      return { ok: false, message: "Document not found locally.", reason: "not-found" };
    }

    // Sending it would carry the revision the cloud has moved past and 409 again; only the
    // user's choice (keep mine / use the cloud's) unblocks it.
    if (item.sync.status === "conflicted") {
      return { ok: false, reason: "conflict", message: CONFLICT_MESSAGE };
    }

    const isNew = !item.sync.cloudDocumentId;

    try {
      const marked = this.config.localStorage.patchSync(id, {
        status: "syncing",
      } as Partial<T["sync"]>);

      if (!marked.ok) {
        return this.recordFailure(id, {
          kind: "retry",
          reason: "storage",
          message: "This device's storage is full, so the sync could not start.",
        });
      }

      SyncEngine.upsertOutboxItem(id, { state: "syncing" }, this.type);
      SyncEngine.updateTelemetry(id, { lastAttemptAt: new Date().toISOString() }, this.type);

      const payload = {
        title: this.config.getDocumentTitle(item),
        content: item,
        templateId: item.templateId,
      };

      let cloud: CloudDocumentSummary;

      if (isNew) {
        const created = await DocumentApi.create({ id: item.id, type: this.type, ...payload });

        if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

        // A 200 means this id was already ours (an earlier sync whose reply was lost, or a
        // stale local copy): the server returned the stored row without applying the body,
        // so the content still has to be sent, against the revision it reported.
        cloud = created.created
          ? created.document
          : await DocumentApi.update(item.id, { ...payload, revision: created.document.revision });
      } else {
        cloud = await DocumentApi.update(item.id, {
          ...payload,
          revision: item.sync.revision,
          ...(options?.updateShareSlug ? { updateShareSlug: true } : {}),
        });
      }

      if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

      return this.recordSuccess(id, item, cloud, options);
    } catch (error: unknown) {
      if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

      const failure = classifySyncFailure(error, isNew ? "create" : "update");

      if (failure.kind !== "deleted") return this.recordFailure(id, failure);

      // Not linked here, so this device has nothing the delete was about: the id is simply
      // one the server will not accept again (a kept-local copy being synced once more).
      if (isNew) return this.rekeyAndSync(id);

      // The status before this attempt marked it syncing.
      return this.handleDeletedElsewhere(id, item.sync.status);
    }
  }

  private async rekeyAndSync(id: string): Promise<SyncResult> {
    const moved = this.config.rekeyLocal(id);

    if (!moved) {
      return this.recordFailure(id, {
        kind: "retry",
        reason: "storage",
        message:
          "The cloud copy was deleted and this device's storage is full, so it could not be backed up again.",
      });
    }

    this.announceRemoteDeletion(id, true, REKEYED_MESSAGE, moved.id);

    return this.performSync(moved.id);
  }

  /**
   * A sync the user asked for opts the document back in (sync on, no longer kept local). A
   * sync made only to move the share slug on rename leaves that choice as it was.
   */
  private recordSuccess(
    id: string,
    sent: T,
    cloud: CloudDocumentSummary,
    options?: SyncNowOptions,
  ): SyncResult {
    // Only the sync block is patched onto what is stored now: the user may have kept typing
    // while the request was in flight, and those edits are newer than `sent`.
    const current = this.config.localStorage.loadById(id);
    const editedSince = current !== null && current.updatedAt !== sent.updatedAt;
    const optIn = !options?.updateShareSlug;
    const enabled = optIn || Boolean(current?.sync.enabled);

    const saved = this.config.localStorage.patchSync(id, {
      enabled,
      status: !enabled ? "local-only" : editedSince ? "pending" : "synced",
      cloudDocumentId: cloud.id,
      lastSyncedAt: cloud.lastSyncedAt ?? cloud.updatedAt,
      revision: cloud.revision,
    } as Partial<T["sync"]>);

    if (!saved.ok) {
      return this.recordFailure(id, {
        kind: "retry",
        reason: "storage",
        message:
          "The cloud copy was updated, but this device could not record it because its storage is full.",
      });
    }

    if (editedSince && enabled) {
      SyncEngine.upsertOutboxItem(
        id,
        { state: "pending", attempts: 0, nextAttemptAt: Date.now() },
        this.type,
      );
    } else {
      SyncEngine.removeOutboxItem(id, this.type);
    }

    if (optIn) SyncEngine.setSyncOptedOut(id, false, this.type);
    SyncEngine.updateTelemetry(
      id,
      { lastSuccessAt: new Date().toISOString(), lastErrorReason: null },
      this.type,
    );

    return { ok: true, message: "Document synced successfully." };
  }

  /**
   * The cloud copy was deleted on another device. A clean local copy goes too; one holding
   * edits the cloud never received is unlinked and kept as a local-only document, opted out of
   * bulk sync toggles, with the reason recorded for the sync UI.
   */
  private handleDeletedElsewhere(id: string, priorStatus: SyncStatus): SyncResult {
    // Typing still in the debounce counts as an unsynced edit.
    this.config.flushPendingEdits(id);

    const currentStatus = this.config.localStorage.loadById(id)?.sync.status;
    const dirty =
      priorStatus !== "synced" || currentStatus === "pending" || currentStatus === "conflicted";

    if (!dirty) {
      this.config.removeLocal(id);
      SyncEngine.removeOutboxItem(id, this.type);
      this.announceRemoteDeletion(id, false, DELETED_ELSEWHERE_MESSAGE);

      return { ok: false, reason: "deleted", message: DELETED_ELSEWHERE_MESSAGE };
    }

    SyncEngine.setSyncOptedOut(id, true, this.type);
    SyncEngine.removeOutboxItem(id, this.type);

    const saved = this.config.localStorage.patchSync(id, {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    } as Partial<T["sync"]>);

    SyncEngine.updateTelemetry(
      id,
      {
        lastErrorAt: new Date().toISOString(),
        lastErrorMessage: KEPT_AFTER_REMOTE_DELETE_MESSAGE,
        lastErrorReason: "deleted-elsewhere",
      },
      this.type,
    );

    if (!saved.ok) {
      return {
        ok: false,
        reason: "storage",
        message: `${KEPT_AFTER_REMOTE_DELETE_MESSAGE} This device's storage is full, so it could not be marked local-only.`,
      };
    }

    this.announceRemoteDeletion(id, true, KEPT_AFTER_REMOTE_DELETE_MESSAGE);

    return { ok: false, reason: "deleted-elsewhere", message: KEPT_AFTER_REMOTE_DELETE_MESSAGE };
  }

  /** Tells an open editor or the library, which did not start this sync, what happened. */
  private announceRemoteDeletion(id: string, kept: boolean, message: string, newId?: string) {
    if (!this.isBrowser()) return;

    const detail: RemoteDeletionDetail = { type: this.type, id, kept, message, newId };
    window.dispatchEvent(new CustomEvent(DOCUMENT_REMOTE_DELETION_EVENT, { detail }));
  }

  private recordFailure(id: string, failure: RetainedFailure): SyncResult {
    const now = new Date().toISOString();

    const telemetry = {
      lastErrorAt: now,
      lastErrorMessage: failure.message,
      lastErrorReason: failure.kind === "conflict" ? ("conflict" as const) : failure.reason,
    };

    if (failure.kind === "conflict") {
      this.config.localStorage.patchSync(id, { status: "conflicted" } as Partial<T["sync"]>);
      SyncEngine.upsertOutboxItem(id, { state: "conflicted" }, this.type);
      SyncEngine.updateTelemetry(id, telemetry, this.type);

      return { ok: false, message: failure.message, reason: "conflict" };
    }

    // A failed attempt is still waiting to sync: back to pending (unless the user resolved
    // it some other way in the meantime).
    const stored = this.config.localStorage.loadById(id);
    if (stored?.sync.status === "syncing") {
      this.config.localStorage.patchSync(id, { status: "pending" } as Partial<T["sync"]>);
    }

    if (failure.kind === "terminal") {
      SyncEngine.upsertOutboxItem(id, { state: "failed" }, this.type);
    } else {
      const attempts = (SyncEngine.getOutboxItem(id, this.type)?.attempts ?? 0) + 1;
      const delay = Math.min(this.workerIdleDelayMs * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS);

      SyncEngine.upsertOutboxItem(
        id,
        { state: "pending", attempts, nextAttemptAt: Date.now() + delay },
        this.type,
      );
    }

    SyncEngine.updateTelemetry(id, telemetry, this.type);

    return { ok: false, message: failure.message, reason: failure.reason };
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

  async hydrateById(id: string, force = false): Promise<SyncResult> {
    if (!this.canReachCloud()) {
      return { ok: false, reason: "in-progress", message: AWAITING_OWNER_MESSAGE };
    }

    if (this.otherAccountsIds().has(id)) return ANOTHER_ACCOUNT_RESULT;

    const epoch = getWorkspaceEpoch();

    try {
      const record = await DocumentApi.get(id);

      if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

      const merged = this.mergeCloudDocumentsIntoLocalStorage([record], force);

      if (!merged.ok) return { ok: false, message: "Unable to save the cloud document here." };

      // "Nothing merged" is a success when the local copy is already current (a second
      // concurrent load, or a re-open). It is a failure only when the cloud copy was
      // unreadable, or the user asked to replace the local copy and nothing was replaced.
      if (merged.unreadableCount > 0) {
        return { ok: false, message: "The cloud copy could not be read, so nothing was changed." };
      }

      if (force && merged.mergedCount === 0) {
        return { ok: false, message: "The cloud copy could not replace the local one." };
      }

      return merged.conflictCount > 0
        ? {
            ok: true,
            message: "The cloud copy differs from your unsynced edits; resolve the conflict.",
          }
        : { ok: true, message: "Cloud document loaded successfully." };
    } catch (error: unknown) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        reason: isDocumentApiError(error, 404) ? "not-found" : "network",
      };
    }
  }

  /**
   * Pulls what changed in the cloud since the last pull: new and updated documents, and
   * deletions made on another device.
   *
   * The cursor is the server's own `serverTime` from the previous reply, so device clock skew
   * cannot skip a change. The first pull (and a forced one) fetches everything; tombstones
   * only come with an incremental pull, so a forced pull leaves an existing cursor where it was
   * and the next incremental pull still brings the deletions made since.
   *
   * The server answers in pages of {@link DOCUMENT_PAGE_SIZE_WITH_CONTENT}, oldest change first.
   * Each page is merged (and its tombstones applied) as it arrives, so a large account fills in
   * while it downloads. The cursor moves only after the last page. A pull that fails part way
   * keeps what it merged and records where it stopped; the next pull from the same cursor
   * resumes there instead of downloading the earlier pages again (merging by revision is
   * idempotent, so a page seen twice is harmless). A server without paging sends one page with
   * no `nextCursor`.
   *
   * One pull per type at a time: a caller for the same workspace and viewer while a walk runs
   * gets that walk's result, and its own options are not applied. A forced pull always walks.
   */
  async hydrate(options?: HydrateOptions): Promise<SyncResult> {
    // Not a failure: the sign-in that settles who owns this device's documents pulls again.
    if (!this.canReachCloud()) return { ok: true, message: AWAITING_OWNER_MESSAGE };

    const epoch = getWorkspaceEpoch();
    const viewer = getWorkspaceViewer();
    const running = this.pullInFlight;

    if (!options?.force && running?.epoch === epoch && running.viewer === viewer) {
      return running.promise;
    }

    const promise = this.pullCloudPages(epoch, options);
    this.pullInFlight = { epoch, viewer, promise };

    try {
      return await promise;
    } finally {
      if (this.pullInFlight?.promise === promise) this.pullInFlight = null;
    }
  }

  private async pullCloudPages(epoch: number, options?: HydrateOptions): Promise<SyncResult> {
    let mergedCount = 0;
    let conflictCount = 0;
    let removed = 0;
    let kept = 0;
    let meta: HydrateMeta | null = null;
    let updatedSince: string | undefined;
    let cursor: string | undefined;

    try {
      if (!this.shouldHydrate(options)) {
        return { ok: true, message: "Fresh enough." };
      }

      this.config.localStorage.prepare();

      const stored = this.getHydrateMeta();
      meta = stored;
      updatedSince = options?.force ? undefined : stored.lastServerCursor;

      // Where the last pull from this same cursor stopped. A cursor is only good for the filters
      // it was minted with, which the matching `updatedSince` guarantees.
      if (
        !options?.force &&
        stored.resume &&
        stored.resume.updatedSince === (updatedSince ?? null)
      ) {
        cursor = stored.resume.cursor;
      }

      const checkPage = createPageGuard(DOCUMENT_PAGE_SIZE_WITH_CONTENT, !updatedSince);
      let serverTime: string | null = null;
      let firstPage = true;

      do {
        const page = await DocumentApi.list(this.type, {
          includeContent: true,
          updatedSince,
          limit: DOCUMENT_PAGE_SIZE_WITH_CONTENT,
          cursor,
        });

        if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

        checkPage(cursor, page);

        if (firstPage) {
          // Every page of a walk repeats its first page's `serverTime`, a resumed one included.
          serverTime = page.serverTime;
          // Only a full pull brings every document, so only then can the count tell how many
          // are still to come.
          if (!updatedSince && page.total !== null) options?.onTotal?.(page.total);
          firstPage = false;
        }

        const merged = this.mergeCloudDocumentsIntoLocalStorage(page.documents);

        if (!merged.ok) return { ok: false, message: "Unable to save cloud documents here." };

        const tombstones = this.applyTombstones(page.deleted.map((entry) => entry.id));

        mergedCount += merged.mergedCount;
        conflictCount += merged.conflictCount;
        removed += tombstones.removed;
        kept += tombstones.kept;
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      const metaWrite = this.setLastHydrateMeta({
        lastHydratedAt: Date.now(),
        lastServerCursor:
          options?.force && stored.lastServerCursor
            ? stored.lastServerCursor
            : (serverTime ?? undefined),
      });

      if (!metaWrite) {
        return { ok: false, message: "Cloud documents were merged, but storage is full." };
      }

      const parts = [`Merged ${mergedCount} documents.`];
      if (removed > 0) {
        parts.push(`Removed ${removed} deleted on another device.`);
      }
      if (kept > 0) {
        parts.push(
          `Kept ${kept} deleted on another device as local-only copies, because they had unsynced changes.`,
        );
      }
      if (conflictCount > 0) parts.push(`${conflictCount} need a conflict decision.`);

      return { ok: true, message: parts.join(" ") };
    } catch (error: unknown) {
      // The next pull resumes from the last page that arrived. A 400 means the server refused
      // the request itself (a cursor it no longer accepts), so that pull starts over instead.
      if (meta && epoch === getWorkspaceEpoch()) {
        const resume =
          cursor && !isDocumentApiError(error, 400)
            ? { updatedSince: updatedSince ?? null, cursor }
            : undefined;

        if (resume || meta.resume) {
          this.setLastHydrateMeta({
            lastHydratedAt: meta.lastHydratedAt,
            lastServerCursor: meta.lastServerCursor,
            resume,
          });
        }
      }

      const message = error instanceof Error ? error.message : String(error);

      return {
        ok: false,
        message:
          mergedCount > 0
            ? `${message.replace(/\.?$/, ".")} ${mergedCount} documents arrived before it stopped; the rest will load on the next pull.`
            : message,
      };
    }
  }

  /**
   * Applies deletions made on another device. Never-linked local copies are not about the same
   * document and are skipped; see {@link handleDeletedElsewhere} for the rest.
   */
  private applyTombstones(ids: string[]) {
    const localById = new Map(this.config.localStorage.listIndex().map((e) => [e.id, e]));
    const othersIds = this.otherAccountsIds();
    let removed = 0;
    let kept = 0;

    for (const id of ids) {
      const local = localById.get(id);
      if (!local?.sync.cloudDocumentId || othersIds.has(id)) continue;

      if (this.handleDeletedElsewhere(id, local.sync.status).reason === "deleted") {
        removed += 1;
      } else {
        kept += 1;
      }
    }

    return { removed, kept };
  }

  /**
   * Merges cloud documents into local storage by revision.
   *
   * A local copy whose last-known revision is current, that was never linked (it syncs by
   * itself), or that the user keeps local is left alone. A newer cloud revision replaces a
   * synced local copy; against unsynced local edits it is a conflict, never an overwrite.
   * `force` (the user picked "use cloud") replaces whatever is local. Another account's
   * document with the same id is never written over: the record is skipped.
   */
  private mergeCloudDocumentsIntoLocalStorage(records: CloudDocument[], force = false) {
    const localById = new Map(this.config.localStorage.listIndex().map((e) => [e.id, e]));
    const othersIds = this.otherAccountsIds();

    const toPersist: T[] = [];
    const conflicts: string[] = [];
    let unreadableCount = 0;

    for (const record of records) {
      const cloudItem = this.config.parseItem(record.content);

      if (!cloudItem) {
        unreadableCount += 1;
        continue;
      }

      const local = localById.get(cloudItem.id);

      if (othersIds.has(cloudItem.id)) continue;

      if (!force && local) {
        if (
          !local.sync.cloudDocumentId ||
          local.sync.status === "conflicted" ||
          local.sync.status === "local-only" ||
          record.revision <= local.sync.revision
        ) {
          continue;
        }

        if (local.sync.status !== "synced") {
          conflicts.push(cloudItem.id);
          continue;
        }
      }

      toPersist.push(this.applyCloudSyncMetadata(cloudItem, record));
    }

    if (toPersist.length > 0) {
      const result = this.config.localStorage.persistMany(toPersist);
      if (!result.ok) return { ok: false, mergedCount: 0, conflictCount: 0, unreadableCount };

      SyncEngine.recordCloudContentRevisions(
        toPersist.map((item) => ({ id: item.id, revision: item.sync.revision })),
        this.type,
      );
    }

    for (const id of conflicts) {
      this.config.localStorage.patchSync(id, { status: "conflicted" } as Partial<T["sync"]>);
      SyncEngine.upsertOutboxItem(id, { state: "conflicted" }, this.type);
    }

    if (force) {
      for (const item of toPersist) SyncEngine.removeOutboxItem(item.id, this.type);
    }

    return {
      ok: true,
      mergedCount: toPersist.length,
      conflictCount: conflicts.length,
      unreadableCount,
    };
  }

  /**
   * Stops syncing one document and removes its cloud copy.
   *
   * Unlinking alone left the cloud row behind: it kept counting toward the free-tier limit,
   * and a later sync of the same id adopted the stale row. The cloud copy is deleted first
   * (a 404 means it is already gone); if that fails, nothing changes locally.
   */
  async keepLocalOnly(id: string): Promise<SyncResult> {
    if (this.otherAccountsIds().has(id)) return ANOTHER_ACCOUNT_RESULT;

    const item = this.config.localStorage.loadById(id);

    if (!item) return { ok: false, message: "Document not found.", reason: "not-found" };

    const epoch = getWorkspaceEpoch();

    if (item.sync.cloudDocumentId) {
      try {
        await DocumentApi.delete(id);
      } catch (error) {
        if (!isDocumentApiError(error, 404)) {
          return {
            ok: false,
            message: `The cloud copy could not be removed, so this document is still synced. ${
              error instanceof Error ? error.message : String(error)
            }`,
            reason: "network",
          };
        }
      }
    }

    if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

    const optOut = SyncEngine.setSyncOptedOut(id, true, this.type);
    const saved = this.config.localStorage.patchSync(id, {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    } as Partial<T["sync"]>);

    if (!optOut.ok || !saved.ok) {
      return {
        ok: false,
        message: "The cloud copy was removed, but this device's storage is full.",
        reason: "storage",
      };
    }

    SyncEngine.removeOutboxItem(id, this.type);

    return {
      ok: true,
      message: "The cloud copy was removed. This document now stays on this device.",
    };
  }

  /**
   * Keeps the local edits over the cloud copy: adopt the cloud's current revision, then push.
   * Linkage is cleared only when the cloud copy is confirmed gone (404); any other failure
   * leaves the document as it was so the user can try again.
   */
  async resolveConflictUseLocal(id: string): Promise<SyncResult> {
    if (this.otherAccountsIds().has(id)) return ANOTHER_ACCOUNT_RESULT;

    this.config.flushPendingEdits(id);

    const epoch = getWorkspaceEpoch();
    let patch: Partial<T["sync"]>;

    try {
      const record = await DocumentApi.get(id);
      patch = { revision: record.revision, status: "pending" } as Partial<T["sync"]>;
    } catch (error) {
      if (!isDocumentApiError(error, 404)) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          reason: "network",
        };
      }

      patch = { cloudDocumentId: null, revision: 1, status: "pending" } as Partial<T["sync"]>;
    }

    if (epoch !== getWorkspaceEpoch()) return WORKSPACE_CLEARED_RESULT;

    const saved = this.config.localStorage.patchSync(id, patch);

    if (!saved.ok) {
      return { ok: false, message: "This device's storage is full.", reason: "storage" };
    }

    SyncEngine.upsertOutboxItem(id, { state: "pending", attempts: 0 }, this.type);

    return this.syncNow(id);
  }

  async resolveConflictUseCloud(id: string): Promise<SyncResult> {
    return this.hydrateById(id, true);
  }

  private getHydrateMeta(): HydrateMeta {
    if (!this.isBrowser()) return { lastHydratedAt: 0 };
    const raw = localStorage.getItem(this.cloudHydrateMetaKey);
    if (!raw) return { lastHydratedAt: 0 };

    try {
      const meta: unknown = JSON.parse(raw);

      if (
        typeof meta === "object" &&
        meta !== null &&
        typeof (meta as { lastHydratedAt?: unknown }).lastHydratedAt === "number"
      ) {
        const { resume, ...rest } = meta as HydrateMeta;

        // A resume point of the wrong shape is dropped; the walk starts from its first page.
        return isResumePoint(resume) ? { ...rest, resume } : rest;
      }
    } catch {
      // Unparseable: healed below like a value of the wrong shape.
    }

    // Self-heal: a corrupted value (bad JSON, `null`, another shape) must not break every
    // later pull; the next one is a full list.
    localStorage.removeItem(this.cloudHydrateMetaKey);
    return { lastHydratedAt: 0 };
  }

  private setLastHydrateMeta(meta: HydrateMeta) {
    if (!this.isBrowser()) return true;

    return safeSetLocalStorageItem(localStorage, this.cloudHydrateMetaKey, JSON.stringify(meta)).ok;
  }

  private shouldHydrate(options?: HydrateOptions) {
    if (options?.force) return true;
    const minInterval = options?.minIntervalMs ?? this.DEFAULT_MIN_HYDRATE_INTERVAL_MS;

    return Date.now() - this.getHydrateMeta().lastHydratedAt >= minInterval;
  }
}
