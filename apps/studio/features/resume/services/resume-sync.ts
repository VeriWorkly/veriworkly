"use client";

import type { ResumeData } from "@/types/resume";
import {
  RESUME_STORAGE_UPDATED_EVENT,
  resumeLocalStorage,
} from "@/features/resume/services/local-storage";
import { parseResumeDataInput } from "@/features/resume/schemas/resume-storage-schema";
import { getResumeTitle } from "@/features/resume/services/resume-formatters";

import {
  DocumentSyncService,
  type SyncResult as ResumeSyncResult,
  type SyncWorkerOptions as ResumeSyncWorkerOptions,
} from "@/features/documents/services/document-sync-service";
import { type SyncTelemetry as ResumeSyncTelemetry } from "@/features/documents/services/sync-engine";

export type { ResumeSyncResult, ResumeSyncTelemetry };

export const RESUME_SYNC_OUTBOX_UPDATED_EVENT = "veriworkly:sync-outbox-updated";

const resumeSyncService = new DocumentSyncService<ResumeData>({
  documentType: "RESUME",
  localStorage: resumeLocalStorage,
  updatedEventName: RESUME_STORAGE_UPDATED_EVENT,
  parseItem: parseResumeDataInput,
  getDocumentTitle: getResumeTitle,
});

export function startResumeSyncWorker(options: ResumeSyncWorkerOptions) {
  resumeSyncService.startWorker(options);
}

export async function syncAllPendingResumes() {
  return resumeSyncService.syncAllPending();
}

export async function syncResumeNow(resumeId: string) {
  return resumeSyncService.syncNow(resumeId);
}

export async function hydrateCloudResumeByIdToLocalStorage(resumeId: string) {
  return resumeSyncService.hydrateById(resumeId);
}

export async function hydrateCloudResumesToLocalStorage(options?: {
  force?: boolean;
  minIntervalMs?: number;
}) {
  return resumeSyncService.hydrate(options);
}

export function keepResumeLocalOnly(resumeId: string) {
  return resumeSyncService.keepLocalOnly(resumeId);
}

export async function resolveConflictUseLocal(resumeId: string) {
  return resumeSyncService.resolveConflictUseLocal(resumeId);
}

export async function resolveConflictUseCloud(resumeId: string) {
  return resumeSyncService.resolveConflictUseCloud(resumeId);
}

// Telemetry helpers (keeping them for compatibility)
import { SyncEngine } from "@/features/documents/services/sync-engine";

export function getResumeSyncTelemetry(resumeId: string): ResumeSyncTelemetry {
  return SyncEngine.getTelemetry(resumeId);
}

export function getResumeSyncTelemetryByIds(
  resumeIds: string[],
): Record<string, ResumeSyncTelemetry> {
  const result: Record<string, ResumeSyncTelemetry> = {};
  for (const id of resumeIds) result[id] = getResumeSyncTelemetry(id);
  return result;
}

export function getWorkspaceSyncTelemetry() {
  const outbox = SyncEngine.getOutbox();
  const values = Object.values(outbox);
  const maxAttempt = Math.max(...values.map((i) => i.updatedAt), 0);
  return {
    lastAttemptAt: maxAttempt ? new Date(maxAttempt).toISOString() : null,
    lastSuccessAt: null,
  };
}
