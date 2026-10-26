"use client";

import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import {
  saveDocument,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import { createDocumentWithinLimit } from "@/features/documents/services/document-limit";
import { getDocumentEditorPath } from "@/features/documents/core/routes";
import { describeSaveResult } from "@/features/documents/services/save-failure-message";
import { DocumentStateCard } from "@/features/documents/editor/DocumentStateCard";
import { reportCreateFailure } from "@/components/dashboard/hooks/useCreateDocument";

interface EditorEntryRedirectProps {
  type: DocumentType;
  /** Only a template the link actually asked for; absent means the type's default. */
  templateId?: string;
}

function applyTemplate(document: BaseDocument, templateId: string | undefined): BaseDocument {
  if (!templateId || document.templateId === templateId) return document;

  const content =
    typeof document.content === "object" && document.content !== null
      ? { ...document.content, templateId }
      : document.content;

  return {
    ...document,
    templateId,
    content,
    updatedAt: new Date().toISOString(),
  };
}

/** Writes the requested template onto `document`; the document exists either way. */
function persistTemplate(document: BaseDocument, templateId: string | undefined) {
  const withTemplate = applyTemplate(document, templateId);

  if (withTemplate === document) return;

  const failure = describeSaveResult(saveDocument(withTemplate, { flush: true }));

  if (failure) toast.error(`Could not apply the template: ${failure}`);
}

export function EditorEntryRedirect({ type, templateId }: EditorEntryRedirectProps) {
  const router = useRouter();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    void (async () => {
      try {
        const result = await createDocumentWithinLimit(type);

        if (result.ok) {
          persistTemplate(result.document, templateId);
          router.replace(getDocumentEditorPath(type, result.document.id));
          return;
        }

        // At the free limit a template link opens the document the user already has, wearing
        // the template they picked, instead of a dead end or a second document the server
        // would refuse to sync.
        const existing =
          result.reason === "limit" ? loadDocumentById(type, result.existingId) : null;

        if (existing && result.reason === "limit") {
          persistTemplate(existing, templateId);
          toast.info(`Opened "${existing.title}" instead. ${result.message}`, {
            action: { label: "Upgrade", onClick: () => router.push("/billing") },
          });
          router.replace(getDocumentEditorPath(type, existing.id));
          return;
        }

        // Another create of this type is running and navigates on its own; this page would
        // otherwise wait on it forever.
        if (result.reason === "busy") {
          toast.info("A new document is already being created.");
          router.replace("/documents");
          return;
        }

        reportCreateFailure(result, router);
        router.replace("/documents");
      } catch (error) {
        toast.error(
          `Could not create the document: ${error instanceof Error ? error.message : String(error)}`,
        );
        router.replace("/documents");
      }
    })();
  }, [router, templateId, type]);

  return <DocumentStateCard title="Creating your document" message="Preparing your editor." />;
}
