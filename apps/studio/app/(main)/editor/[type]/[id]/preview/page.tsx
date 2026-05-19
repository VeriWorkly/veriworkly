import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PreviewClient } from "./PreviewClient";

function isValidRouteId(id: string) {
  return id.length > 0 && /^[a-z0-9-]+$/i.test(id);
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

  if (type.toLowerCase() !== "resume") notFound();

  return <PreviewClient resumeId={id} />;
}
