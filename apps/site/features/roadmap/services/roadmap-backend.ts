import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";

/** One week as a backstop: the API calls /api/revalidate with the "roadmap" tag after every change. */
const ROADMAP_REVALIDATE_SECONDS = 604800;

export type RoadmapSort = "newest" | "oldest" | "recently-completed";
export type RoadmapStatus = "todo" | "in-progress" | "done";

export interface RoadmapDetailItem {
  name: string;
  description?: string;
  image?: string;
}

export interface RoadmapGithubRef {
  number: number;
  kind: "issue" | "pull-request";
  title: string;
  url: string;
  state?: "open" | "closed" | "merged";
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
  githubRefs?: RoadmapGithubRef[];
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
  /** Columns the backend could not deliver. Empty means every column is real data. */
  failedStatuses: RoadmapStatus[];
}

const statusTitles: Record<RoadmapStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

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

  const readGithubRefs = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((entry): RoadmapGithubRef | null => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
              return null;
            }

            const item = entry as Record<string, unknown>;

            if (
              typeof item.number !== "number" ||
              typeof item.title !== "string" ||
              typeof item.url !== "string" ||
              (item.kind !== "issue" && item.kind !== "pull-request")
            ) {
              return null;
            }

            const state =
              item.state === "open" || item.state === "closed" || item.state === "merged"
                ? item.state
                : undefined;

            return {
              number: item.number,
              kind: item.kind,
              title: item.title,
              url: item.url,
              state,
            };
          })
          .filter((entry): entry is RoadmapGithubRef => entry !== null)
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
    githubRefs: readGithubRefs(details.githubRefs),
  };
}

function normalizeFeature(feature: RoadmapFeature): RoadmapFeature {
  return {
    ...feature,
    details: parseDetails(feature.details),
    tags: feature.tags ?? [],
  };
}

/** The backend caps `limit` at 50; 20 pages of that is far beyond any real board. */
const STATUS_PAGE_SIZE = 50;
const STATUS_MAX_PAGES = 20;

/** The first page reports the total, so the rest are fetched in parallel. */
async function fetchRoadmapStatusItems(
  status: RoadmapStatus,
  sort: RoadmapSort,
): Promise<RoadmapFeature[]> {
  // Always cached; manual refresh goes through refreshRoadmapPath, never a per-request no-store bypass.
  const cacheOptions: RequestInit = {
    next: { revalidate: ROADMAP_REVALIDATE_SECONDS, tags: ["roadmap"] },
  };

  const page = (offset: number) =>
    fetchApiData<RoadmapListPayload>(
      `/roadmap?${new URLSearchParams({
        status,
        sort,
        limit: String(STATUS_PAGE_SIZE),
        offset: String(offset),
      })}`,
      cacheOptions,
    );

  const first = await page(0);
  const pages = Math.min(Math.ceil(first.total / STATUS_PAGE_SIZE), STATUS_MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => page((i + 1) * STATUS_PAGE_SIZE)),
  );

  const itemsMap = new Map<string, RoadmapFeature>();

  for (const listData of [first, ...rest])
    for (const rawItem of listData.items)
      if (!itemsMap.has(rawItem.id)) itemsMap.set(rawItem.id, normalizeFeature(rawItem));

  return Array.from(itemsMap.values());
}

function nowIso() {
  return new Date().toISOString();
}

