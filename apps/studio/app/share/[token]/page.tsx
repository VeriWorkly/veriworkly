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
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const data = await fetchApiData<ShareLinkPayload<ResumeData | BaseDocument>>(`/shares/${token}`, {
    errorMessage: "Could not fetch shared document",
    nullOnNotFound: true,
  });

  if (!data) {
    notFound();
  }

  return <ShareDocumentClient token={token} initialData={data} />;
}
