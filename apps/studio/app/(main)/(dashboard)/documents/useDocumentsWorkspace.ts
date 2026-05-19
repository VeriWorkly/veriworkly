"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  syncResumeNow,
  keepResumeLocalOnly,
  getResumeSyncTelemetry,
  resolveConflictUseCloud,
  resolveConflictUseLocal,
  getResumeSyncTelemetryByIds,
} from "@/features/resume/services/resume-sync";
import {
  type ResumeWorkspaceDoc,
  getResumeWorkspaceSnapshot,
  subscribeToResumeWorkspace,
  RESUME_WORKSPACE_SERVER_SNAPSHOT,
} from "@/features/documents/services/resume-workspace";
import { DocumentApi } from "@/features/documents/services/document-api";
import { deleteResumeById } from "@/features/resume/services/resume-service";
import { listResumeShareLinks } from "@/features/resume/services/share-links";

export type ViewMode = "grid" | "list";
export type SortMode = "updated" | "title";
export type ActiveTab = "recent" | "shared";
export type DocumentTypeFilter = ResumeWorkspaceDoc["type"] | "ALL";

export function useDocumentsWorkspace() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("updated");

  const [activeTab, setActiveTab] = useState<ActiveTab>("recent");
  const [activeType, setActiveType] = useState<DocumentTypeFilter>("ALL");

  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [sharedResumeIds, setSharedResumeIds] = useState<Set<string>>(new Set());

  const [refreshKey, setRefreshKey] = useState(0);
  const [syncingResumeId, setSyncingResumeId] = useState<string | null>(null);
  const [syncDetailsTargetId, setSyncDetailsTargetId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeWorkspaceDoc | null>(null);

  const snapshot = useSyncExternalStore(
    subscribeToResumeWorkspace,
    () => getResumeWorkspaceSnapshot(activeType, refreshKey),
    () => RESUME_WORKSPACE_SERVER_SNAPSHOT,
  );

  const { docs, counts } = snapshot;
  const totalCount = counts.RESUME;

  const bump = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    if (docs.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) setSharedResumeIds(new Set());
      });

      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      docs.map(async (doc) => {
        try {
          const links = await listResumeShareLinks(doc.id);
          return links.length > 0 ? doc.id : null;
        } catch {
          return null;
        }
      }),
    ).then((ids) => {
      if (!cancelled) {
        setSharedResumeIds(new Set(ids.filter((id): id is string => Boolean(id))));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [docs]);

  const visibleDocs = useMemo(() => {
    const tabDocs =
      activeTab === "shared" ? docs.filter((doc) => sharedResumeIds.has(doc.id)) : docs;

    return [...tabDocs].sort((left, right) => {
      if (sortMode === "title") return left.title.localeCompare(right.title);
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }, [activeTab, docs, sharedResumeIds, sortMode]);

  const resumeTarget = useMemo(
    () => docs.find((doc) => doc.id === syncDetailsTargetId)?.resume ?? null,
    [docs, syncDetailsTargetId],
  );

  const shareTargetTitle = useMemo(
    () => docs.find((doc) => doc.id === shareTargetId)?.title,
    [docs, shareTargetId],
  );

  const syncTelemetryById = useMemo(
    () => getResumeSyncTelemetryByIds(docs.map((doc) => doc.id)),
    [docs],
  );

  const syncTargetTelemetry = useMemo(
    () => (resumeTarget ? getResumeSyncTelemetry(resumeTarget.id) : null),
    [resumeTarget],
  );

  const handleSyncNow = useCallback(
    async (resumeId: string) => {
      setSyncingResumeId(resumeId);

      const result = await syncResumeNow(resumeId);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingResumeId(null);
      bump();
    },
    [bump],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      if (deleteTarget.sync.cloudDocumentId) await DocumentApi.delete(deleteTarget.id);

      deleteResumeById(deleteTarget.id);

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
      const result = keepResumeLocalOnly(id);

      toast.info(result.message);

      setSyncDetailsTargetId(null);
      bump();
    },
    [bump],
  );

  const handleResolveUseCloud = useCallback(
    async (id: string) => {
      setSyncingResumeId(id);

      const result = await resolveConflictUseCloud(id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingResumeId(null);
      bump();
    },
    [bump],
  );

  const handleResolveUseLocal = useCallback(
    async (id: string) => {
      setSyncingResumeId(id);

      const result = await resolveConflictUseLocal(id);

      toast[result.ok ? "success" : "error"](result.message);

      setSyncingResumeId(null);
      bump();
    },
    [bump],
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
    resumeTarget,
    setActiveTab,
    setActiveType,
    setDeleteTarget,
    setShareTargetId,
    setSortMode,
    setSyncDetailsTargetId,
    setViewMode,
    shareTargetId,
    shareTargetTitle,
    sortMode,
    syncingResumeId,
    syncTargetTelemetry,
    syncTelemetryById,
    totalCount,
    viewMode,
    visibleDocs,
  };
}
