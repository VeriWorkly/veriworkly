import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type {
  AccountDocumentType,
  CloudDocument,
} from "@/features/documents/services/document-api";

import { serializeWorkspaceBackup } from "@/features/auth/services/current-user";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { downloadBlob } from "@/features/documents/export/download";
import {
  DocumentApi,
  DOCUMENT_PAGE_SIZE_WITH_CONTENT,
} from "@/features/documents/services/document-api";
import {
  getWorkspaceStorage,
  listAllDocumentEntries,
} from "@/features/documents/services/document-workspace-service";
import { entriesOwnedBy, getWorkspaceViewer } from "@/features/documents/services/workspace-viewer";
import { loadMasterProfileFromDatabase } from "@/features/resume/services/master-profile";

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
 * Every document of a type with its body, page by page. `GET /documents` always pages (V-422):
 * every reply carries `nextCursor` and `total`, so the walk ends only on the last page. A failed
 * page throws: no partial list.
 */
async function listEveryDocument(type: AccountDocumentType): Promise<CloudDocument[]> {
  const documents: CloudDocument[] = [];

  for await (const page of DocumentApi.pages(type, {
    includeContent: true,
    limit: DOCUMENT_PAGE_SIZE_WITH_CONTENT,
  })) {
    documents.push(...page.documents);
  }

  return documents;
}

/**
 * Everything the account holds that the user wrote: every resume and cover letter in the
 * account, read straight from the server (not through the sync pull, which skips a device
 * holding someone else's documents), every document of this account on this device the cloud
 * does not have, the Master Profile, and the portfolio and link-in-bio pages as stored (the
 * studio cannot open them, but account deletion destroys them, S-375).
 *
 * A device copy with nothing unsent gives way to a newer cloud revision. One with changes the
 * cloud does not have (pending, in conflict, kept local) is exported beside the cloud copy, so
 * neither side's edits are lost. Anything that cannot be read, including any page of the
 * account's list, fails the whole backup with the reason.
 */
export async function buildAccountBackup(now = new Date()): Promise<AccountBackup> {
  let records: Array<{ type: DocumentType; record: CloudDocument }>;
  let sites: CloudDocument[];

  try {
    const [lists, portfolios, linkInBio] = await Promise.all([
      Promise.all(DOCUMENT_TYPES.map((type) => listEveryDocument(type))),
      listEveryDocument("PORTFOLIO"),
      listEveryDocument("LINK_IN_BIO"),
    ]);
    sites = [...portfolios, ...linkInBio];

    // Each row is read as the type it was listed under.
    records = lists.flatMap((documents, index) =>
      documents.map((record) => ({ type: DOCUMENT_TYPES[index], record })),
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

  return {
    ok: true,
    ...serializeWorkspaceBackup(documents, now, {
      masterProfile,
      sites: sites.map(({ id, type, title, content, updatedAt }) => ({
        id,
        type,
        title,
        content,
        updatedAt,
      })),
    }),
  };
}

/** Downloads the account backup, or says why none was made. */
export async function downloadAccountBackup(): Promise<AccountBackup> {
  const backup = await buildAccountBackup();

  if (backup.ok) {
    downloadBlob(new Blob([backup.json], { type: "application/json" }), backup.fileName);
  }

  return backup;
}
