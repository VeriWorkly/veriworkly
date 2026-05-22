"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  syncDocumentNow,
  keepDocumentLocalOnly,
  getDocumentSyncTelemetry,
  resolveDocumentConflictUseCloud,
  resolveDocumentConflictUseLocal,
  getDocumentSyncTelemetryByDocs,
} from "@/features/documents/services/document-sync";
import {
  type DocumentLibraryItem,
  getDocumentLibrarySnapshot,
  subscribeToDocumentLibrary,
  DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
} from "@/features/documents/services/document-library";
import { DocumentApi } from "@/features/documents/services/document-api";
import { deleteDocument } from "@/features/documents/services/document-workspace-service";
import { deleteResumeById } from "@/features/resume/services/resume-service";
import { listAllShareLinks } from "@/features/documents/services/share-service";
import type { DocumentType } from "@/features/documents/core/document-types";

export type ViewMode = "grid" | "list";
export type SortMode = "updated" | "title";
export type ActiveTab = "recent" | "shared";
export type DocumentTypeFilter = DocumentType | "ALL";

export function useDocumentsWorkspace() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("updated");

  const [activeTab, setActiveTab] = useState<ActiveTab>("recent");
  const [activeType, setActiveType] = useState<DocumentTypeFilter>("ALL");

  const [shareTarget, setShareTarget] = useState<DocumentLibraryItem | null>(null);
  const [sharedDocumentIds, setSharedDocumentIds] = useState<Set<string>>(new Set());

  const [refreshKey, setRefreshKey] = useState(0);
  const [syncingDocumentId, setSyncingDocumentId] = useState<string | null>(null);
  const [syncDetailsTargetId, setSyncDetailsTargetId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentLibraryItem | null>(null);

  const snapshot = useSyncExternalStore(
    subscribeToDocumentLibrary,
    () => getDocumentLibrarySnapshot(activeType, refreshKey),
    () => DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
  );

  const { docs, counts } = snapshot;
  const totalCount = counts.RESUME + counts.COVER_LETTER + counts.FORMAL_LETTER + counts.INVOICE;

  const bump = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    if (docs.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) setSharedDocumentIds(new Set());
      });

      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      docs.map(async (doc) => {
        try {
          const links = await listAllShareLinks(doc.id);
          return links.length > 0 ? doc.id : null;
        } catch {
          return null;
        }
      }),
    ).then((ids) => {
      if (!cancelled) {
        setSharedDocumentIds(new Set(ids.filter((id): id is string => Boolean(id))));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [docs]);

  const visibleDocs = useMemo(() => {
    const tabDocs =
      activeTab === "shared" ? docs.filter((doc) => sharedDocumentIds.has(doc.id)) : docs;

    return [...tabDocs].sort((left, right) => {
      if (sortMode === "title") return left.title.localeCompare(right.title);
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }, [activeTab, docs, sharedDocumentIds, sortMode]);

  const syncDetailsTarget = useMemo(
    () => docs.find((doc) => doc.id === syncDetailsTargetId) ?? null,
    [docs, syncDetailsTargetId],
  );

  const shareTargetTitle = shareTarget?.title;

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
      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await syncDocumentNow(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs],
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
      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await resolveDocumentConflictUseCloud(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs],
  );

  const handleResolveUseLocal = useCallback(
    async (id: string) => {
      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      setSyncingDocumentId(id);

      const result = await resolveDocumentConflictUseLocal(target.type, id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingDocumentId(null);
      bump();
    },
    [bump, docs],
  );

  return {
    activeTab,
    activeType,
    counts,
    deleteTarget,
    handleConfirmDelete,
    handleKeepLocalOnly,
    handleResolveUseCloud,
    handleResolveUseLocal,
    handleSyncNow,
    isDeleting,
    syncDetailsTarget,
    setActiveTab,
    setActiveType,
    setDeleteTarget,
    setShareTarget,
    setSortMode,
    setSyncDetailsTargetId,
    setViewMode,
    shareTarget,
    shareTargetTitle,
    sortMode,
    syncingDocumentId,
    syncTargetTelemetry,
    syncTelemetryById,
    totalCount,
    viewMode,
    visibleDocs,
  };
}
