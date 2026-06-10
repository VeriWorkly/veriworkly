"use client";

import { toast } from "sonner";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { DocumentType } from "@/features/documents/core/document-types";

import {
  syncDocumentNow,
  keepDocumentLocalOnly,
  getDocumentSyncTelemetry,
  getDocumentSyncTelemetryByDocs,
  resolveDocumentConflictUseCloud,
  resolveDocumentConflictUseLocal,
} from "@/features/documents/services/document-sync";
import {
  type DocumentLibraryItem,
  getDocumentLibrarySnapshot,
  subscribeToDocumentLibrary,
  DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
} from "@/features/documents/services/document-library";
import { DocumentApi } from "@/features/documents/services/document-api";
import { deleteResumeById } from "@/features/resume/services/resume-service";
import { deleteDocument } from "@/features/documents/services/document-workspace-service";

import { useUserStore } from "@/store/useUserStore";

export type ViewMode = "grid" | "list";
export type SortMode = "updated" | "title";
export type DocumentTypeFilter = DocumentType | "ALL";

export function useDocumentsWorkspace() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("updated");

  const [activeType, setActiveType] = useState<DocumentTypeFilter>("ALL");

  const [refreshKey, setRefreshKey] = useState(0);
  const [syncingDocumentId, setSyncingDocumentId] = useState<string | null>(null);
  const [syncDetailsTargetId, setSyncDetailsTargetId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentLibraryItem | null>(null);
  const [shareTarget, setShareTarget] = useState<DocumentLibraryItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<DocumentLibraryItem | null>(null);

  const snapshot = useSyncExternalStore(
    subscribeToDocumentLibrary,
    () => getDocumentLibrarySnapshot(activeType, refreshKey),
    () => DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
  );

  const { docs, counts } = snapshot;
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const bump = useCallback(() => setRefreshKey((key) => key + 1), []);

  const visibleDocs = useMemo(() => {
    return [...docs].sort((left, right) => {
      if (sortMode === "title") return left.title.localeCompare(right.title);
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }, [docs, sortMode]);

  const syncDetailsTarget = useMemo(
    () => docs.find((doc) => doc.id === syncDetailsTargetId) ?? null,
    [docs, syncDetailsTargetId],
  );

  const syncTelemetryById = useMemo(() => getDocumentSyncTelemetryByDocs(docs), [docs]);

  const syncTargetTelemetry = useMemo(
    () =>
      syncDetailsTarget
        ? getDocumentSyncTelemetry(syncDetailsTarget.type, syncDetailsTarget.id)
        : null,
    [syncDetailsTarget],
  );

  const handleSyncNow = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to sync documents with the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await syncDocumentNow(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs, isLoggedIn],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      if (deleteTarget.type === "RESUME") {
        if (deleteTarget.sync.cloudDocumentId) await DocumentApi.delete(deleteTarget.id);
        deleteResumeById(deleteTarget.id);
      } else {
        deleteDocument(deleteTarget.type, deleteTarget.id);
      }

      toast.success(`${deleteTarget.title} deleted`);

      setDeleteTarget(null);
      bump();
    } catch {
      toast.error("Delete failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [bump, deleteTarget]);

  const handleKeepLocalOnly = useCallback(
    (id: string) => {
      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      const result = keepDocumentLocalOnly(target.type, id);

      toast.info(result.message);

      setSyncDetailsTargetId(null);
      bump();
    },
    [bump, docs],
  );

  const handleResolveUseCloud = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to restore a document from the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await resolveDocumentConflictUseCloud(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs, isLoggedIn],
  );

  const handleResolveUseLocal = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to sync documents with the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await resolveDocumentConflictUseLocal(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs, isLoggedIn],
  );

  return {
    activeType,
    counts,
    deleteTarget,
    handleConfirmDelete,
    handleKeepLocalOnly,
    handleResolveUseCloud,
    handleResolveUseLocal,
    handleSyncNow,
    isDeleting,
    shareTarget,
    renameTarget,
    syncDetailsTarget,
    setActiveType,
    setDeleteTarget,
    setShareTarget,
    setRenameTarget,
    setSortMode,
    setSyncDetailsTargetId,
    setViewMode,
    sortMode,
    syncingDocumentId,
    syncTargetTelemetry,
    syncTelemetryById,
    totalCount,
    viewMode,
    visibleDocs,
    bump,
  };
}
