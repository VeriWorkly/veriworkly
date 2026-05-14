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
};

export type CreateShareLinkResult = {
  id: string;
  token: string;
  expiresAt: string | null;
};

export type ShareLinkItem = {
  id: string;
  token: string;
  expiresAt: string | null;
  passwordHash: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    }),
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to create share link");
  }

  const payload = (await response.json()) as {
    data: CreateShareLinkResult;
  };

  return payload.data;
}

export async function listShareLinks(documentId: string): Promise<ShareLinkItem[]> {
  const response = await fetch(backendApiUrl(`/shares/documents/${documentId}`), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    await throwApiError(response, "Failed to load share links");
  }

  const payload = (await response.json()) as { data: ShareLinkItem[] };

  return payload.data;
}

export async function revokeShareLink(documentId: string, shareLinkId: string) {
  const response = await fetch(
    backendApiUrl(`/shares/documents/${documentId}/links/${shareLinkId}`),
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    await throwApiError(response, "Failed to revoke share link");
  }
}

export async function fetchShareLink<T = unknown>(token: string) {
  return fetchApiData<ShareLinkPayload<T>>(`/shares/${token}`, {
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
