import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getDocumentDefinition } from "@/features/documents/core/registry";
import { isDocumentType } from "@/features/documents/core/document-types";

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

export default async function EditorByTypePage({ params }: { params: Promise<Params> }) {
  const { type, id } = await params;
  const normalizedType = type.toUpperCase();

  if (!isDocumentType(normalizedType)) {
    notFound();
  }

  const Editor = getDocumentDefinition(normalizedType).Editor;
  return <Editor documentId={id} />;
}
