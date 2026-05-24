import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ResumeData } from "@/types/resume";

import type { BaseDocument } from "@/features/documents/core/types";
import { type ShareLinkPayload } from "@/features/documents/services/share-service";

import { fetchApiData } from "@/utils/fetchApiData";

import ShareDocumentClient from "./share-document-client";

export const metadata: Metadata = {
  title: "Shared Document | VeriWorkly Studio",
  description: "View a shared document link.",
  robots: { index: false, follow: false },
};

export default async function SharedDocumentPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const data = await fetchApiData<ShareLinkPayload<ResumeData | BaseDocument>>(
    `/shares/public/${username}/${slug}`,
    {
      errorMessage: "Could not fetch shared document",
      nullOnNotFound: true,
    },
  );

  if (!data) {
    notFound();
  }

  return <ShareDocumentClient username={username} slug={slug} initialData={data} />;
}
