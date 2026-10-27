"use client";

import type { BaseDocument, DocumentSyncState } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentImportDraft } from "@/features/documents/core/definition";
import type { SaveDocumentResult } from "./local-storage-service";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { withDocumentIdentity } from "@/features/documents/core/content-identity";
import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  saveDocument,
} from "./document-workspace-service";

/**
 * Turns a parsed import draft into a brand-new, fully detached document.
 *
 * Generalised from the resume-only `sanitizeImportedResume`, whose comment described the
 * hazard precisely: a re-imported export that kept its original `id` / `cloudDocumentId` /
 * `revision` would let the next autosync silently overwrite — or false-conflict with — the
 * *original* cloud document instead of creating an independent copy. The resume was
 * guarded; the cover letter, which merged straight into the open document, was not.
 *
 * Nothing of the file's identity survives: `id` and `sync` are the new document's, which
 * `createDocument` minted. `sync` defaults to a never-synced, local-only state.
 */
export function sanitizeImportedDocument<T>(
  type: DocumentType,
  draft: DocumentImportDraft<T>,
  id: string,
  sync: DocumentSyncState = {
    enabled: false,
    status: "local-only",
    cloudDocumentId: null,
    lastSyncedAt: null,
    revision: 1,
  },
): BaseDocument<T> {
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
 * The document is made by `createDocument`, like every other new document, so it gets the
 * workspace's auto-sync setting and becomes the active one; the file's content then replaces
 * the starting content. If that second write fails the new document is removed again rather
 * than left behind holding starter content the user never asked for.
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

  return saveImportedDraft(type, draft);
}

/**
 * `createDocument`, then the draft's content written over the starting content. Holds no limit:
 * a single import goes through `importDraftWithinLimit`, a backup through its own count.
 */
export function saveImportedDraft<T>(type: DocumentType, draft: DocumentImportDraft<T>) {
  const created = createDocument(type);

  if (!created.saveResult.ok) {
    return { document: created as BaseDocument, saved: created.saveResult };
  }

  const document: BaseDocument = sanitizeImportedDocument(type, draft, created.id, created.sync);

  // Flushed: the caller navigates to this document immediately, and the destination editor
  // hydrates by reading it straight back out of storage.
  const saved = saveDocument(document, { flush: true });

  if (!saved.ok) deleteDocument(type, created.id);

  return { document, saved };
}

export const WORKSPACE_BACKUP_FORMAT = "veriworkly-backup";

/** The file sign-out and account deletion offer before they clear this device. */
export interface WorkspaceBackup {
  format: typeof WORKSPACE_BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  /** The account's Master Profile, in a backup made before deleting the account. */
  masterProfile?: unknown;
  documents: BaseDocument[];
}

function isWorkspaceBackup(raw: unknown): raw is WorkspaceBackup {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { format?: unknown }).format === WORKSPACE_BACKUP_FORMAT &&
    Array.isArray((raw as { documents?: unknown }).documents)
  );
}

export type JsonImportOutcome =
  /** One document, validated but not yet saved: the caller creates it within the limit. */
  | { kind: "document"; draft: DocumentImportDraft }
  | { kind: "backup"; imported: BaseDocument[]; skipped: number; saved: SaveDocumentResult };

/**
 * Reads one document of `type`, or imports every document in a workspace backup.
 *
 * A backup restores each entry as its own new document of the entry's type, whichever
 * editor the import started from. Every entry is validated before anything is written, so a
 * damaged file restores nothing rather than half. `maxDocumentsPerType` is asked for only
 * when the file is a backup: `null` means no limit, otherwise entries past the limit for
 * their type (counting documents already on the device) are skipped and counted.
 */
export async function importJsonFile(
  type: DocumentType,
  file: File,
  maxDocumentsPerType: () => Promise<number | null>,
): Promise<JsonImportOutcome> {
  const raw: unknown = JSON.parse(await file.text());

  if (!isWorkspaceBackup(raw)) {
    const draft = getDocumentDefinition(type).importJson(raw);

    if (!draft) throw new Error("Invalid document JSON");

    return { kind: "document", draft };
  }

  const entries = raw.documents.map((entry, index) => {
    const entryType = (entry as { type?: unknown })?.type;
    const draft = DOCUMENT_TYPES.includes(entryType as DocumentType)
      ? getDocumentDefinition(entryType as DocumentType).importJson(entry)
      : null;

    if (!draft) throw new Error(`Backup entry ${index + 1} is not a valid document`);

    return { type: entryType as DocumentType, draft };
  });

  const limit = await maxDocumentsPerType();
  const counts = new Map(DOCUMENT_TYPES.map((t) => [t, listDocuments(t).length]));
  const imported: BaseDocument[] = [];
  let skipped = 0;

  for (const entry of entries) {
    const count = counts.get(entry.type) ?? 0;

    if (limit !== null && count >= limit) {
      skipped += 1;
      continue;
    }

    const { document, saved } = saveImportedDraft(entry.type, entry.draft);

    if (!saved.ok) return { kind: "backup", imported, skipped, saved };

    counts.set(entry.type, count + 1);
    imported.push(document);
  }

  return { kind: "backup", imported, skipped, saved: { ok: true, queued: false } };
}
