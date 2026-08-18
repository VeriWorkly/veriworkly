"use client";

import { toast } from "sonner";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { DocumentType } from "@/features/documents/core/document-types";

import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { importDocumentFromJsonFile } from "@/features/documents/services/import-service";
import { getSaveFailureMessage } from "@/features/documents/services/save-failure-message";

/**
 * The "Import JSON" action for both editors.
 *
 * One hook because the menu item is one shared menu item: previously the resume created a
 * new document and navigated to it while the cover letter merged the file into whatever
 * was open, so the same command was safe in one editor and destructive in the other.
 *
 * The outcome is now identical for every type — a new document, saved and opened — and the
 * currently open document is never touched. Navigating remounts the destination editor,
 * which hydrates the imported document straight out of storage, so nothing needs to be
 * pushed into a store from here.
 */
export function useDocumentJsonImport(type: DocumentType, onMessage: (message: string) => void) {
  const router = useRouter();

  return useCallback(
    async function importJsonFile(file: File | undefined) {
      if (!file) return;

      try {
        const { document, saved } = await importDocumentFromJsonFile(type, file);

        if (!saved.ok) {
          const failure = getSaveFailureMessage(saved.reason);

          onMessage(failure);
          toast.error(failure);

          return;
        }

        router.push(getDocumentEditorPath(type, document.id));

        // Toast as well as the status line: navigation remounts the editor, whose autosave
        // overwrites the status line within a few hundred milliseconds.
        onMessage("JSON imported successfully");
        toast.success("Imported as a new document");
      } catch {
        const failure = "Import failed. Please use a valid JSON file";

        onMessage(failure);
        toast.error(failure);
      }
    },
    [type, onMessage, router],
  );
}
