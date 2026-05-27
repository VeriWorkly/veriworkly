import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { parseDocumentRouteSegment } from "@/features/documents/core/routes";

import { EditorEntryRedirect } from "../../EditorEntryRedirect";

interface Params {
  type: string;
  id: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { type, id } = await params;
  return {
    title: `Editor - ${type} - ${id}`,
    description: "Edit documents in VeriWorkly Studio.",
    robots: { index: false, follow: false },
  };
}

export default async function EditorByTypePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { type, id } = await params;
  const { template } = await searchParams;

  const documentType = parseDocumentRouteSegment(type);

  if (!documentType) notFound();

  if (id === "new") {
    const definition = getDocumentDefinition(documentType);
    const resolvedTemplate =
      definition.templates.find((item) => item.id === template) ??
      definition.templates.find((item) => item.id === definition.defaultTemplateId) ??
      definition.templates[0];

    return <EditorEntryRedirect type={documentType} templateId={resolvedTemplate?.id} />;
  }

  const Editor = getDocumentDefinition(documentType).Editor;

  return <Editor documentId={id} />;
}
