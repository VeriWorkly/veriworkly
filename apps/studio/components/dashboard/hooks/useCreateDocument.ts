"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import type { DocumentType } from "@/features/documents/core/document-types";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import {
  flushPendingSave,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import {
  createDocumentWithinLimit,
  duplicateDocumentWithinLimit,
  type NewDocumentSource,
  type CreateWithinLimitResult,
} from "@/features/documents/services/document-limit";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * What the user sees when a create did not happen. The free limit is not a dead end: the
 * toast carries the way out.
 */
export function reportCreateFailure(
  result: Exclude<CreateWithinLimitResult, { ok: true }>,
  router: AppRouter,
) {
  if (result.reason === "busy") return;

  if (result.reason === "limit") {
    // A subscriber whose card failed fixes the card; they are never sold the plan again (S-386).
    toast.error(result.message, {
      action: {
        label: result.paymentIssue ? "Update card" : "Upgrade",
        onClick: () => router.push("/billing"),
      },
    });
    return;
  }

  toast.error(
    result.reason === "billing"
      ? result.message
      : `Could not create the document: ${result.message}`,
  );
}

export function useCreateDocument() {
  const router = useRouter();

  const createNewDocument = async (type: DocumentType, source?: NewDocumentSource) => {
    const result = await createDocumentWithinLimit(type, source);

    // Never open an editor on a document that did not reach storage: it would show "not found".
    if (!result.ok) {
      reportCreateFailure(result, router);
      return;
    }

    router.push(getDocumentEditorPath(type, result.document.id));
  };

  const duplicateDocument = async (type: DocumentType, id: string) => {
    // An open editor may still hold the latest keystrokes in its debounce.
    flushPendingSave(type, id);

    const source = loadDocumentById(type, id);

    if (!source) {
      toast.error("Could not duplicate: the document is not on this device.");
      return;
    }

    const result = await duplicateDocumentWithinLimit(source);

    if (!result.ok) {
      reportCreateFailure(result, router);
      return;
    }

    toast.success(`Duplicated as "${result.document.title}"`);
    router.push(getDocumentEditorPath(type, result.document.id));
  };

  return { createNewDocument, duplicateDocument };
}
