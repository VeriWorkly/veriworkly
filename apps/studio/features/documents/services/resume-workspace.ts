"use client";

import { templateSummaries } from "@/config/templates";
import { RESUME_ACTIVE_ID_STORAGE_KEY, RESUME_COLLECTION_STORAGE_KEY } from "@/lib/constants";
import { type ResumeListItem } from "@/features/resume/services/resume-service";
import { listSavedResumes } from "@/features/resume/services/resume-core";
import { RESUME_STORAGE_UPDATED_EVENT } from "@/features/resume/services/local-storage";
import { RESUME_SYNC_OUTBOX_UPDATED_EVENT } from "@/features/resume/services/resume-sync";

export type ResumeWorkspaceDoc = {
  source: "resume";
  id: string;
  type: "RESUME";
  title: string;
  description: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  previewImage: string;
  updatedAt: string;
  sync: ResumeListItem["sync"];
  resume: ResumeListItem;
};

export type ResumeWorkspaceSnapshot = {
  docs: ResumeWorkspaceDoc[];
  counts: Record<ResumeWorkspaceDoc["type"], number>;
  key: string;
};

const EMPTY_COUNTS: Record<ResumeWorkspaceDoc["type"], number> = { RESUME: 0 };

export const RESUME_WORKSPACE_SERVER_SNAPSHOT: ResumeWorkspaceSnapshot = {
  docs: [],
  counts: EMPTY_COUNTS,
  key: "server",
};

let snapshotCache: ResumeWorkspaceSnapshot = {
  docs: [],
  counts: EMPTY_COUNTS,
  key: "",
};

export function subscribeToResumeWorkspace(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RESUME_STORAGE_UPDATED_EVENT, onStoreChange);
  window.addEventListener(RESUME_SYNC_OUTBOX_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RESUME_STORAGE_UPDATED_EVENT, onStoreChange);
    window.removeEventListener(RESUME_SYNC_OUTBOX_UPDATED_EVENT, onStoreChange);
  };
}

export function getResumeWorkspaceSnapshot(
  activeType: ResumeWorkspaceDoc["type"] | "ALL" = "ALL",
  refreshKey = 0,
): ResumeWorkspaceSnapshot {
  if (typeof window === "undefined") {
    return RESUME_WORKSPACE_SERVER_SNAPSHOT;
  }

  const storage = window.localStorage;
  const storageKey = [
    storage.getItem(RESUME_COLLECTION_STORAGE_KEY) ?? "",
    storage.getItem(RESUME_ACTIVE_ID_STORAGE_KEY) ?? "",
    refreshKey.toString(),
  ].join("::");
  const nextKey = `${activeType}::${storageKey}`;

  if (nextKey !== snapshotCache.key) {
    const allDocs = listSavedResumes()
      .map(mapResumeToWorkspaceDoc)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

    const counts: Record<ResumeWorkspaceDoc["type"], number> = {
      RESUME: allDocs.length,
    };

    snapshotCache = {
      docs: activeType === "ALL" ? allDocs : allDocs.filter((doc) => doc.type === activeType),
      counts,
      key: nextKey,
    };
  }

  return snapshotCache;
}

export function mapResumeToWorkspaceDoc(resume: ResumeListItem): ResumeWorkspaceDoc {
  const template =
    templateSummaries.find((item) => item.id === resume.templateId) ?? templateSummaries[0];

  return {
    source: "resume",
    id: resume.id,
    type: "RESUME",
    title: resume.title,
    description: resume.role || "Role not set",
    templateId: resume.templateId,
    templateName: template?.name ?? "Resume template",
    templateDescription: template?.description ?? "Resume layout",
    previewImage: template?.previewImage ?? "",
    updatedAt: resume.updatedAt,
    sync: resume.sync,
    resume,
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
