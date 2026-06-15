"use client";

import { backendApiUrl } from "@/lib/constants";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  throw new ApiRequestError(payload.message || fallbackMessage, response.status);
}

export type CreateShareLinkOptions = {
  password?: string;
  expiresAt?: string | null;
  noExpiry?: boolean;
  updateSlug?: boolean;
  removePassword?: boolean;
};

export type CreateShareLinkResult = {
  id: string;
  token: string;
  username: string;
  expiresAt: string | null;
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
};

export type ShareLinksPage = {
  items: ShareLinkItem[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
};

export type SharedDocumentIdsResult = {
  documentIds: string[];
};

export type ShareLinkPayload<T = unknown> = {
  passwordRequired: boolean;
  documentTitle: string;
  expiresAt: string | null;
  snapshot?: T;
  viewCount?: number;
};

export async function createShareLink<T = unknown>(
  documentId: string,
  snapshot: T,
  options: CreateShareLinkOptions = {},
): Promise<CreateShareLinkResult> {
  const response = await fetch(backendApiUrl("/shares"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      documentId,
      snapshot,
      password: options.password || undefined,
      expiresAt: options.expiresAt ?? null,
      noExpiry: options.noExpiry ?? false,
      updateSlug: options.updateSlug ?? false,
      removePassword: options.removePassword ?? false,
    }),
  });

  if (!response.ok) await throwApiError(response, "Failed to create share link");

  const payload = (await response.json()) as {
    data: CreateShareLinkResult;
  };

  return payload.data;
}

export async function listShareLinks(
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

export async function fetchShareLink<T = unknown>(token: string) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/${token}`, {
    errorMessage: "Shared document not found",
  });
}

export async function fetchShareLinkByUsernameAndSlug<T = unknown>(username: string, slug: string) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/public/${username}/${slug}`, {
    errorMessage: "Shared document not found",
  });
}

export async function verifyShareLink<T = unknown>(token: string, password: string) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/${token}/verify`, {
    method: "POST",
    body: JSON.stringify({ password }),
    errorMessage: "Invalid password",
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
    errorMessage: "Invalid password",
  });
}
