"use client";

import type { ResumeData, ResumeSectionId } from "@/types/resume";
import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent, CoverLetterSectionId } from "@/features/cover-letter/types";

import { backendApiUrl } from "@/lib/constants";
import { clearInvalidSessionAndRedirect } from "@/lib/invalid-session";
import {
  ApiRequestError,
  fetchApiData,
  readApiError,
  type OffsetPaginationPayload,
} from "@/utils/fetchApiData";
import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import {
  sectionVisible,
  customSectionVisible,
} from "@/features/documents/rendering/resume-rendering";

/**
 * For the owner's share calls, which all need a session. A 401 is an expired session, handled
 * as `fetchApiData` does: the page leaves for /login and the call never settles. Anything else
 * throws with the server's message, `details` and `code`.
 */
async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  if (response.status === 401) {
    void clearInvalidSessionAndRedirect();
    return new Promise<never>(() => {});
  }

  throw await readApiError(response, fallbackMessage);
}

export type CreateShareLinkOptions = {
  password?: string;
  expiresAt?: string | null;
  noExpiry?: boolean;
  updateSlug?: boolean;
  removePassword?: boolean;
  /**
   * Whether the public page shows its Download buttons (V-421). Left out, a new link shows them
   * and a refresh keeps the stored value, so it is sent only when the owner changed it.
   */
  allowDownload?: boolean;
};

export type CreateShareLinkResult = {
  id: string;
  token: string;
  username: string;
  expiresAt: string | null;
  /** Absent only from a server before V-421, where every link showed the buttons. */
  allowDownload?: boolean;
};

export type ShareLinkItem = {
  id: string;
  token: string;
  username: string;
  expiresAt: string | null;
  hasPassword: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documentSlug?: string;
  /** Absent from a list cached before V-421: read as true, the stored default. */
  allowDownload?: boolean;
};

type ShareLinksPage = OffsetPaginationPayload<ShareLinkItem>;

type SharedDocumentIdsResult = {
  documentIds: string[];
};

export type ShareLinkPayload<T = unknown> = {
  passwordRequired: boolean;
  /** Absent while the link is still locked behind its password. */
  documentTitle?: string;
  expiresAt: string | null;
  snapshot?: T;
  viewCount?: number;
  /**
   * Whether to show the Download buttons (V-421). A display preference, not access control:
   * viewers can still save or print the page. Absent means true.
   */
  allowDownload?: boolean;
};

/** Whether a share link shows its Download buttons; a link from before V-421 always did. */
export function shareAllowsDownload(link: { allowDownload?: boolean } | null | undefined) {
  return link?.allowDownload !== false;
}

/** What a share link stores and a recruiter's page renders: the document without its sync state. */
export type ShareSnapshot = Omit<BaseDocument, "sync">;

/** The resume field each hideable section prints from. Basics, links and custom are apart. */
const RESUME_SECTION_FIELDS = {
  summary: "summary",
  experience: "experience",
  education: "education",
  projects: "projects",
  skills: "skills",
  certifications: "certificates",
  awards: "awards",
  publications: "publications",
  languages: "languages",
  interests: "interests",
  volunteer: "volunteer",
  references: "references",
  achievements: "achievements",
} as const satisfies Partial<Record<ResumeSectionId, keyof ResumeData>>;

function toVisibleResume(content: ResumeData): Omit<ResumeData, "sync"> {
  const resume = normalizeResumeData(content);
  const visible: Omit<ResumeData, "sync"> & { sync?: ResumeData["sync"] } = {
    ...resume,
    customSections: resume.customSections.filter((section) =>
      customSectionVisible(resume, section.id),
    ),
  };

  delete visible.sync;

  if (!sectionVisible(resume, "basics")) {
    visible.basics = {
      ...resume.basics,
      fullName: "",
      role: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
    };
  }

  if (!sectionVisible(resume, "links")) {
    visible.links = { ...resume.links, items: [] };
  }

  for (const [sectionId, field] of Object.entries(RESUME_SECTION_FIELDS)) {
    if (sectionVisible(resume, sectionId as ResumeSectionId)) continue;
    Object.assign(visible, { [field]: field === "summary" ? "" : [] });
  }

  return visible;
}

/** The fields each hideable cover-letter section prints. */
const COVER_LETTER_SECTION_FIELDS: Record<
  Exclude<CoverLetterSectionId, "links">,
  Array<keyof CoverLetterContent>
