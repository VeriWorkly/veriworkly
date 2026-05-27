import { redirect } from "next/navigation";

import { DOCUMENT_TYPES } from "@/features/documents/core/document-types";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { parseDocumentRouteSegment } from "@/features/documents/core/routes";

import { EditorEntryRedirect } from "./EditorEntryRedirect";

interface EditorEntryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditorEntryPage({ searchParams }: EditorEntryPageProps) {
  const params = await searchParams;

  const templateParam = typeof params.template === "string" ? params.template : undefined;
  const typeParam = typeof params.type === "string" ? params.type : DOCUMENT_TYPES[0];
  const type = parseDocumentRouteSegment(typeParam);

  if (!type) redirect("/documents");

  const definition = getDocumentDefinition(type);
  const resolvedTemplate =
    definition.templates.find((template) => template.id === templateParam) ??
    definition.templates.find((template) => template.id === definition.defaultTemplateId) ??
    definition.templates[0];

  return <EditorEntryRedirect type={type} templateId={resolvedTemplate?.id} />;
}
