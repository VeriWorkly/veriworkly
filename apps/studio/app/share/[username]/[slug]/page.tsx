import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type ShareLinkPayload } from "@/features/documents/services/share-service";

import { serverFetchData } from "@/lib/server-fetch";
import { ApiRequestError } from "@/utils/fetchApiData";

import { FullScreenMessage } from "../../components/FullScreenMessage";
import ShareDocumentClient from "./share-document-client";
import { renderSharedResumeTemplate } from "./shared-resume-template";

type ShareParams = { params: Promise<{ username: string; slug: string }> };

/** The answers a recruiter can get that are not a document. Anything else is a real error. */
const UNAVAILABLE_STATUSES: Record<number, { title: string; description: string }> = {
  410: {
    title: "This link has expired",
    description: "Ask the person who shared it for a new link.",
  },
  401: {
    title: "This document is not available",
    description: "The link may have been changed. Ask the person who shared it for a new one.",
  },
  403: {
    title: "This document is not available",
    description: "The link may have been changed. Ask the person who shared it for a new one.",
  },
  429: {
    title: "Too many requests",
    description: "This link was opened too often in a short time. Try again in a few minutes.",
  },
};

/** Shared by `generateMetadata` and the page, so one visit reads the link once. */
const loadShare = cache(async (username: string, slug: string) => {
  try {
    // Through serverFetchData so the API sees the recruiter's IP, not the studio's.
    const data = await serverFetchData<ShareLinkPayload>(
      `/shares/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
      { notFoundAsNull: true },
    );

    return data ? ({ kind: "found", data } as const) : ({ kind: "missing" } as const);
  } catch (error) {
    if (error instanceof ApiRequestError && UNAVAILABLE_STATUSES[error.status]) {
      return { kind: "unavailable", status: error.status } as const;
    }

    throw error;
  }
});

export async function generateMetadata({ params }: ShareParams): Promise<Metadata> {
  const { username, slug } = await params;
  const share = await loadShare(username, slug);

  // A password-protected link does not name its document to anyone without the password.
  const title =
    share.kind === "found" && share.data.documentTitle && !share.data.passwordRequired
      ? share.data.documentTitle
      : "Shared document";
  const description = "A document shared with VeriWorkly.";
  const url = `/share/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

  // Chat apps unfurl from these; without them a shared link previews as the studio dashboard.
  return {
    title: { absolute: `${title} | VeriWorkly` },
    description,
    robots: { index: false, follow: false },
    openGraph: { type: "website", url, title, description, siteName: "VeriWorkly" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SharedDocumentPage({ params }: ShareParams) {
  const { username, slug } = await params;
  const share = await loadShare(username, slug);

  if (share.kind === "missing") notFound();

  if (share.kind === "unavailable") {
    const message = UNAVAILABLE_STATUSES[share.status];
    return <FullScreenMessage title={message.title} description={message.description} />;
  }

  return (
    <ShareDocumentClient
      username={username}
      slug={slug}
      initialData={share.data}
      serverTemplate={await renderSharedResumeTemplate(share.data)}
    />
  );
}
