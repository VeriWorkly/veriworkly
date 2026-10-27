import type { RoadmapStatus, RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

import { fetchApiData } from "@/utils/fetchApiData";

export interface AdminRoadmapPayload {
  title: string;
  description: string;
  status: RoadmapStatus;
  eta?: string | null;
  tags?: string[];
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  details?: Record<string, unknown> | null;
  completedQuarter?: string | null;
}

// Roadmap writes live under the single admin router (`/admin/roadmap`); the public
// `/roadmap` router serves reads only.

export async function createRoadmapFeature(payload: AdminRoadmapPayload) {
  return fetchApiData<RoadmapFeature>("/admin/roadmap", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRoadmapFeature(id: string, payload: Partial<AdminRoadmapPayload>) {
  return fetchApiData<RoadmapFeature>(`/admin/roadmap/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoadmapFeature(id: string) {
  return fetchApiData<{ id: string }>(`/admin/roadmap/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
