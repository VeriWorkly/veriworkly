"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { BaseDocument } from "@/features/documents/core/types";
import type { DocumentType } from "@/features/documents/core/document-types";

import {
  saveDocument,
  createDocument,
} from "@/features/documents/services/document-workspace-service";
import { getDocumentEditorPath } from "@/features/documents/core/routes";

interface EditorEntryRedirectProps {
  type: DocumentType;
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

export function EditorEntryRedirect({ type, templateId }: EditorEntryRedirectProps) {
  const router = useRouter();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    const document = applyTemplate(createDocument(type), templateId);

    if (document.templateId === templateId) saveDocument(document, { flush: true });

    router.replace(getDocumentEditorPath(type, document.id));
  }, [router, templateId, type]);

  return null;
}
