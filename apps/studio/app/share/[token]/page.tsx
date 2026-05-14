import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchApiData } from "@/utils/fetchApiData";
import { type ShareLinkPayload } from "@/features/resume/services/public-share";

import ShareResumeClient from "./share-resume-client";

export const metadata: Metadata = {
  title: "Shared Resume | VeriWorkly",
  description: "View a shared resume link.",
  robots: { index: false, follow: false },
};

export default async function SharedResumePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const data = await fetchApiData<ShareLinkPayload>(`/shares/${token}`, {
    errorMessage: "Could not fetch shared resume",
    nullOnNotFound: true,
  });

  if (!data) {
    notFound();
  }

  return <ShareResumeClient token={token} initialData={data} />;
}
