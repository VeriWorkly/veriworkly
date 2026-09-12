import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";

/**
 * One week. The changelog only changes when a release ships, and every release ships
 * with a deploy - which rebuilds the app and drops this cache anyway. So the deploy is
 * the real invalidation event, and the timer is just a backstop for the case where an
 * entry is edited in the backend without a corresponding release.
 *
 * The previous 5-minute window spent far more effort revalidating than the data ever
 * changed.
 */

const CHANGELOG_REVALIDATE_SECONDS = 604800;

export type ChangelogType = "major" | "minor" | "patch";

export interface ChangelogPrAuthor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface ChangelogPrRef {
  number: number;
  title: string;
  url?: string;
  author?: ChangelogPrAuthor | null;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  summary: string | null;
  type: ChangelogType;
  publishedAt: string;
  githubUrl: string | null;
  added: string[];
  improved: string[];
  fixed: string[];
  breaking: string[];
  security: string[];
  tags: string[];
  prRefs?: ChangelogPrRef[] | null;
}

interface ChangelogListPayload {
  items: ChangelogEntry[];
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

export interface ChangelogStats {
  totalEntries: number;
  major: number;
  minor: number;
  patch: number;
  latest: { version: string; publishedAt: string; title: string } | null;
  contributorCount: number;
  topContributors: ChangelogPrAuthor[];
}

export interface ChangelogQuery {
  type?: ChangelogType;
  tag?: string;
  search?: string;
}

export const CHANGELOG_PAGE_SIZE = 15;

export interface ChangelogPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ChangelogResponse {
  entries: ChangelogEntry[];
  stats: ChangelogStats | null;
  pagination: ChangelogPagination;
  generatedAt: string;
}

function parsePrAuthor(raw: unknown): ChangelogPrAuthor | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const item = raw as Record<string, unknown>;

  if (
    typeof item.login !== "string" ||
    typeof item.avatarUrl !== "string" ||
    typeof item.htmlUrl !== "string"
  )
    return null;

  return { login: item.login, avatarUrl: item.avatarUrl, htmlUrl: item.htmlUrl };
}

function parsePrRefs(raw: unknown): ChangelogPrRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  return raw
    .map((entry): ChangelogPrRef | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

      const item = entry as Record<string, unknown>;

      if (typeof item.number !== "number" || typeof item.title !== "string") return null;

      return {
        number: item.number,
        title: item.title,
        url: typeof item.url === "string" ? item.url : undefined,
        author: parsePrAuthor(item.author),
      };
    })
    .filter((entry): entry is ChangelogPrRef => entry !== null);
}

function normalizeEntry(entry: ChangelogEntry): ChangelogEntry {
  return {
    ...entry,
    tags: entry.tags ?? [],
    added: entry.added ?? [],
    improved: entry.improved ?? [],
    fixed: entry.fixed ?? [],
    breaking: entry.breaking ?? [],
    security: entry.security ?? [],
    prRefs: parsePrRefs(entry.prRefs),
  };
}

async function fetchChangelogPage(
  query: ChangelogQuery,
  page: number,
): Promise<{ entries: ChangelogEntry[]; total: number }> {
  const offset = (page - 1) * CHANGELOG_PAGE_SIZE;

  const params = new URLSearchParams({
    limit: CHANGELOG_PAGE_SIZE.toString(),
    offset: offset.toString(),
  });

  if (query.type) params.set("type", query.type);
  if (query.tag) params.set("tag", query.tag);
  if (query.search) params.set("search", query.search);

  const listData = await fetchApiData<ChangelogListPayload>(`/changelog?${params.toString()}`, {
    next: { revalidate: CHANGELOG_REVALIDATE_SECONDS },
  });

  return { entries: listData.items.map(normalizeEntry), total: listData.total };
}

