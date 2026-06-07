import { backendApiUrl } from "@/lib/constants";

export type RoadmapSort = "newest" | "oldest" | "recently-completed";
export type RoadmapStatus = "todo" | "in-progress" | "done";

export interface RoadmapDetailItem {
  name: string;
  description?: string;
  image?: string;
}

export interface RoadmapDetails {
  fullDescription?: string;
  whyItMatters?: string;
  timeline?: string;
  problem?: string;
  solution?: string;
  approach?: string;
  keyImprovements?: string[];
  beforeAfter?: Array<{ before: string; after: string }>;
  technicalHighlights?: string[];
  media?: Array<{ type?: string; label?: string; url?: string }>;
  impactMetrics?: string[];
  items?: RoadmapDetailItem[];
}

export interface RoadmapInteraction {
  type: string;
  value?: number | null;
  comment?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
  };
}

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  eta?: string | null;
  tags?: string[];
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  completedQuarter?: string | null;
  updatedAt: string;
  fullDescription?: string | null;
  whyItMatters?: string | null;
  timeline?: string | null;
  details?: RoadmapDetails | null;
  interactions?: RoadmapInteraction[];
}

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RoadmapListPayload {
  items: RoadmapFeature[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
}

export interface RoadmapQuery {
  status?: RoadmapStatus;
  sort?: RoadmapSort;
  refreshSection?: RoadmapStatus;
}

export interface RoadmapSectionResponse {
  status: RoadmapStatus;
  title: string;
  items: RoadmapFeature[];
  fetchedAt: string;
}

export interface RoadmapResponse {
  generatedAt: string;
  sections: RoadmapSectionResponse[];
  query: Required<Pick<RoadmapQuery, "sort">>;
}

const statusTitles: Record<RoadmapStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

function normalizeHeaders(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers ?? {}).entries());
}

function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = normalizeHeaders(headers);

  if (typeof window !== "undefined") return normalizedHeaders;

  const siteOrigin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : "";
  if (!siteOrigin) return normalizedHeaders;

  return {
    Origin: siteOrigin,
    ...normalizedHeaders,
  };
}

async function fetchApiData<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(backendApiUrl(path), {
    ...options,
    credentials: options?.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...firstPartyServerHeaders(options?.headers),
    },
  });

  if (!response.ok) {
    throw new Error(`Roadmap backend request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;
  return payload.data;
}

function parseDetails(raw: unknown): RoadmapDetails | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const details = raw as Record<string, unknown>;

  const readStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : undefined;

  const readBeforeAfter = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((entry): { before: string; after: string } | null => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
              return null;
            }

            const item = entry as Record<string, unknown>;

            if (typeof item.before !== "string" || typeof item.after !== "string") {
              return null;
            }

            return {
              before: item.before,
              after: item.after,
            };
          })
          .filter((entry): entry is { before: string; after: string } => entry !== null)
      : undefined;

  const readMedia = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((entry): { type?: string; label?: string; url?: string } | null => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
              return null;
            }

            const item = entry as Record<string, unknown>;

            return {
              type: typeof item.type === "string" ? item.type : undefined,
              label: typeof item.label === "string" ? item.label : undefined,
              url: typeof item.url === "string" ? item.url : undefined,
            };
          })
          .filter(
            (entry): entry is { type?: string; label?: string; url?: string } => entry !== null,
          )
      : undefined;

  const readItems = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((entry): RoadmapDetailItem | null => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
              return null;
            }

            const item = entry as Record<string, unknown>;

            if (typeof item.name !== "string") {
              return null;
            }

            return {
              name: item.name,
              description: typeof item.description === "string" ? item.description : undefined,
              image: typeof item.image === "string" ? item.image : undefined,
            };
          })
          .filter((entry): entry is RoadmapDetailItem => entry !== null)
      : undefined;

  return {
    fullDescription:
      typeof details.fullDescription === "string" ? details.fullDescription : undefined,
    whyItMatters: typeof details.whyItMatters === "string" ? details.whyItMatters : undefined,
    timeline: typeof details.timeline === "string" ? details.timeline : undefined,
    problem: typeof details.problem === "string" ? details.problem : undefined,
    solution: typeof details.solution === "string" ? details.solution : undefined,
    approach: typeof details.approach === "string" ? details.approach : undefined,
    keyImprovements: readStringArray(details.keyImprovements),
    beforeAfter: readBeforeAfter(details.beforeAfter),
    technicalHighlights: readStringArray(details.technicalHighlights),
    media: readMedia(details.media),
    impactMetrics: readStringArray(details.impactMetrics),
    items: readItems(details.items),
  };
}

function normalizeFeature(feature: RoadmapFeature): RoadmapFeature {
  return {
    ...feature,
    details: parseDetails(feature.details),
    tags: feature.tags ?? [],
  };
}

async function fetchRoadmapStatusItems(
  status: RoadmapStatus,
  sort: RoadmapSort,
): Promise<RoadmapFeature[]> {
  const items: RoadmapFeature[] = [];
  let offset = 0;

  while (true) {
    const query = new URLSearchParams({
      status,
      sort,
      limit: "20",
      offset: offset.toString(),
    });

    const listData = await fetchApiData<RoadmapListPayload>(`/roadmap?${query.toString()}`);

    items.push(...listData.items.map(normalizeFeature));

    if (!listData.hasMore || listData.pagination.nextOffset === null) {
      break;
    }

    offset = listData.pagination.nextOffset;
  }

  return items;
}

function nowIso() {
  return new Date().toISOString();
}

export async function fetchRoadmapFromBackend(query: RoadmapQuery = {}): Promise<RoadmapResponse> {
  const sort = query.sort ?? "newest";

  const statuses: RoadmapStatus[] = query.status ? [query.status] : ["todo", "in-progress", "done"];

  const statusEntries = await Promise.all(
    statuses.map(async (status) => {
      const items = await fetchRoadmapStatusItems(status, sort);
      return [status, items] as const;
    }),
  );

  const sectionsMap = Object.fromEntries(statusEntries) as Record<RoadmapStatus, RoadmapFeature[]>;

  const sections = statuses.map((status) => {
    return {
      status,
      title: statusTitles[status],
      items: sectionsMap[status] ?? [],
      fetchedAt: query.refreshSection === status ? nowIso() : nowIso(),
    } satisfies RoadmapSectionResponse;
  });

  return {
    generatedAt: nowIso(),
    sections,
    query: {
      sort,
    },
  };
}

export async function fetchRoadmapFeatureById(id: string): Promise<RoadmapFeature | null> {
  try {
    const feature = await fetchApiData<RoadmapFeature>(`/roadmap/${id}`);

    return normalizeFeature(feature);
  } catch {
    return null;
  }
}

export async function fetchSuggestedRoadmapItems(
  feature: RoadmapFeature,
  limit = 3,
): Promise<RoadmapFeature[]> {
  const related = await fetchRoadmapStatusItems(feature.status, "newest");

  return related.filter((item) => item.id !== feature.id).slice(0, limit);
}
