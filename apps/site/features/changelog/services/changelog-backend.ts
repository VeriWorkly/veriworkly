import { fetchApiData, ApiRequestError } from "@/utils/fetchApiData";
import { siteConfig } from "@/config/site";

/** One week: every release ships with a deploy that drops this cache; the timer only backstops backend edits. */

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

/** Release bodies are parsed line by line, so markdown structure leaks into entries; cleaned once here for list and detail. */
const RULE_LINE = /^\s*[-*_]{3,}\s*$/;
const TRAILING_RULE = /\s+[-*_]{3,}\s*$/;
const PR_LINE = /^\*{0,2}#(\d+)\*{0,2}\s+[—–-]\s+`?(.+?)`?(?:\s+by\s+@[\w-]+)?$/;

function cleanText(text: string) {
  return text
    .split("\n")
    .filter((line) => !RULE_LINE.test(line))
    .join("\n")
    .replace(TRAILING_RULE, "")
    .trim();
}

export function normalizeEntry(entry: ChangelogEntry): ChangelogEntry {
  const prRefs = parsePrRefs(entry.prRefs) ?? [];
  const known = new Set(prRefs.map((pr) => pr.number));

  const clean = (items: string[] | undefined) => {
    const kept = new Set<string>();

    for (const raw of items ?? []) {
      const item = cleanText(raw);
      const pr = PR_LINE.exec(item);

      if (pr) {
        const number = Number(pr[1]);

        if (!known.has(number)) {
          known.add(number);
          prRefs.push({
            number,
            title: pr[2]!.trim(),
            url: `${siteConfig.links.github}/pull/${number}`,
          });
        }
      } else if (item) kept.add(item);
    }

    return [...kept];
  };

  const summary = entry.summary ? cleanText(entry.summary) : "";

  return {
    ...entry,
    summary: summary || null,
    // "auto-synced" marks rows the release sync owns; it is bookkeeping, not a topic.
    tags: (entry.tags ?? []).filter((tag) => tag !== "auto-synced"),
    added: clean(entry.added),
    improved: clean(entry.improved),
    fixed: clean(entry.fixed),
    breaking: clean(entry.breaking),
    security: clean(entry.security),
    prRefs,
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

/** `limit=1` keeps a separate Data Cache key from the page's read; null lets the caller avoid a wrong lastmod. */

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

/** Hard ceiling on the index walk: a render must not start an unbounded loop against a misbehaving backend. */

const MAX_INDEX_PAGES = 8;

/** Reuses the listing's exact URLs (Data Cache hits). Throws on outage: an empty index would bake every release as a 404. */

async function fetchAllChangelogEntries(): Promise<ChangelogEntry[]> {
  const collected: ChangelogEntry[] = [];

  for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
    const { entries, total } = await fetchChangelogPage({}, page);

    collected.push(...entries);

    if (entries.length === 0 || collected.length >= total) break;
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

/** Compact newest-first list, for `generateStaticParams` and the sitemap. Throws on outage. */
export async function fetchChangelogIndex(): Promise<ChangelogIndexItem[]> {
  return (await fetchAllChangelogEntries()).map(toIndexItem);
}

export interface ChangelogDetail {
  entry: ChangelogEntry;
  older: ChangelogIndexItem | null;
  newer: ChangelogIndexItem | null;
  isLatest: boolean;
}

/** `null` means the release does not exist (404); any other failure throws so ISR keeps the last good copy. */

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

/** Entry ids are slugged versions ("v3-31-0"): anything else, `stats` included, would reach another backend route. */
const CHANGELOG_ID = /^v[\w-]{1,80}$/;

export async function fetchChangelogEntryById(id: string): Promise<ChangelogEntry | null> {
  if (!CHANGELOG_ID.test(id)) return null;

  try {
    const entry = await fetchApiData<ChangelogEntry>(`/changelog/${encodeURIComponent(id)}`, {
      next: { revalidate: CHANGELOG_REVALIDATE_SECONDS },
    });

    return typeof entry?.title === "string" ? normalizeEntry(entry) : null;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;

    throw err;
  }
}
