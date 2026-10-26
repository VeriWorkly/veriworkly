"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { DocumentType } from "@/features/documents/core/document-types";

import {
  syncDocumentNow,
  keepDocumentLocalOnly,
  getDocumentSyncTelemetry,
  getDocumentSyncTelemetryByDocs,
  resolveDocumentConflictUseCloud,
  resolveDocumentConflictUseLocal,
  hydrateAllDocumentsFromCloud,
  subscribeToRemoteDeletions,
} from "@/features/documents/services/document-sync";
import {
  type DocumentLibraryItem,
  getDocumentLibrarySnapshot,
  subscribeToDocumentLibrary,
  DOCUMENT_LIBRARY_SERVER_SNAPSHOT,
} from "@/features/documents/services/document-library";
import { deleteDocumentEverywhere } from "@/features/documents/services/document-workspace-service";

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
  const [cloudPullSettled, setCloudPullSettled] = useState(false);
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

  /**
   * Runs one sync action for a card. A storage error can reject instead of returning a
   * failed result, so the spinner is cleared in `finally`, and only if no other card's
   * action has taken it over meanwhile.
   */
  const runSyncAction = useCallback(
    async (
      id: string,
      action: () => Promise<{ ok: boolean; message: string }>,
      successTone: "success" | "info" = "success",
    ) => {
      setSyncingDocumentId(id);

      try {
        const result = await action();
        toast[result.ok ? successTone : "error"](result.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Backup failed. Please try again.");
      } finally {
        setSyncingDocumentId((current) => (current === id ? null : current));
        bump();
      }
    },
    [bump],
  );

  // Pull cloud changes (other devices' documents and deletions) whenever a signed-in user
  // opens the overview or the library; the service throttles repeat pulls itself.
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    void hydrateAllDocumentsFromCloud().then((results) => {
      if (cancelled) return;

      setCloudPullSettled(true);

      const failure = results.find((result) => !result.ok);
      if (failure) toast.error(`Could not load your cloud documents: ${failure.message}`);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // The sync worker and the pull above can remove or unlink a document deleted on another
  // device; say so rather than letting a card silently vanish or turn local-only.
  useEffect(
    () =>
      subscribeToRemoteDeletions((detail) => {
        toast[detail.kept ? "warning" : "info"](detail.message);
      }),
    [],
  );

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

  const syncTelemetryById = useMemo(() => {
    if (!isLoggedIn) return {};
    return getDocumentSyncTelemetryByDocs(docs);
  }, [docs, isLoggedIn]);

  const syncTargetTelemetry = useMemo(
    () =>
      isLoggedIn && syncDetailsTarget
        ? getDocumentSyncTelemetry(syncDetailsTarget.type, syncDetailsTarget.id)
        : null,
    [syncDetailsTarget, isLoggedIn],
  );

  const handleSyncNow = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to sync documents with the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      await runSyncAction(id, () => syncDocumentNow(target.type, id));
    },
    [docs, isLoggedIn, runSyncAction],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteDocumentEverywhere(deleteTarget.type, deleteTarget);

      toast.success(`${deleteTarget.title} deleted`);

      setDeleteTarget(null);
      bump();
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : "please try again."}`);
    } finally {
      setIsDeleting(false);
    }
  }, [bump, deleteTarget]);

  const handleKeepLocalOnly = useCallback(
    async (id: string) => {
      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      await runSyncAction(id, () => keepDocumentLocalOnly(target.type, id), "info");
      setSyncDetailsTargetId(null);
    },
    [docs, runSyncAction],
  );

  const handleResolveUseCloud = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to restore a document from the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      await runSyncAction(id, () => resolveDocumentConflictUseCloud(target.type, id));
    },
    [docs, isLoggedIn, runSyncAction],
  );

  const handleResolveUseLocal = useCallback(
    async (id: string) => {
      if (!isLoggedIn) {
        toast.error("Sign in to sync documents with the cloud.");
        return;
      }

      const target = docs.find((doc) => doc.id === id);
      if (!target) return;

      await runSyncAction(id, () => resolveDocumentConflictUseLocal(target.type, id));
    },
    [docs, isLoggedIn, runSyncAction],
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
    /** True until a signed-in user's first pull settles: an empty list may not be empty. */
    isPullingFromCloud: isLoggedIn && !cloudPullSettled,
    viewMode,
    visibleDocs,
    bump,
  };
}
