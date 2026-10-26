"use client";

import { toast } from "sonner";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { BillingSummary } from "@/features/billing/types";
import type { DocumentType } from "@/features/documents/core/document-types";
import type { DocumentImportDraft } from "@/features/documents/core/definition";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { importJsonFile } from "@/features/documents/services/import-service";
import { getSaveFailureMessage } from "@/features/documents/services/save-failure-message";
import { useUserStore } from "@/store/useUserStore";
import { fetchApiData } from "@/utils/fetchApiData";
import { listDocuments } from "@/features/documents/services/document-workspace-service";
import {
  hasUnlimitedDocuments,
  importDraftWithinLimit,
  FREE_DOCUMENTS_PER_TYPE,
} from "@/features/documents/services/document-limit";

/** Whether restoring the backup in `file` would take any type past the free limit. */
async function backupExceedsFreeLimit(file: File): Promise<boolean> {
  const { documents = [] } = JSON.parse(await file.text()) as {
    documents?: Array<{ type?: DocumentType }>;
  };
  const added = new Map<DocumentType, number>();

  for (const entry of documents) {
    if (entry?.type) added.set(entry.type, (added.get(entry.type) ?? 0) + 1);
  }

  return [...added].some(
    ([type, count]) => listDocuments(type).length + count > FREE_DOCUMENTS_PER_TYPE,
  );
}

/**
 * Guests and free accounts keep one active document per type; payers have no limit. The
 * plan is fetched only when the backup would go past the free limit, where the answer changes
 * what is restored; otherwise an offline account could not restore at all.
 */
export async function resolveDocumentsPerType(
  isLoggedIn: boolean,
  file: File,
): Promise<number | null> {
  if (!isLoggedIn || !(await backupExceedsFreeLimit(file))) return FREE_DOCUMENTS_PER_TYPE;

  const billing = await fetchApiData<BillingSummary>("/billing/me", { method: "GET" });

  return hasUnlimitedDocuments(billing) ? null : FREE_DOCUMENTS_PER_TYPE;
}

/**
 * Saves an imported file's draft as a new document of `type` and opens it, within the free
 * limit. Every single-file import (JSON or Markdown, either editor) ends here, so the open
 * document is never written over and the outcome is the same whichever menu item was used.
 */
export function useImportAsNewDocument(type: DocumentType, onMessage: (message: string) => void) {
  const router = useRouter();

  return useCallback(
    async (draft: DocumentImportDraft) => {
      const result = await importDraftWithinLimit(type, draft);

      if (result.ok) {
        router.push(getDocumentEditorPath(type, result.document.id));

        // Toast as well as the status line: navigation remounts the editor, whose autosave
        // overwrites the status line within a few hundred milliseconds.
        onMessage("Imported as a new document");
        toast.success("Imported as a new document");
        return;
      }

      // A second click while the first import runs.
      if (result.reason === "busy") return;

      onMessage(result.message);
      toast.error(result.message);
    },
    [type, onMessage, router],
  );
}

/**
 * The "Import JSON" action for both editors.
 *
 * One hook because the menu item is one shared menu item: the outcome is identical for every
 * type, a new document saved and opened, and the currently open document is never touched.
 * Navigating remounts the destination editor, which hydrates the imported document straight
 * out of storage, so nothing needs to be pushed into a store from here. A workspace backup
 * restores every document it holds, and opens the library when that is more than one.
 */
export function useDocumentJsonImport(type: DocumentType, onMessage: (message: string) => void) {
  const router = useRouter();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const importAsNewDocument = useImportAsNewDocument(type, onMessage);

  return useCallback(
    async function importJson(file: File | undefined) {
      if (!file) return;

      let outcome;

      try {
        outcome = await importJsonFile(type, file, () => resolveDocumentsPerType(isLoggedIn, file));
      } catch (error) {
        const failure =
          error instanceof SyntaxError || !(error instanceof Error)
            ? "Import failed. Please use a valid JSON file"
            : `Import failed. ${error.message}`;

        onMessage(failure);
        toast.error(failure);
        return;
      }

      if (outcome.kind === "document") {
        await importAsNewDocument(outcome.draft);
        return;
      }

      const { imported, skipped, saved } = outcome;
      const parts = [`Restored ${imported.length} document${imported.length === 1 ? "" : "s"}`];

      if (skipped > 0) {
        parts.push(
          `${skipped} skipped: without a subscription or pass you can keep one document of each type. Upgrade to restore the rest.`,
        );
      }

      if (!saved.ok) parts.push(getSaveFailureMessage(saved.reason));

      const message = parts.join(". ");

      onMessage(message);
      (saved.ok && imported.length > 0 ? toast.success : toast.error)(message);

      if (imported.length === 1) {
        router.push(getDocumentEditorPath(imported[0].type, imported[0].id));
      } else if (imported.length > 1) {
        router.push("/documents");
      }
    },
    [type, onMessage, router, isLoggedIn, importAsNewDocument],
  );
}
