import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PreviewClient } from "./PreviewClient";
import { getDocumentDefinition } from "@/features/documents/core/registry";
import { parseDocumentRouteSegment } from "@/features/documents/core/routes";

function isValidRouteId(id: string) {
  return id.length > 0 && /^[a-z0-9_-]+$/i.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const documentType = parseDocumentRouteSegment(type);

  // Generic, like the editor's: the title is the document's, which only the device knows.
  // The preview puts it in the tab once it has loaded.
  return {
    title: documentType ? `${getDocumentDefinition(documentType).label} preview` : "Preview",
    description: "Preview your document before export or sharing.",
    robots: { index: false, follow: false },
  };
}

export default async function EditorPreviewPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;

  if (!isValidRouteId(id)) notFound();

  const documentType = parseDocumentRouteSegment(type);
  if (!documentType) notFound();

  return <PreviewClient documentId={id} type={documentType} />;
}
