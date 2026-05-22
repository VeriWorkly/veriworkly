"use client";

import { templateSummaries } from "@/config/templates";
import { RESUME_ACTIVE_ID_STORAGE_KEY, RESUME_COLLECTION_STORAGE_KEY } from "@/lib/constants";
import { type ResumeListItem } from "@/features/resume/services/resume-service";
import { listSavedResumes } from "@/features/resume/services/resume-core";
import { RESUME_STORAGE_UPDATED_EVENT } from "@/features/resume/services/local-storage";
import { RESUME_SYNC_OUTBOX_UPDATED_EVENT } from "@/features/resume/services/resume-sync";
import {
  listDocuments,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { BaseDocument } from "@/features/documents/core/types";
import { getDocumentDefinition } from "@/features/documents/core/registry";

export type DocumentLibraryItem = {
  source: "resume" | "document";
  id: string;
  type: DocumentType;
  title: string;
  description: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  previewImage: string;
  updatedAt: string;
  sync: ResumeListItem["sync"];
};

export type DocumentLibrarySnapshot = {
  docs: DocumentLibraryItem[];
  counts: Record<DocumentType, number>;
  key: string;
};

const EMPTY_COUNTS: Record<DocumentType, number> = {
  RESUME: 0,
  COVER_LETTER: 0,
  FORMAL_LETTER: 0,
  INVOICE: 0,
};

export const DOCUMENT_LIBRARY_SERVER_SNAPSHOT: DocumentLibrarySnapshot = {
  docs: [],
  counts: EMPTY_COUNTS,
  key: "server",
};

let snapshotCache: DocumentLibrarySnapshot = {
  docs: [],
  counts: EMPTY_COUNTS,
  key: "",
};

export function subscribeToDocumentLibrary(onStoreChange: () => void) {
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

export function getDocumentLibrarySnapshot(
  activeType: DocumentType | "ALL" = "ALL",
  refreshKey = 0,
): DocumentLibrarySnapshot {
  if (typeof window === "undefined") {
    return DOCUMENT_LIBRARY_SERVER_SNAPSHOT;
  }

  const storage = window.localStorage;
  const storageKey = [
    storage.getItem(RESUME_COLLECTION_STORAGE_KEY) ?? "",
    storage.getItem(RESUME_ACTIVE_ID_STORAGE_KEY) ?? "",
    refreshKey.toString(),
  ].join("::");
  const nextKey = `${activeType}::${storageKey}`;

  if (nextKey !== snapshotCache.key) {
    const resumeDocs = listSavedResumes().map(mapResumeToLibraryItem);
    const documentDocs = listDocuments()
      .filter((document) => document.type !== "RESUME")
      .map((document) => loadDocumentById(document.type, document.id))
      .filter((document): document is BaseDocument => Boolean(document))
      .map(mapDocumentToLibraryItem);
    const allDocs = [...resumeDocs, ...documentDocs].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );

    const counts: Record<DocumentType, number> = { ...EMPTY_COUNTS };
    allDocs.forEach((doc) => {
      counts[doc.type] += 1;
    });

    snapshotCache = {
      docs: activeType === "ALL" ? allDocs : allDocs.filter((doc) => doc.type === activeType),
      counts,
      key: nextKey,
    };
  }

  return snapshotCache;
}

export function mapResumeToLibraryItem(resume: ResumeListItem): DocumentLibraryItem {
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
  };
}

function describeDocument(document: BaseDocument): string {
  if (document.type === "COVER_LETTER") {
    const content = document.content as {
      jobTitle?: string;
      companyName?: string;
      subject?: string;
    };
    return (
      [content.jobTitle, content.companyName].filter(Boolean).join(" at ") ||
      content.subject ||
      "Cover letter"
    );
  }

  if (document.type === "FORMAL_LETTER") return "Formal correspondence";
  if (document.type === "INVOICE") return "Invoice document";

  return "Document";
}

export function mapDocumentToLibraryItem(document: BaseDocument): DocumentLibraryItem {
  const definition = getDocumentDefinition(document.type);
  const template =
    definition.templates.find((item) => item.id === document.templateId) ?? definition.templates[0];

  return {
    source: "document",
    id: document.id,
    type: document.type,
    title: document.title,
    description: describeDocument(document),
    templateId: document.templateId,
    templateName: template?.name ?? definition.label,
    templateDescription: template?.description ?? definition.label,
    previewImage: template?.previewImage ?? "",
    updatedAt: document.updatedAt,
    sync: document.sync,
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
