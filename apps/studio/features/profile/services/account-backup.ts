import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { CloudDocument } from "@/features/documents/services/document-api";

import { serializeWorkspaceBackup } from "@/features/auth/services/current-user";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { downloadBlob } from "@/features/documents/export/download";
import { DocumentApi } from "@/features/documents/services/document-api";
import {
  getWorkspaceStorage,
  listAllDocumentEntries,
} from "@/features/documents/services/document-workspace-service";
import { entriesOwnedBy, getWorkspaceViewer } from "@/features/documents/services/workspace-viewer";
import { loadMasterProfileFromDatabase } from "@/features/resume/services/master-profile";

/**
 * The server's list holds at most this many documents of a type and has no cursor
 * (`MAX_DOCUMENTS_PER_LIST`); a full page may mean there are more it did not send.
 */
export const SERVER_LIST_CAP = 500;

export type AccountBackup =
  | { ok: true; fileName: string; json: string }
  /** Nothing was made: a partial copy must never pass for the whole account. */
  | { ok: false; message: string };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function cloudVersion(document: BaseDocument): BaseDocument {
  return { ...document, title: `${document.title} (cloud version)` };
}

/**
 * Everything the account holds that the user wrote: every resume and cover letter in the
 * account, read straight from the server (not through the sync pull, which skips a device
 * holding someone else's documents), every document of this account on this device the cloud
 * does not have, and the Master Profile.
 *
 * A device copy with nothing unsent gives way to a newer cloud revision. One with changes the
 * cloud does not have (pending, in conflict, kept local) is exported beside the cloud copy, so
 * neither side's edits are lost. Anything that cannot be read, or a list the server may have
 * cut short, fails the whole backup with the reason.
 */
export async function buildAccountBackup(now = new Date()): Promise<AccountBackup> {
  let records: Array<{ type: DocumentType; record: CloudDocument }>;

  try {
    const lists = await Promise.all(
      DOCUMENT_TYPES.map((type) => DocumentApi.list(type, { includeContent: true })),
    );

    if (lists.some((list) => list.documents.length >= SERVER_LIST_CAP)) {
      return {
        ok: false,
        message: `Your account has more documents than one backup can fetch (over ${SERVER_LIST_CAP} of a kind).`,
      };
    }

    // Each row is read as the type it was listed under.
    records = lists.flatMap((list, index) =>
      list.documents.map((record) => ({ type: DOCUMENT_TYPES[index], record })),
    );
  } catch (error) {
    return { ok: false, message: `Your cloud documents could not be loaded: ${errorText(error)}` };
  }

  const cloud = new Map<string, { document: BaseDocument; revision: number }>();
  const unreadable: string[] = [];

  for (const { type, record } of records) {
    const document = getDocumentDefinition(type).parse(record.content);

    if (document) cloud.set(record.id, { document, revision: record.revision });
    else unreadable.push(record.title || "Untitled document");
  }

  if (unreadable.length > 0) {
    return {
      ok: false,
      message: `These documents in your account could not be read: ${unreadable.join(", ")}.`,
    };
  }

  const documents: BaseDocument[] = [];

  // This account's own device copies only: another account's, and those whose owner was lost
  // with a rebuilt index, are put to the user before they are ever adopted.
  for (const entry of entriesOwnedBy(listAllDocumentEntries(), getWorkspaceViewer())) {
    const local = getWorkspaceStorage(entry.type as DocumentType).loadById(entry.id);

    if (!local) return { ok: false, message: `"${entry.title}" on this device could not be read.` };

    const cloudId = local.sync.cloudDocumentId ?? local.id;
    const linked = cloud.get(cloudId);

    if (!linked) {
      documents.push(local);
      continue;
    }

    cloud.delete(cloudId);

    if (local.sync.status === "conflicted") {
      documents.push(local, cloudVersion(linked.document));
    } else if (linked.revision <= local.sync.revision) {
      documents.push(local);
    } else if (local.sync.status === "synced") {
      documents.push(linked.document);
    } else {
      documents.push(local, cloudVersion(linked.document));
    }
  }

  documents.push(...[...cloud.values()].map((entry) => entry.document));

  const master = await loadMasterProfileFromDatabase();

  if (master.status === "error") {
    return {
      ok: false,
      message: `Your Master Profile could not be loaded: ${errorText(master.error)}`,
    };
  }

  const masterProfile =
    master.status === "ok"
      ? master.bundle.profile
      : master.status === "unparseable"
        ? master.raw
        : null;

  return { ok: true, ...serializeWorkspaceBackup(documents, now, { masterProfile }) };
}

/** Downloads the account backup, or says why none was made. */
export async function downloadAccountBackup(): Promise<AccountBackup> {
  const backup = await buildAccountBackup();

  if (backup.ok) {
    downloadBlob(new Blob([backup.json], { type: "application/json" }), backup.fileName);
  }

  return backup;
}
