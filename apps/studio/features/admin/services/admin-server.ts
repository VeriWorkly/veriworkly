import "server-only";

import { cookies } from "next/headers";

import { backendApiUrl } from "@/lib/constants";

import type { RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminSession {
  user?: {
    email?: string;
    name?: string;
  };
}

interface AdminDashboardStats {
  githubStats: {
    projectName: string;
    projectUrl: string;

    stats: {
      totalItems: number;
      issues: number;
      pullRequests: number;
      todo: number;
      inProgress: number;
      done: number;
      completionRate: string;
    };

    syncedAt: string;
    nextSyncAt?: string | null;
  } | null;

  usageMetrics: {
    generatedAt: string;

    today: {
      resumeCreated: number;
      resumeExported: number;
      loginSuccess: number;
      raw: Record<string, string>;
    };

    totals: {
      resumeCreated: number;
      resumeDeleted: number;
      resumeExported: number;
      loginSuccess: number;
      otpSent: number;
      dashboardOpened: number;
      roadmapViewed: number;
    };
  };
}

async function getCookieHeaderValue() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

function normalizeHeaders(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers ?? {}).entries());
}

function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = normalizeHeaders(headers);
  const siteOrigin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : "";

  if (!siteOrigin) return normalizedHeaders;

  return {
    Origin: siteOrigin,
    ...normalizedHeaders,
  };
}

async function fetchWithSession(path: string, options?: RequestInit) {
  const cookieHeader = await getCookieHeaderValue();

  return fetch(backendApiUrl(path), {
    ...options,
    cache: "no-store",
    headers: firstPartyServerHeaders({
      "Content-Type": "application/json",
      cookie: cookieHeader,
      ...(options?.headers ?? {}),
    }),
  });
}

export async function fetchAdminDashboardStatsServer() {
  const response = await fetchWithSession("/stats/admin/dashboard", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Admin stats request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<AdminDashboardStats>;
  return payload.data;
}

export async function fetchAdminRoadmapServer(sort = "newest") {
  const response = await fetchWithSession(`/roadmap?sort=${sort}&limit=20&offset=0`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Roadmap request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<{
    items: RoadmapFeature[];
    total: number;
  }>;

  return payload.data.items;
}

export async function fetchAdminRoadmapFeatureServer(id: string) {
  const response = await fetchWithSession(`/roadmap/${id}`, {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Roadmap item request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<RoadmapFeature>;
  return payload.data;
}

export async function fetchAdminMonetizationServer<T>() {
  const response = await fetchWithSession("/admin/monetization", { method: "GET" });
  if (!response.ok) throw new Error(`Admin monetization request failed (${response.status})`);
  return ((await response.json()) as ApiSuccessResponse<T>).data;
}
