"use client";

import type { ResumeData } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type {
  SaveDocumentOptions,
  SaveDocumentResult,
} from "@/features/documents/services/local-storage-service";

import { normalizeResumeData } from "@/features/resume/utils/normalize-data";

import {
  saveDocument,
  createDocumentFromMasterProfile,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";

// Aliases rather than copies, so a new storage option reaches resume callers too.
export type SaveResumeResult = SaveDocumentResult;
export type SaveResumeOptions = SaveDocumentOptions;

/**
 * Wraps a `ResumeData` in the generic document envelope the rest of the app speaks.
 *
 * The toolbar needs the same envelope to hand to `exportDocumentByType` — the resume
 * editor holds its document as bare `ResumeData` in the store, while every shared surface
 * (export, sync, storage) takes a `BaseDocument`.
 */
export function toResumeDocument(resume: ResumeData): BaseDocument {
  return wrapResume(normalizeResumeData(resume));
}

function wrapResume(normalized: ResumeData): BaseDocument {
  return {
    id: normalized.id,
    type: "RESUME",
    title: normalized.title || normalized.basics.fullName || "Untitled Resume",
    templateId: normalized.templateId,
    content: normalized,
    updatedAt: normalized.updatedAt,
    sync: normalized.sync,
  };
}

export function saveResume(resume: ResumeData, options?: SaveResumeOptions): SaveResumeResult {
  // Autosave (the debounced save) hands over the editor store's resume, which `setResume`
  // normalised and every store action keeps in shape. Normalising it again ran over the
  // whole document on every keystroke, before the debounce.
  const doc = options?.debounceMs ? wrapResume(resume) : toResumeDocument(resume);
  const now = new Date().toISOString();

  return saveDocument(
    {
      ...doc,
      updatedAt: now,
      content: { ...(doc.content as ResumeData), updatedAt: now },
    },
    options,
  );
}

/** Reads a resume by id without writing anything, so it is safe in a render-phase `useMemo`. */
export function readResumeById(resumeId: string): ResumeData | null {
  const doc = loadDocumentById("RESUME", resumeId);

  if (!doc) {
    return null;
  }

  return normalizeResumeData(doc.content as ResumeData);
}

/**
 * A thin wrapper over `createDocumentFromMasterProfile("RESUME")`, deliberately: the
 * registry's `wrapResumeDocument` is the only constructor, and `createDocument` owns id
 * generation, the workspace sync setting and persistence.
 *
 * Async because the master profile lives in the database: the fallback resume a user lands
 * on after deleting their last one has to carry their real data too.
 */
export async function createResume(): Promise<ResumeData> {
  return (await createDocumentFromMasterProfile("RESUME")).content as ResumeData;
}
