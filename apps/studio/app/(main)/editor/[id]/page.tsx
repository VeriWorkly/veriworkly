import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EditorLayout from "@/app/(main)/editor/components/EditorLayout";

function isValidResumeRouteId(id: string) {
  return id.length > 0 && /^[a-z0-9-]+$/i.test(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Editor - ${id}`,
    description: "Edit resume content, formatting, and section settings in VeriWorkly Studio.",
    robots: { index: false, follow: false },
  };
}

export default async function EditorByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidResumeRouteId(id)) {
    notFound();
  }

  return <EditorLayout resumeId={id} />;
}
