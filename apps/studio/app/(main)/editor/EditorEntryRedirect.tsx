"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import { Button } from "@veriworkly/ui";

import {
  saveDocument,
  loadDocumentById,
} from "@/features/documents/services/document-workspace-service";
import { getDocumentDefinition } from "@/features/documents/core/registry";
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

/** The document a template link reached at the free limit, waiting on "use the template or not". */
interface TemplateChoice {
  existing: BaseDocument;
  limitMessage: string;
}

export function EditorEntryRedirect({ type, templateId }: EditorEntryRedirectProps) {
  const router = useRouter();
  const createdRef = useRef(false);
  const [choice, setChoice] = useState<TemplateChoice | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);

  // The card replaces the loading state without a navigation; focus brings the question to a
  // screen reader instead of leaving it on the page body.
  useEffect(() => {
    if (choice) questionRef.current?.focus();
  }, [choice]);

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

        // At the free limit a template link opens the document the user already has instead of
        // a dead end or a second document the server would refuse to sync. Restyling it is the
        // user's call, so a link naming another template asks first.
        const existing =
          result.reason === "limit" ? loadDocumentById(type, result.existingId) : null;

        if (existing && result.reason === "limit") {
          if (applyTemplate(existing, templateId) !== existing) {
            setChoice({ existing, limitMessage: result.message });
            return;
          }

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

  if (choice) {
    const definition = getDocumentDefinition(type);
    const template = definition.templates.find((entry) => entry.id === templateId);
    const open = (useTemplate: boolean) => {
      if (useTemplate) persistTemplate(choice.existing, templateId);
      router.replace(getDocumentEditorPath(type, choice.existing.id));
    };

    return (
      <DocumentStateCard
        headingRef={questionRef}
        title={`Open "${choice.existing.title}" with ${template?.name ?? "this template"}?`}
        message={`${choice.limitMessage} The template changes how your ${definition.label.toLowerCase()} looks; its content stays the same.`}
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => open(true)}>Use {template?.name ?? "this template"}</Button>
          <Button variant="secondary" onClick={() => open(false)}>
            Keep its current template
          </Button>
          <Button variant="ghost" onClick={() => router.push("/billing")}>
            Upgrade
          </Button>
        </div>
      </DocumentStateCard>
    );
  }

  return <DocumentStateCard title="Creating your document" message="Preparing your editor." />;
}
