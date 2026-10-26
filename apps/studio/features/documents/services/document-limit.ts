"use client";

import type { MasterProfileData } from "@veriworkly/profile-core";

import type { BillingSummary } from "@/features/billing/types";
import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentImportDraft } from "@/features/documents/core/definition";

import {
  createDocument,
  deleteDocument,
  listDocuments,
  saveDocument,
  type CreatedDocument,
} from "./document-workspace-service";
import { describeSaveResult } from "./save-failure-message";
import { sanitizeImportedDocument, saveImportedDraft } from "./import-service";

import {
  createEmptyStudioMasterProfile,
  getMasterProfileForNewDocument,
} from "@/features/resume/services/master-profile";
import { fetchApiData } from "@/utils/fetchApiData";
import { useUserStore } from "@/store/useUserStore";

/** Where a new document's starting content comes from. */
export type NewDocumentSource = "blank" | "profile" | "sample";

export type CreateWithinLimitResult =
  | { ok: true; document: CreatedDocument }
  /** Another create of this type is still running; the caller does nothing. */
  | { ok: false; reason: "busy" }
  | { ok: false; reason: "limit"; message: string; existingId: string }
  | { ok: false; reason: "billing" | "save"; message: string };

export const FREE_DOCUMENTS_PER_TYPE = 1;

const inFlight = new Set<DocumentType>();

export function freeLimitMessage(type: DocumentType) {
  const label = type.toLowerCase().replace("_", " ");

  // Said to credit-pack buyers too, who are paying customers: no "free plan" wording.
  return `Without a subscription or pass you can keep 1 ${label} at a time. Creator Pro, an AI Credits subscription, the Bundle or a 3- or 7-day pass unlock unlimited documents; credit packs do not.`;
}

/**
 * The server's own predicate (`EntitlementService.isPaid`): an AI Credits or portfolio grant,
 * from a subscription or a pass. `plan` is derived from exactly those grants; a credit pack on
 * its own leaves it `FREE`, and the server would refuse the extra document with a 402.
 */
export function hasUnlimitedDocuments(billing: Pick<BillingSummary, "plan">) {
  return billing.plan !== "FREE";
}

async function resolveStartingProfile(
  source: NewDocumentSource,
): Promise<MasterProfileData | undefined> {
  if (source === "blank") return createEmptyStudioMasterProfile();
  if (source === "sample") return undefined;

  return getMasterProfileForNewDocument();
}

/**
 * The one gate every "new document" path goes through: the dashboard's New button, the
 * `/editor?type=&template=` entry, Duplicate and a single-file import.
 *
 * A second call for the same type while one is running returns `busy`, so a double click
 * makes one document. The count is read after `prepare`, because another tab or entry point
 * may have created a document in the meantime; `build` is synchronous so nothing can slip in
 * between the count and the write. The plan matters only past the free limit, so it is looked
 * up only then: a signed-in user who is offline can still make their first document. When it
 * is needed, a failed lookup is an error, never "free": that would refuse a paying customer.
 * A guest is always on the free limit.
 */
async function withinLimit<P>(
  type: DocumentType,
  prepare: () => Promise<P>,
  build: (prepared: P) => CreatedDocument,
): Promise<CreateWithinLimitResult> {
  if (inFlight.has(type)) return { ok: false, reason: "busy" };

  inFlight.add(type);

  try {
    const prepared = await prepare();

    if (listDocuments(type).length >= FREE_DOCUMENTS_PER_TYPE) {
      let unlimited = false;

      if (useUserStore.getState().isLoggedIn) {
        try {
          unlimited = hasUnlimitedDocuments(await fetchApiData<BillingSummary>("/billing/me"));
        } catch (error) {
          return {
            ok: false,
            reason: "billing",
            message: `Could not check your plan: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }

      // The count only grows during the lookup, so a free user is still over the limit.
      if (!unlimited) {
        return {
          ok: false,
          reason: "limit",
          message: freeLimitMessage(type),
          existingId: listDocuments(type)[0].id,
        };
      }
    }

    const document = build(prepared);
    const failure = describeSaveResult(document.saveResult);

    return failure ? { ok: false, reason: "save", message: failure } : { ok: true, document };
  } finally {
    inFlight.delete(type);
  }
}

export function createDocumentWithinLimit(
  type: DocumentType,
  source: NewDocumentSource = "profile",
): Promise<CreateWithinLimitResult> {
  return withinLimit(
    type,
    () => resolveStartingProfile(source),
    (master) => createDocument(type, master),
  );
}

/**
 * An imported file (JSON or Markdown, from either editor) as a new document. Import never
 * writes over the open document, and an export and re-import is no way past the free limit.
 */
export function importDraftWithinLimit(
  type: DocumentType,
  draft: DocumentImportDraft,
): Promise<CreateWithinLimitResult> {
  return withinLimit(
    type,
    async () => undefined,
    () => {
      const { document, saved } = saveImportedDraft(type, draft);

      return { ...document, saveResult: saved };
    },
  );
}

/**
 * A copy of `source` as a new document: its own id, never-synced state and a "(copy)" title.
 * Made by `createDocument` like every other new document, then the content written over the
 * starting content; the new document is removed again if that second write fails.
 */
export function duplicateDocumentWithinLimit(
  source: BaseDocument,
): Promise<CreateWithinLimitResult> {
  return withinLimit(
    source.type,
    async () => undefined,
    () => {
      const created = createDocument(source.type, createEmptyStudioMasterProfile());

      if (!created.saveResult.ok) return created;

      const title = `${source.title} (copy)`;
      const content = structuredClone(source.content);

      // A resume's envelope title is rebuilt from its content's own `title` on every save.
      if (source.type === "RESUME" && typeof content === "object" && content !== null) {
        (content as { title?: string }).title = title;
      }

      const copy = sanitizeImportedDocument(
        source.type,
        { title, templateId: source.templateId, content },
        created.id,
        created.sync,
      );

      const saveResult = saveDocument(copy, { flush: true });

      if (!saveResult.ok) deleteDocument(source.type, created.id);

      return { ...copy, saveResult };
    },
  );
}
