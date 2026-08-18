"use client";

import type { BaseDocument, DocumentSyncState } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentImportDraft } from "@/features/documents/core/definition";
import type { SaveDocumentResult } from "./local-storage-service";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { withDocumentIdentity } from "@/features/documents/core/content-identity";
import { buildDocumentId, saveDocument, setActiveDocument } from "./document-workspace-service";

/**
 * Turns a parsed import draft into a brand-new, fully detached document.
 *
 * Generalised from the resume-only `sanitizeImportedResume`, whose comment described the
 * hazard precisely: a re-imported export that kept its original `id` / `cloudDocumentId` /
 * `revision` would let the next autosync silently overwrite — or false-conflict with — the
 * *original* cloud document instead of creating an independent copy. The resume was
 * guarded; the cover letter, which merged straight into the open document, was not.
 *
 * Identity is minted here and nowhere else. `DocumentImportDraft` carries none, so this is
 * the only place it can come from, for every document type.
 */
export function sanitizeImportedDocument<T>(
  type: DocumentType,
  draft: DocumentImportDraft<T>,
  id: string,
): BaseDocument<T> {
  const sync: DocumentSyncState = {
    enabled: false,
    status: "local-only",
    cloudDocumentId: null,
    lastSyncedAt: null,
    revision: 1,
  };

  return {
    id,
    type,
    title: draft.title,
    templateId: draft.templateId,
    updatedAt: new Date().toISOString(),
    sync,
    content: withDocumentIdentity(draft.content, { id, sync }),
  };
}

export interface DocumentImportResult {
  document: BaseDocument;
  saved: SaveDocumentResult;
}

/**
 * Imports a JSON file as a new document of `type`, and persists it.
 *
 * The single implementation behind the shared toolbar's "Import JSON" item, so the command
 * means the same thing in both editors: parse, validate, detach, save as a new document,
 * leave the currently open one untouched.
 *
 * Throws when the file is not JSON or the type's schema rejects it; the save result is
 * returned rather than thrown so callers can report a quota failure in their own wording.
 */
export async function importDocumentFromJsonFile(
  type: DocumentType,
  file: File,
): Promise<DocumentImportResult> {
  const raw: unknown = JSON.parse(await file.text());
  const draft = getDocumentDefinition(type).importJson(raw);

  if (!draft) {
    throw new Error("Invalid document JSON");
  }

  const document = sanitizeImportedDocument(type, draft, buildDocumentId(type));

  // Flushed: the caller navigates to this document immediately, and the destination editor
  // hydrates by reading it straight back out of storage.
  const saved = saveDocument(document, { flush: true });

  if (saved.ok) setActiveDocument(type, document.id);

  return { document, saved };
}
