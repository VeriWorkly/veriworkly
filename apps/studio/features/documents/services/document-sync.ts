"use client";

import type { BaseDocument, DocumentSyncState } from "@/features/documents/core/types";

import type { SaveDocumentResult } from "./local-storage-service";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DOCUMENT_TYPES, type DocumentType } from "@/features/documents/core/document-types";
import {
  deleteDocument,
  flushPendingSave,
  getWorkspaceStorage,
  rekeyDocument,
} from "@/features/documents/services/document-workspace-service";

import {
  type HydrateOptions,
  type SyncNowOptions,
  type SyncResult,
  type SyncWorkerOptions,
  DocumentSyncService,
} from "./document-sync-service";
import { SyncEngine, type SyncTelemetry } from "./sync-engine";
import { canWorkspaceReachCloud } from "./workspace-owner";
import { getWorkspaceEpoch } from "./workspace-epoch";
import { getWorkspaceViewer } from "./workspace-viewer";
import {
  DOCUMENT_REMOTE_DELETION_EVENT,
  DOCUMENT_STORAGE_UPDATED_EVENT,
  DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT,
  type RemoteDeletionDetail,
} from "./storage-keys";

export type { SyncResult, SyncTelemetry, SyncWorkerOptions };
export { DOCUMENT_STORAGE_UPDATED_EVENT, DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT };

/** Subscribes to deletions made on another device; returns the unsubscribe function. */
export function subscribeToRemoteDeletions(listener: (detail: RemoteDeletionDetail) => void) {
  if (typeof window === "undefined") return () => {};

  const handle = (event: Event) => listener((event as CustomEvent<RemoteDeletionDetail>).detail);

  window.addEventListener(DOCUMENT_REMOTE_DELETION_EVENT, handle);
  return () => window.removeEventListener(DOCUMENT_REMOTE_DELETION_EVENT, handle);
}

type SyncStateSnapshot = Record<DocumentType, Record<string, DocumentSyncState>>;

type SharedDocumentSyncService = {
  syncNow(id: string, options?: SyncNowOptions): Promise<SyncResult>;
  keepLocalOnly(id: string): Promise<SyncResult>;
  resolveConflictUseLocal(id: string): Promise<SyncResult>;
  resolveConflictUseCloud(id: string): Promise<SyncResult>;
  startWorker(options: SyncWorkerOptions): void;
  syncAllPending(): Promise<SyncResult[]>;
  setAllSyncEnabled(enabled: boolean): SaveDocumentResult;
  captureSyncStates(): Record<string, DocumentSyncState>;
  restoreSyncStates(states: Record<string, DocumentSyncState>): SaveDocumentResult;
  hydrateById(id: string, force?: boolean): Promise<SyncResult>;
  hydrate(options?: HydrateOptions): Promise<SyncResult>;
};

function createGenericDocumentSyncService(type: DocumentType) {
  // Reuse the exact same LocalStorageService instance the editor autosave path
  // uses (document-workspace-service.ts) instead of instantiating a second,
  // independent client against the same storage keys. See storage-keys.ts.
  const storage = getWorkspaceStorage(type);

  return new DocumentSyncService<BaseDocument>({
    documentType: type,
    localStorage: storage,
    updatedEventName: DOCUMENT_STORAGE_UPDATED_EVENT,
    parseItem: (input) => getDocumentDefinition(type).parse(input),
    getDocumentTitle: (item) => item.title,
    removeLocal: (id) => {
      deleteDocument(type, id);
    },
    flushPendingEdits: (id) => flushPendingSave(type, id),
    rekeyLocal: (id) => rekeyDocument(type, id),
    canReachCloud: canWorkspaceReachCloud,
  });
}

function createDocumentSyncService(type: DocumentType): SharedDocumentSyncService {
  return createGenericDocumentSyncService(type);
}

const documentSyncServices = Object.fromEntries(
  DOCUMENT_TYPES.map((type) => [type, createDocumentSyncService(type)]),
) as Record<DocumentType, SharedDocumentSyncService>;

function getService(type: DocumentType) {
  return documentSyncServices[type];
}

export async function syncDocumentNow(
  type: DocumentType,
  id: string,
  options?: SyncNowOptions,
): Promise<SyncResult> {
  return getService(type).syncNow(id, options);
}

export async function keepDocumentLocalOnly(type: DocumentType, id: string): Promise<SyncResult> {
  return getService(type).keepLocalOnly(id);
}

export async function resolveDocumentConflictUseLocal(type: DocumentType, id: string) {
  return getService(type).resolveConflictUseLocal(id);
}

export async function resolveDocumentConflictUseCloud(type: DocumentType, id: string) {
  return getService(type).resolveConflictUseCloud(id);
}

export function startDocumentSyncWorker(type: DocumentType, options: SyncWorkerOptions) {
  getService(type).startWorker(options);
}

export async function syncAllPendingDocuments(type?: DocumentType): Promise<SyncResult[]> {
  if (type) return getService(type).syncAllPending();

  const settled = await Promise.allSettled(
    DOCUMENT_TYPES.map((documentType) => syncAllPendingDocuments(documentType)),
  );

  return settled.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
      : [
          {
            ok: false,
            message: String(result.reason?.message ?? result.reason),
            reason: "unknown",
          },
        ],
  );
}

/**
 * What the cloud pull knows while it runs: whether one is walking, and each type's live
 * document count in the account as a full pull's first page reported it, for the workspace
 * (sign-in epoch and viewer) it was reported in. The library compares a count with the
 * documents already here to say how many are still on the way.
 */
export type CloudPullState = {
  pulling: boolean;
  totals: Partial<Record<DocumentType, number>>;
  workspace: string | null;
};

export const IDLE_CLOUD_PULL: CloudPullState = { pulling: false, totals: {}, workspace: null };

