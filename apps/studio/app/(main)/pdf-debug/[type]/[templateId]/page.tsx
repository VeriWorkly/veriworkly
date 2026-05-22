import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PdfDebugClient } from "./PdfDebugClient";

const DEBUG_TYPES = ["resume", "cover-letter"] as const;

type DebugType = (typeof DEBUG_TYPES)[number];

function isDebugType(value: string): value is DebugType {
  return DEBUG_TYPES.includes(value as DebugType);
}

export const metadata: Metadata = {
  title: "PDF Debug",
  description: "Debug resume and cover letter PDF templates.",
  robots: { index: false, follow: false },
};

export default async function PdfDebugPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; templateId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const { type, templateId } = await params;

  if (!isDebugType(type)) notFound();

  return <PdfDebugClient documentId={id} templateId={templateId} type={type} />;
}
