"use client";

import { toast } from "sonner";

import type { DocumentType } from "@/features/documents/core/document-types";

import { toastSignInRequired } from "@/lib/sign-in";
import { useUserStore } from "@/store/useUserStore";
import { syncDocumentNow } from "@/features/documents/services/document-sync";

/**
 * The toolbar's "Back up now": backs up the open document and reports the outcome in the
 * status line. A document in conflict is not sent; the editor's notice asks which version
 * to keep (see `useDocumentEditorSession`).
 */
export function useSyncNowAction(
  type: DocumentType,
  documentId: string,
  onSetMessage: (message: string) => void,
) {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  return async function syncNow() {
    if (!isLoggedIn) {
      toastSignInRequired("Sign in to back up documents.");
      return;
    }

    onSetMessage("Backing up...");

    try {
      const result = await syncDocumentNow(type, documentId);

      if (!result.ok) {
        onSetMessage(`Backup failed: ${result.message}`);
        (result.reason === "conflict" ? toast.warning : toast.error)(result.message);
        return;
      }

      onSetMessage("Backed up");
      toast.success("Backed up to your account");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Backup failed";
      onSetMessage(`Backup failed: ${errMsg}`);
      toast.error(errMsg);
    }
  };
}
