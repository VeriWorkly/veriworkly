import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PreviewClient } from "./PreviewClient";

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
    title: `Preview - ${id}`,
    description: "Preview your resume in print-ready format before export or sharing.",
    robots: { index: false, follow: false },
  };
}

export default async function EditorPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidResumeRouteId(id)) {
    notFound();
  }

  return <PreviewClient resumeId={id} />;
}
