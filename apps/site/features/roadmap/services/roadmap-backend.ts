import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";

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

async function fetchRoadmapStatusItems(
  status: RoadmapStatus,
  sort: RoadmapSort,
): Promise<RoadmapFeature[]> {
  const itemsMap = new Map<string, RoadmapFeature>();
  let offset = 0;

  // Always cached. Manual refresh goes through `refreshRoadmapPath` (a Server Action
  // calling revalidatePath) rather than a per-request `cache: "no-store"` bypass, so a
  // refresh refills the shared cache instead of fanning out uncached backend calls.
  const cacheOptions: RequestInit = { next: { revalidate: ROADMAP_REVALIDATE_SECONDS } };

  const MAX_PAGES = 50;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    pageCount++;
    const query = new URLSearchParams({
      status,
      sort,
      limit: "20",
      offset: offset.toString(),
    });

    const listData = await fetchApiData<RoadmapListPayload>(
      `/roadmap?${query.toString()}`,
      cacheOptions,
    );

    for (const rawItem of listData.items) {
      if (!itemsMap.has(rawItem.id)) {
        itemsMap.set(rawItem.id, normalizeFeature(rawItem));
      }
    }

    if (
      !listData.hasMore ||
      listData.pagination.nextOffset === null ||
      listData.pagination.nextOffset <= offset
    ) {
      break;
    }

    offset = listData.pagination.nextOffset;
  }

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
        const items = await fetchRoadmapStatusItems(status, sort).catch(() => []);
        return [status, items] as const;
      }),
    );

    const sectionsMap = Object.fromEntries(statusEntries) as Record<
      RoadmapStatus,
      RoadmapFeature[]
    >;

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
    };
  }
}

/** One week - the sitemap's own cadence, independent of the 5-minute page cache. */
const SITEMAP_REVALIDATE_SECONDS = 604800;

/**
 * The backend caps `limit` at 50. Deliberately different from the pages' `limit=20` so
 * this keeps its own Data Cache entry - see `fetchRoadmapSitemapEntries`.
 */
const SITEMAP_PAGE_SIZE = 50;

/** 50 x 20 = 1000 roadmap items per status, far beyond any realistic board. */
const SITEMAP_MAX_PAGES = 20;

export interface RoadmapSitemapEntry {
  id: string;
  updatedAt: string;
}

/**
 * Roadmap URLs for the sitemap, cached on the sitemap's own schedule.
 *
 * The page-facing reads are cached for 300s. Next collapses a route's revalidate to the
 * minimum of its segment value and every fetch inside it, so calling those helpers here
 * silently dragged /sitemap.xml down to 5 minutes no matter what the segment declared.
 *
 * Requesting the backend's maximum `limit=50` produces a different URL from the pages'
 * `limit=20`, so this gets its own Data Cache entry and its own lifetime - rather than
 * two different revalidate values fighting over one key. It also fetches in far fewer
 * round trips, which is all a list of ids and timestamps needs.
 */
export async function fetchRoadmapSitemapEntries(): Promise<RoadmapSitemapEntry[]> {
  const statuses: RoadmapStatus[] = ["todo", "in-progress", "done"];

  const perStatus = await Promise.all(
    statuses.map(async (status) => {
      const entries: RoadmapSitemapEntry[] = [];
      let offset = 0;

      try {
        for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
          const query = new URLSearchParams({
            status,
            sort: "newest",
            limit: SITEMAP_PAGE_SIZE.toString(),
            offset: offset.toString(),
          });

          const listData = await fetchApiData<RoadmapListPayload>(`/roadmap?${query.toString()}`, {
            next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
          });

          entries.push(
            ...listData.items.map((item) => ({ id: item.id, updatedAt: item.updatedAt })),
          );

          const nextOffset = listData.pagination.nextOffset;
          if (!listData.hasMore || nextOffset === null || nextOffset <= offset) break;

          offset = nextOffset;
        }
      } catch {
        // Degrade to whatever this status already yielded rather than losing every
        // roadmap URL because one page failed.
      }

      return entries;
    }),
  );

  return perStatus.flat();
}

export async function fetchRoadmapFeatureById(id: string): Promise<RoadmapFeature | null> {
  try {
    const feature = await fetchApiData<RoadmapFeature>(`/roadmap/${id}`, {
      next: { revalidate: ROADMAP_REVALIDATE_SECONDS },
    });

    return normalizeFeature(feature);
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
      next: { revalidate: ROADMAP_REVALIDATE_SECONDS },
    });

    return listData.items.map(normalizeFeature);
  } catch {
    return [];
  }
}
