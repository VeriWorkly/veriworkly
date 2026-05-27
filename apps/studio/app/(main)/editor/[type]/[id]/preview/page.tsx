import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PreviewClient } from "./PreviewClient";
import { parseDocumentRouteSegment } from "@/features/documents/core/routes";

function isValidRouteId(id: string) {
  return id.length > 0 && /^[a-z0-9_-]+$/i.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type, id } = await params;

  return {
    title: `Preview - ${type} - ${id}`,
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