let cloudPullState = IDLE_CLOUD_PULL;
let pullsRunning = 0;
const cloudPullListeners = new Set<() => void>();

function currentWorkspace() {
  return `${getWorkspaceEpoch()}:${getWorkspaceViewer() ?? "guest"}`;
}

function setCloudPullState(next: CloudPullState) {
  cloudPullState = next;
  for (const listener of cloudPullListeners) listener();
}

export function subscribeToCloudPull(listener: () => void) {
  cloudPullListeners.add(listener);
  return () => {
    cloudPullListeners.delete(listener);
  };
}

export function getCloudPullState() {
  return cloudPullState;
}

/**
 * How many of the account's documents (of `type`, or of every type) a running full pull has
 * yet to bring here: the account's count less the documents already linked to it. Zero when no
 * pull runs, when only an incremental pull ran (it reports no count), and for counts reported
 * in another workspace.
 */
export function countPendingCloudDocuments(
  state: CloudPullState,
  linkedCounts: Record<DocumentType, number>,
  type: DocumentType | "ALL",
) {
  if (!state.pulling || state.workspace !== currentWorkspace()) return 0;

  const types: readonly DocumentType[] = type === "ALL" ? DOCUMENT_TYPES : [type];

  return types.reduce((sum: number, documentType) => {
    const total = state.totals[documentType];
    return total === undefined ? sum : sum + Math.max(0, total - linkedCounts[documentType]);
  }, 0);
}

/**
 * Pulls cloud changes for every type: documents created or edited on another device, and
 * deletions made there. The documents library and the overview run this on mount for
 * signed-in users, which is what makes a second device show the user's documents.
 */
export async function hydrateAllDocumentsFromCloud(options?: {
  force?: boolean;
  minIntervalMs?: number;
}): Promise<SyncResult[]> {
  const workspace = currentWorkspace();

  pullsRunning += 1;
  // Counts are dropped when a pull starts with none running (they may be stale) and when the
  // workspace changed (another account's); a pull joining a running one keeps that one's.
  const keep = pullsRunning > 1 && cloudPullState.workspace === workspace;
  setCloudPullState({ pulling: true, totals: keep ? cloudPullState.totals : {}, workspace });

  try {
    const settled = await Promise.allSettled(
      DOCUMENT_TYPES.map((type) =>
        getService(type).hydrate({
          ...options,
          onTotal: (total) => {
            if (cloudPullState.workspace !== workspace) return;

            setCloudPullState({
              ...cloudPullState,
              totals: { ...cloudPullState.totals, [type]: total },
            });
          },
        }),
      ),
    );

    return settled.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            ok: false,
            message: String(result.reason?.message ?? result.reason),
            reason: "unknown",
          },
    );
  } finally {
    pullsRunning -= 1;
    if (pullsRunning === 0) setCloudPullState({ ...cloudPullState, pulling: false });
  }
}

/** Starts (or stops) the background sync worker for every document type. */
export function startAllDocumentSyncWorkers(options: SyncWorkerOptions) {
  for (const type of DOCUMENT_TYPES) getService(type).startWorker(options);
}

function setDocumentSyncEnabled(type: DocumentType, enabled: boolean) {
  return getService(type).setAllSyncEnabled(enabled);
}

/** Every document's sync block, so a rejected bulk toggle can be undone document by document. */
export function captureAllDocumentSyncStates(): SyncStateSnapshot {
  return Object.fromEntries(
    DOCUMENT_TYPES.map((type) => [type, getService(type).captureSyncStates()]),
  ) as SyncStateSnapshot;
}

export function restoreAllDocumentSyncStates(snapshot: SyncStateSnapshot): SaveDocumentResult {
  let lastResult: SaveDocumentResult = { ok: true, queued: false };

  for (const type of DOCUMENT_TYPES) {
    lastResult = getService(type).restoreSyncStates(snapshot[type] ?? {});
    if (!lastResult.ok) return lastResult;
  }

  return lastResult;
}

export function setAllDocumentsSyncEnabled(enabled: boolean): SaveDocumentResult {
  let lastResult: SaveDocumentResult = { ok: true, queued: false };

  for (const type of DOCUMENT_TYPES) {
    lastResult = setDocumentSyncEnabled(type, enabled);
    if (!lastResult.ok) return lastResult;
  }

  return lastResult;
}

export async function hydrateCloudDocumentByIdToLocalStorage(
  type: DocumentType,
  id: string,
  force?: boolean,
) {
  return getService(type).hydrateById(id, force);
}

export function getDocumentSyncTelemetry(type: DocumentType, id: string): SyncTelemetry {
  return SyncEngine.getTelemetry(id, type);
}

export function getDocumentSyncTelemetryByDocs(
  docs: Array<{ id: string; type: DocumentType }>,
): Record<string, SyncTelemetry> {
  return docs.reduce<Record<string, SyncTelemetry>>((result, doc) => {
    result[doc.id] = getDocumentSyncTelemetry(doc.type, doc.id);
    return result;
  }, {});
}

/** Latest attempt and latest success across every document (of one type, if given). */
export function getWorkspaceSyncTelemetry(type?: DocumentType) {
  const entries = Object.entries(SyncEngine.getAllTelemetry())
    .filter(([key]) => !type || key.startsWith(`${type}:`))
    .map(([, telemetry]) => telemetry);

  const latest = (values: Array<string | null>) =>
    values.reduce<string | null>(
      (max, value) => (value && (!max || Date.parse(value) > Date.parse(max)) ? value : max),
      null,
    );

  return {
    lastAttemptAt: latest(entries.map((entry) => entry.lastAttemptAt)),
    lastSuccessAt: latest(entries.map((entry) => entry.lastSuccessAt)),
  };
}