> = {
  profile: ["senderEmail", "senderPhone", "senderLocation", "senderWebsite"],
  target: [
    "recipientName",
    "recipientTitle",
    "companyName",
    "companyLocation",
    "subject",
    "jobTitle",
  ],
  letter: ["greeting", "opening", "body", "highlights", "closing", "signature", "postscript"],
};

function toVisibleCoverLetter(content: CoverLetterContent): CoverLetterContent {
  const visible: CoverLetterContent = { ...content };
  delete visible.jobPost;

  const hidden = new Set(content.appearance?.hiddenSections ?? []);

  for (const [sectionId, fields] of Object.entries(COVER_LETTER_SECTION_FIELDS)) {
    if (!hidden.has(sectionId as CoverLetterSectionId)) continue;
    for (const field of fields) Object.assign(visible, { [field]: "" });
  }

  if (hidden.has("links")) visible.links = { ...content.links, items: [] };

  return visible;
}

/**
 * The share snapshot is public: anyone with the link gets it, and the page serialises it
 * into its HTML. So it carries only what the document prints. Hidden sections, a cover
 * letter's job post and the sync block (cloud id, revision) never leave the device.
 */
export function toShareSnapshot(document: BaseDocument): ShareSnapshot {
  const envelope: ShareSnapshot = {
    id: document.id,
    type: document.type,
    title: document.title,
    templateId: document.templateId,
    content: document.content,
    updatedAt: document.updatedAt,
  };

  if (document.type === "RESUME") {
    return { ...envelope, content: toVisibleResume(document.content as ResumeData) };
  }

  if (document.type === "COVER_LETTER") {
    return { ...envelope, content: toVisibleCoverLetter(document.content as CoverLetterContent) };
  }

  return envelope;
}

export async function createShareLink(
  document: BaseDocument,
  options: CreateShareLinkOptions = {},
): Promise<CreateShareLinkResult> {
  const response = await fetch(backendApiUrl("/shares"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      documentId: document.id,
      snapshot: toShareSnapshot(document),
      password: options.password || undefined,
      expiresAt: options.expiresAt ?? null,
      noExpiry: options.noExpiry ?? false,
      updateSlug: options.updateSlug ?? false,
      removePassword: options.removePassword ?? false,
      ...(options.allowDownload === undefined ? {} : { allowDownload: options.allowDownload }),
    }),
  });

  if (!response.ok) await throwApiError(response, "Failed to create share link");

  const payload = (await response.json()) as {
    data: CreateShareLinkResult;
  };

  return payload.data;
}

async function listShareLinks(
  documentId: string,
  options?: { page?: number; pageSize?: number },
): Promise<ShareLinksPage> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  const response = await fetch(
    backendApiUrl(`/shares/documents/${documentId}?page=${page}&pageSize=${pageSize}`),
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) await throwApiError(response, "Failed to load share links");

  const payload = (await response.json()) as { data: ShareLinksPage };

  return payload.data;
}

export async function listAllShareLinks(documentId: string): Promise<ShareLinkItem[]> {
  const items: ShareLinkItem[] = [];
  let page = 1;

  while (true) {
    const pageData = await listShareLinks(documentId, { page, pageSize: 20 });
    items.push(...pageData.items);

    if (!pageData.hasMore) {
      return items;
    }

    page += 1;
  }
}

export async function listSharedDocumentIds(documentIds: string[]): Promise<string[]> {
  if (documentIds.length === 0) return [];

  const params = new URLSearchParams({ ids: [...new Set(documentIds)].join(",") });
  const response = await fetch(backendApiUrl(`/shares/documents/shared-ids?${params}`), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to load shared document ids");
  }

  const payload = (await response.json()) as { data: SharedDocumentIdsResult };

  return payload.data.documentIds;
}

export async function revokeShareLink(documentId: string, shareLinkId: string) {
  const response = await fetch(
    backendApiUrl(`/shares/documents/${documentId}/links/${shareLinkId}`),
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) await throwApiError(response, "Failed to revoke share link");
}

export async function fetchShareLinkByUsernameAndSlug<T = unknown>(username: string, slug: string) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/public/${username}/${slug}`, {
    errorMessage: "Shared document not found",
  });
}

export async function verifyShareLinkByUsernameAndSlug<T = unknown>(
  username: string,
  slug: string,
  password: string,
) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/public/${username}/${slug}/verify`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/**
 * The server enforces a link's expiry (V-412) and answers an expired one, a password unlock
 * included, with 410 "Link expired": the page says the link has expired, not "wrong password".
 */
export function isShareLinkExpiredError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 410;
}
