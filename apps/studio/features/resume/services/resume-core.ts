"use client";

import type { ResumeData, ResumeSyncStatus } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type {
  SaveDocumentOptions,
  SaveDocumentResult,
} from "@/features/documents/services/local-storage-service";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";

import {
  saveDocument,
  createDocumentFromMasterProfile,
  deleteDocument,
  clearDocuments,
  loadDocumentById,
  setActiveDocument,
  listDocumentIndexEntries,
  listFullDocuments,
} from "@/features/documents/services/document-workspace-service";

// Aliases rather than copies: these used to be re-declared here, so adding `onFlush` to
// the storage options would silently not reach resume callers.
export type SaveResumeResult = SaveDocumentResult;
export type SaveResumeOptions = SaveDocumentOptions;

export interface ResumeListItem {
  id: string;
  title: string;
  templateId: string;
  role: string;
  updatedAt: string;
  sync: ResumeData["sync"];
}

// Removed: `loadResume()`, which returned the active-or-newest resume. Its only caller was
// the resume store's hydration fallback, where returning *some* resume for a route that
// asked for a specific id meant the editor silently opened the wrong document. Editors now
// resolve by id through `loadResumeById` and report a miss instead.

/**
 * Wraps a `ResumeData` in the generic document envelope the rest of the app speaks.
 *
 * Extracted from `saveResume` because the toolbar needs the same envelope to hand to
 * `exportDocumentByType` — the resume editor holds its document as bare `ResumeData` in
 * the store, while every shared surface (export, sync, storage) takes a `BaseDocument`.
 */
export function toResumeDocument(resume: ResumeData): BaseDocument {
  const normalized = normalizeResumeData(resume);

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
  const doc = toResumeDocument(resume);
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

export function resetResume(): ResumeData {
  clearDocuments("RESUME");
  return defaultResume;
}

/**
 * Reads the storage index, so listing saved resumes never loads or validates a
 * resume body. `role` is the index's `description`, which is exactly what
 * `DocumentDefinition.describe` produces for a resume.
 */
export function listSavedResumes(): ResumeListItem[] {
  return listDocumentIndexEntries("RESUME").map((entry) => ({
    id: entry.id,
    title: entry.title,
    templateId: entry.templateId,
    role: entry.description,
    updatedAt: entry.updatedAt,
    sync: entry.sync,
  }));
}

export function deleteResumeById(resumeId: string): string | null {
  deleteDocument("RESUME", resumeId);

  // `delete` already repoints (or clears) the active-id pointer.
  return listDocumentIndexEntries("RESUME")[0]?.id ?? null;
}

/**
 * Reads a resume by id and nothing else.
 *
 * The read and the active-document pointer update are separate functions on purpose:
 * *looking at* a resume (a preview, a debug view, an ATS scan, a list) must not repoint the
 * workspace's active document, because that silently changes what other surfaces open by
 * default. This variant is also the only one safe to call from a render-phase `useMemo`.
 */
export function readResumeById(resumeId: string): ResumeData | null {
  const doc = loadDocumentById("RESUME", resumeId);

  if (!doc) {
    return null;
  }

  return normalizeResumeData(doc.content as ResumeData);
}

/**
 * Reads a resume *and* makes it the active document. For opening it in the editor — the one
 * place where "this is the document the user is working on" is genuinely true.
 */
export function loadResumeById(resumeId: string): ResumeData | null {
  const doc = loadDocumentById("RESUME", resumeId);

  if (!doc) {
    return null;
  }

  setActiveDocument("RESUME", doc.id);
  return normalizeResumeData(doc.content as ResumeData);
}

/**
 * A thin wrapper over `createDocumentFromMasterProfile("RESUME")`, deliberately.
 *
 * This used to be a *second* construction path: it derived from the master profile while
 * the registry's `createDefault` cloned `defaultResume`, so a resume created from the
 * sidebar and one created by the post-delete fallback were different documents. The
 * projection now lives in the registry (`wrapResumeDocument`), which is the only
 * constructor, and `createDocument` owns id generation, the workspace sync setting,
 * persistence, and the active-document pointer.
 *
 * Async because the master profile lives in the database: the fallback resume a user lands
 * on after deleting their last one has to carry their real data too.
 */
export async function createResume(): Promise<ResumeData> {
  return (await createDocumentFromMasterProfile("RESUME")).content as ResumeData;
}

/*
 * Removed: `createResumeWithTemplate`. Its only caller was the unreachable
 * `documentId === "new"` branch in `ResumeEditor`; the live template-on-create path is
 * `EditorEntryRedirect`, which applies the template generically to any document type.
 */

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

/*
 * Removed: `importResumeFromFile` / `sanitizeImportedResume`.
 *
 * Their job — assign a fresh id and clear cloud linkage so a re-imported export cannot
 * overwrite the original cloud document — is now done generically for every document type
 * by `sanitizeImportedDocument` in features/documents/services/import-service.ts, reached
 * through `DocumentDefinition.importJson`. The hazard the original comment described is
 * unchanged and still guarded; it is simply guarded once instead of per type. The cover
 * letter had no equivalent at all, which is exactly why it was generalised.
 */
