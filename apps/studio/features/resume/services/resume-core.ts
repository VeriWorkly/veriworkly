"use client";

import type { ResumeData, ResumeSyncStatus } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { deriveResumeFromMasterProfile } from "@/features/resume/services/master-profile";
import { loadWorkspaceSettingsFromLocalStorage } from "@/features/documents/services/workspace-settings";

import {
  saveDocument,
  deleteDocument,
  loadDocumentById,
  setActiveDocument,
  listFullDocuments,
} from "@/features/documents/services/document-workspace-service";

import { importDocumentFromFile } from "@/features/documents/services/import-service";
import { parseResumeDataInput } from "@/features/resume/schemas/resume-storage-schema";

export type SaveResumeResult =
  | { ok: true; queued: boolean }
  | { ok: false; reason: "quota-exceeded" | "unknown" };

export type SaveResumeOptions = {
  debounceMs?: number;
  flush?: boolean;
};

export interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  role: string;
  updatedAt: string;
  sync: ResumeData["sync"];
}

function createId(): string {
  return `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadResume(): ResumeData {
  if (typeof window !== "undefined") {
    const activeVal = window.localStorage.getItem("veriworkly:docs:v2:active");

    if (activeVal) {
      const [type, id] = activeVal.split(":");

      if (type === "RESUME" && id) {
        const resume = loadResumeById(id);
        if (resume) return resume;
      }
    }
  }

  const fullDocs = listFullDocuments("RESUME");
  if (fullDocs.length > 0) {
    const firstResume = fullDocs[0].content as ResumeData;

    setActiveDocument("RESUME", firstResume.id);

    return normalizeResumeData(firstResume);
  }

  return normalizeResumeData(defaultResume);
}

export function saveResume(resume: ResumeData, options?: SaveResumeOptions): SaveResumeResult {
  const normalized = normalizeResumeData(resume);
  const now = new Date().toISOString();

  normalized.updatedAt = now;

  const doc: BaseDocument = {
    id: normalized.id,
    type: "RESUME",
    title: normalized.title || normalized.basics.fullName || "Untitled Resume",
    templateId: normalized.templateId,
    content: normalized,
    updatedAt: now,
    sync: normalized.sync,
  };

  return saveDocument(doc, options);
}

export function resetResume(): ResumeData {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("veriworkly:docs:v2:resume");
    window.localStorage.removeItem("veriworkly:docs:v2:active");
  }
  return defaultResume;
}

export function listSavedResumes(): ResumeListItem[] {
  const docs = listFullDocuments("RESUME");

  return docs.map((doc) => {
    const resume = doc.content as ResumeData;
    return {
      id: doc.id,
      title: doc.title,
      templateId: doc.templateId,
      role: resume.basics?.role || "",
      updatedAt: doc.updatedAt,
      sync: doc.sync,
    };
  });
}

export function deleteResumeById(resumeId: string): string | null {
  deleteDocument("RESUME", resumeId);

  const remaining = listFullDocuments("RESUME");
  const nextId = remaining[0]?.id ?? null;

  if (nextId) {
    setActiveDocument("RESUME", nextId);
  } else {
    if (typeof window !== "undefined") window.localStorage.removeItem("veriworkly:docs:v2:active");
  }
  return nextId;
}

export function loadResumeById(resumeId: string): ResumeData | null {
  const doc = loadDocumentById("RESUME", resumeId);

  if (!doc) {
    return null;
  }

  setActiveDocument("RESUME", doc.id);
  return normalizeResumeData(doc.content as ResumeData);
}

export function createResume(): ResumeData {
  const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();
  const nextResume = deriveResumeFromMasterProfile(createId());

  nextResume.sync = {
    ...defaultResume.sync,
    enabled: workspaceSettings.autoSyncEnabled,
    status: (workspaceSettings.autoSyncEnabled ? "pending" : "local-only") as ResumeSyncStatus,
  };

  saveResume(nextResume);

  return nextResume;
}

export function createResumeWithTemplate(templateId: string): ResumeData {
  const workspaceSettings = loadWorkspaceSettingsFromLocalStorage();
  const nextResume = deriveResumeFromMasterProfile(createId());

  nextResume.templateId = templateId;

  nextResume.sync = {
    ...defaultResume.sync,
    enabled: workspaceSettings.autoSyncEnabled,
    status: (workspaceSettings.autoSyncEnabled ? "pending" : "local-only") as ResumeSyncStatus,
  };

  saveResume(nextResume);

  return nextResume;
}

export function deleteResume(resumeId: string): ResumeData | null {
  const nextId = deleteResumeById(resumeId);

  if (!nextId) {
    return null;
  }

  return loadResumeById(nextId);
}

export function setAllResumesSyncEnabled(enabled: boolean): SaveResumeResult {
  const collection = listFullDocuments("RESUME");

  if (collection.length === 0) {
    return { ok: true, queued: false };
  }

  const updated = collection.map((doc) => {
    const resume = doc.content as ResumeData;
    return {
      ...resume,
      sync: {
        ...resume.sync,
        enabled,
        status: (enabled ? "pending" : "local-only") as ResumeSyncStatus,
      },
    };
  });

  let lastResult: SaveResumeResult = { ok: true, queued: false };

  for (const resume of updated) {
    lastResult = saveResume(resume);

    if (!lastResult.ok) {
      return lastResult;
    }
  }

  return lastResult;
}

export async function importResumeFromFile(file: File) {
  return importDocumentFromFile(file, parseResumeDataInput, normalizeResumeData);
}
