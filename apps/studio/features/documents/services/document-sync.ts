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
  type SyncNowOptions,
  type SyncResult,
  type SyncWorkerOptions,
  DocumentSyncService,
} from "./document-sync-service";
import { SyncEngine, type SyncTelemetry } from "./sync-engine";
import { canWorkspaceReachCloud } from "./workspace-owner";
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
  hydrate(options?: { force?: boolean; minIntervalMs?: number }): Promise<SyncResult>;
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
 * Pulls cloud changes for every type: documents created or edited on another device, and
 * deletions made there. The documents library and the overview run this on mount for
 * signed-in users, which is what makes a second device show the user's documents.
 */
export async function hydrateAllDocumentsFromCloud(options?: {
  force?: boolean;
  minIntervalMs?: number;
}): Promise<SyncResult[]> {
  const settled = await Promise.allSettled(
    DOCUMENT_TYPES.map((type) => getService(type).hydrate(options)),
  );

  return settled.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : { ok: false, message: String(result.reason?.message ?? result.reason), reason: "unknown" },
  );
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