export async function fetchRoadmapFromBackend(query: RoadmapQuery = {}): Promise<RoadmapResponse> {
  const sort = query.sort ?? "newest";
  const statuses: RoadmapStatus[] = query.status ? [query.status] : ["todo", "in-progress", "done"];

  try {
    const statusEntries = await Promise.all(
      statuses.map(async (status) => {
        try {
          return [status, await fetchRoadmapStatusItems(status, sort), false] as const;
        } catch (err) {
          // One column failing must not blank the others, nor read as an empty column.
          console.error(`Roadmap column "${status}" failed to load:`, err);
          return [status, [] as RoadmapFeature[], true] as const;
        }
      }),
    );

    const sectionsMap = Object.fromEntries(
      statusEntries.map(([status, items]) => [status, items]),
    ) as Record<RoadmapStatus, RoadmapFeature[]>;
    const failedStatuses = statusEntries.filter(([, , failed]) => failed).map(([status]) => status);

    const sections = statuses.map((status) => {
      return {
        status,
        title: statusTitles[status],
        items: sectionsMap[status] ?? [],
        fetchedAt: nowIso(),
      } satisfies RoadmapSectionResponse;
    });

    return {
      generatedAt: nowIso(),
      sections,
      query: {
        sort,
      },
      failedStatuses,
    };
  } catch (err) {
    console.error("Failed to fetch roadmap from backend:", err);
    const sections = statuses.map((status) => ({
      status,
      title: statusTitles[status],
      items: [],
      fetchedAt: nowIso(),
    }));
    return {
      generatedAt: nowIso(),
      sections,
      query: { sort },
      failedStatuses: statuses,
    };
  }
}

/** One week - the sitemap's own cadence, kept apart from the page reads' cache entries. */
const SITEMAP_REVALIDATE_SECONDS = 604800;

/** The backend's maximum. With the "newest" sort these are the pages' own URLs, so they share cache entries (same week, same "roadmap" tag). */
const SITEMAP_PAGE_SIZE = 50;

const SITEMAP_MAX_PAGES = 20;

export interface RoadmapSitemapEntry {
  id: string;
  updatedAt: string;
}

/** Every status, newest first; a failed page throws so the last complete sitemap is kept. */
export async function fetchRoadmapSitemapEntries(): Promise<RoadmapSitemapEntry[]> {
  const statuses: RoadmapStatus[] = ["todo", "in-progress", "done"];

  const perStatus = await Promise.all(
    statuses.map(async (status) => {
      const entries: RoadmapSitemapEntry[] = [];
      let offset = 0;

      // A failed page throws: a partial list would be cached for a week, while throwing keeps the last complete sitemap.
      for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
        const query = new URLSearchParams({
          status,
          sort: "newest",
          limit: SITEMAP_PAGE_SIZE.toString(),
          offset: offset.toString(),
        });

        const listData = await fetchApiData<RoadmapListPayload>(`/roadmap?${query.toString()}`, {
          next: { revalidate: SITEMAP_REVALIDATE_SECONDS, tags: ["roadmap"] },
        });

        entries.push(...listData.items.map((item) => ({ id: item.id, updatedAt: item.updatedAt })));

        const nextOffset = listData.pagination.nextOffset;
        if (!listData.hasMore || nextOffset === null || nextOffset <= offset) break;

        offset = nextOffset;
      }

      return entries;
    }),
  );

  return perStatus.flat();
}

/** Feature ids are slugs; `/roadmap/stats` is another backend route, so a payload without a title is not a feature either. */
const ROADMAP_ID = /^[a-z0-9][a-z0-9-]{0,120}$/i;

export async function fetchRoadmapFeatureById(id: string): Promise<RoadmapFeature | null> {
  if (!ROADMAP_ID.test(id)) return null;

  try {
    const feature = await fetchApiData<RoadmapFeature>(`/roadmap/${encodeURIComponent(id)}`, {
      next: { revalidate: ROADMAP_REVALIDATE_SECONDS, tags: ["roadmap"] },
    });

    return typeof feature?.title === "string" ? normalizeFeature(feature) : null;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function fetchSuggestedRoadmapItems(
  feature: RoadmapFeature,
  limit = 3,
): Promise<RoadmapFeature[]> {
  try {
    const query = new URLSearchParams({
      status: feature.status,
      sort: "newest",
      limit: limit.toString(),
      excludeId: feature.id,
    });

    const listData = await fetchApiData<RoadmapListPayload>(`/roadmap?${query.toString()}`, {
      next: { revalidate: ROADMAP_REVALIDATE_SECONDS, tags: ["roadmap"] },
    });

    return listData.items.map(normalizeFeature);
  } catch {
    return [];
  }
}