export async function fetchChangelogFromBackend(
  query: ChangelogQuery = {},
  page: number = 1,
): Promise<ChangelogResponse> {
  try {
    const [{ entries, total }, stats] = await Promise.all([
      fetchChangelogPage(query, page),
      fetchApiData<ChangelogStats>("/changelog/stats", {
        next: { revalidate: CHANGELOG_REVALIDATE_SECONDS },
      }).catch(() => null),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / CHANGELOG_PAGE_SIZE));

    return {
      entries,
      stats,
      pagination: { page, pageSize: CHANGELOG_PAGE_SIZE, total, totalPages },
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Failed to fetch changelog from backend:", err);
    return {
      entries: [],
      stats: null,
      pagination: { page, pageSize: CHANGELOG_PAGE_SIZE, total: 0, totalPages: 1 },
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Publish date of the newest release, for the /changelog row in the sitemap.
 *
 * `limit=1` keeps this on a different Data Cache key from the page's `limit=15` read,
 * so the sitemap can hold it for a week without pulling the whole sitemap route down to
 * the changelog page's revalidate window. Returns null when unavailable so the caller
 * can fall back to the deploy timestamp rather than emitting a wrong `lastmod`.
 */

export async function fetchLatestChangelogPublishedAt(): Promise<Date | null> {
  try {
    const listData = await fetchApiData<ChangelogListPayload>("/changelog?limit=1&offset=0", {
      next: { revalidate: 604800 },
    });

    const newest = listData.items[0];

    if (!newest) return null;

    const published = new Date(newest.publishedAt);

    return Number.isNaN(published.getTime()) ? null : published;
  } catch {
    return null;
  }
}

export interface ChangelogIndexItem {
  id: string;
  version: string;
  title: string;
  type: ChangelogType;
  publishedAt: string;
}

/**
 * Hard ceiling on how far back the index walk goes. Each page is a separate week-cached
 * fetch, so the cost is a handful of upstream requests per deploy no matter how many
 * detail pages render - but an unbounded loop against a misbehaving backend is not
 * something a page render should be able to start.
 */

const MAX_INDEX_PAGES = 8;

/**
 * Every release, newest first, assembled from the same paginated `/changelog?limit=15&offset=…`
 * URLs the listing page already fetches. Reusing those exact URLs matters: they are Data Cache
 * hits, so the detail pages and `generateStaticParams` cost no extra backend round trips beyond
 * the listing's own - page 1, which covers almost every lookup, is already warm.
 */

async function fetchAllChangelogEntries(): Promise<ChangelogEntry[]> {
  const collected: ChangelogEntry[] = [];

  try {
    for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
      const { entries, total } = await fetchChangelogPage({}, page);

      collected.push(...entries);

      if (entries.length === 0 || collected.length >= total) break;
    }
  } catch (err) {
    console.error("Failed to build changelog index:", err);
  }

  return collected;
}

function toIndexItem({
  id,
  version,
  title,
  type,
  publishedAt,
}: ChangelogEntry): ChangelogIndexItem {
  return { id, version, title, type, publishedAt };
}

/** Compact newest-first list, for `generateStaticParams` and the sitemap. */
export async function fetchChangelogIndex(): Promise<ChangelogIndexItem[]> {
  return (await fetchAllChangelogEntries()).map(toIndexItem);
}

export interface ChangelogDetail {
  entry: ChangelogEntry;
  /** The release immediately before this one chronologically. */
  older: ChangelogIndexItem | null;
  /** The release immediately after this one chronologically. */
  newer: ChangelogIndexItem | null;
  /** True when this is the most recent release overall. */
  isLatest: boolean;
}

/**
 * Everything a detail page needs in one shot. The entry itself comes out of the cached index
 * rather than a second `/changelog/:id` call - the listing already carries the full record, so
 * the by-id endpoint is only touched for entries older than the index window.
 */

export async function fetchChangelogDetail(id: string): Promise<ChangelogDetail | null> {
  const all = await fetchAllChangelogEntries();
  const position = all.findIndex((item) => item.id === id);

  if (position !== -1)
    return {
      entry: all[position],
      older: all[position + 1] ? toIndexItem(all[position + 1]) : null,
      newer: all[position - 1] ? toIndexItem(all[position - 1]) : null,
      isLatest: position === 0,
    };

  const entry = await fetchChangelogEntryById(id);

  if (!entry) return null;

  return { entry, older: null, newer: null, isLatest: false };
}

export async function fetchChangelogEntryById(id: string): Promise<ChangelogEntry | null> {
  try {
    const entry = await fetchApiData<ChangelogEntry>(`/changelog/${id}`, {
      next: { revalidate: CHANGELOG_REVALIDATE_SECONDS },
    });

    return normalizeEntry(entry);
  } catch (err) {
    if (err instanceof ApiRequestError) return null;

    throw err;
  }
}
