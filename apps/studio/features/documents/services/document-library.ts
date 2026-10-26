"use client";

import type { DocumentIndexEntry } from "@/types/document";
import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import {
  DOCUMENT_STORAGE_UPDATED_EVENT,
  DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT,
} from "@/features/documents/services/document-sync";
import {
  getWorkspaceRevision,
  listDocumentIndexEntries,
  prepareWorkspaceStorage,
} from "@/features/documents/services/document-workspace-service";
import { invalidateDocumentIndexCache } from "@/features/documents/services/document-index";
import { getWorkspaceViewer } from "@/features/documents/services/workspace-viewer";
import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";

import { getDocumentDefinition } from "@/features/documents/core/registry";

export type DocumentLibraryItem = {
  source: "document";
  id: string;
  type: DocumentType;
  title: string;
  description: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  previewImage: string;
  updatedAt: string;
  sync: BaseDocument["sync"];
};

export type DocumentLibrarySnapshot = {
  docs: DocumentLibraryItem[];
  counts: Record<DocumentType, number>;
  key: string;
};

const EMPTY_COUNTS = Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 0])) as Record<
  DocumentType,
  number
>;

export const DOCUMENT_LIBRARY_SERVER_SNAPSHOT: DocumentLibrarySnapshot = {
  docs: [],
  counts: EMPTY_COUNTS,
  key: "server",
};

/**
 * Cached per `activeType`, not a single slot.
 *
 * A single slot thrashed: the dashboard asks for its current filter while
 * WorkspaceSearchModal (mounted globally in StudioShell) always asks for "ALL", so the
 * two invalidated each other and every search keystroke paid a full rebuild.
 */
const snapshotCache = new Map<string, DocumentLibrarySnapshot>();

export function subscribeToDocumentLibrary(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  // Subscription runs after commit, so the one-time migration and index repair (both of which
  // write) happen here; the snapshot read below stays pure. Their write event re-renders.
  prepareWorkspaceStorage();

  // A cross-tab write bypasses this tab's in-memory revision mirror, so drop it
  // before recomputing or we would serve a stale snapshot for the other tab's edit.
  const handleCrossTabChange = () => {
    invalidateDocumentIndexCache();
    onStoreChange();
  };

  window.addEventListener("storage", handleCrossTabChange);
  window.addEventListener(DOCUMENT_STORAGE_UPDATED_EVENT, onStoreChange);
  window.addEventListener(DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleCrossTabChange);
    window.removeEventListener(DOCUMENT_STORAGE_UPDATED_EVENT, onStoreChange);
    window.removeEventListener(DOCUMENT_SYNC_OUTBOX_UPDATED_EVENT, onStoreChange);
  };
}

export function getDocumentLibrarySnapshot(
  activeType: DocumentType | "ALL" = "ALL",
  refreshKey = 0,
): DocumentLibrarySnapshot {
  if (typeof window === "undefined") return DOCUMENT_LIBRARY_SERVER_SNAPSHOT;

  // One integer, not a hash of every document. This function is a
  // useSyncExternalStore getSnapshot, so it runs on every render — the previous
  // version concatenated the raw JSON of every collection (~563KB at 50 documents)
  // just to decide whether anything had changed.
  // The viewer too: signing in or out changes which documents are listed, not the storage.
  const nextKey = `${activeType}::${getWorkspaceRevision()}::${refreshKey}::${getWorkspaceViewer()}`;
  const cached = snapshotCache.get(activeType);

  if (cached && cached.key === nextKey) return cached;

  // Built from the storage index alone: no document bodies are read or validated.
  // The previous version called loadDocumentById per document, and each of those
  // re-parsed the entire collection — N+1 full loads, i.e. quadratic (523ms at 50).
  const allDocs = listDocumentIndexEntries()
    .map(mapIndexEntryToLibraryItem)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

  const counts: Record<DocumentType, number> = { ...EMPTY_COUNTS };
  allDocs.forEach((doc) => {
    counts[doc.type] += 1;
  });

  const snapshot: DocumentLibrarySnapshot = {
    docs: activeType === "ALL" ? allDocs : allDocs.filter((doc) => doc.type === activeType),
    counts,
    key: nextKey,
  };

  snapshotCache.set(activeType, snapshot);

  return snapshot;
}

function mapIndexEntryToLibraryItem(entry: DocumentIndexEntry): DocumentLibraryItem {
  const type = entry.type as DocumentType;
  const definition = getDocumentDefinition(type);
  const template =
    definition.templates.find((item) => item.id === entry.templateId) ?? definition.templates[0];

  return {
    source: "document",
    id: entry.id,
    type,
    title: entry.title,
    description: entry.description || definition.label,
    templateId: entry.templateId,
    templateName: template?.name ?? definition.label,
    templateDescription: template?.description ?? definition.label,
    previewImage: template?.previewImage ?? "",
    updatedAt: entry.updatedAt,
    sync: entry.sync,
  };
}

export function formatRelative(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "recently";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.round(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.round(diffMs / day)}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
