import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DraftPreview } from "@/components/DraftPreview";
import { isTemplateId } from "@/templates/catalog/templates";

export const metadata: Metadata = {
  title: "Portfolio preview",
  robots: { index: false, follow: false },
};

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTemplateId(id)) notFound();
  return <DraftPreview templateId={id} />;
}
