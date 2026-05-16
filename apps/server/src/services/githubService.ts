import { config } from "#config";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";
import { cacheDel, cacheDelByPrefix, cacheGet, cacheSet } from "#utils/redis";

export type GitHubStatus = "todo" | "in-progress" | "done";
export type GitHubItemKind = "issue" | "pull-request";

export type GitHubIssuesQuery = {
  status?: GitHubStatus;
  kind?: GitHubItemKind | "all";
  limit: number;
  offset: number;
};

export type GitHubIssuesResult = {
  items: Awaited<ReturnType<typeof prisma.gitHubSyncItem.findMany>>;
  total: number;
  limit: number;
  offset: number;
};

interface GitHubIssuePayload {
  id: number;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  state: "open" | "closed";
  pull_request?: unknown;
}

export interface GitHubItemSnapshot {
  id: string;
  number: number;
  title: string;
  status: GitHubStatus;
  kind: GitHubItemKind;
  url: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
}

const MAX_GITHUB_FETCH_RETRIES = 3;
const PROJECT_URL = config.github.projectUrl;
const REDIS_STATS_KEY = `github:stats:${PROJECT_URL}`;
const RETRYABLE_GITHUB_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const ISSUES_CACHE_PREFIX = `github:issues:${encodeURIComponent(PROJECT_URL)}:`;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRetryDelayMs(response: Response, attempt: number) {
  const retryAfterHeader = response.headers.get("retry-after");

  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds * 1000, 30_000);
    }
  }

  if (response.status === 429) {
    const rateLimitResetHeader = response.headers.get("x-ratelimit-reset");

    if (rateLimitResetHeader) {
      const resetEpochSeconds = Number.parseInt(rateLimitResetHeader, 10);

      if (Number.isFinite(resetEpochSeconds)) {
        const untilResetMs = resetEpochSeconds * 1000 - Date.now();

        if (untilResetMs > 0) {
          return Math.min(untilResetMs, 30_000);
        }
      }
    }
  }

  const backoffMs = 1000 * 2 ** attempt;

  return Math.min(backoffMs, 10_000);
}

/**
 * Map GitHub issue to internal status.
 */

function classifyIssue(issue: GitHubIssuePayload): GitHubStatus {
  if (issue.state === "closed") return "done";

  const labels = issue.labels.map((label) => label.name.toLowerCase());

  if (labels.includes("done")) return "done";

  if (labels.some((l) => l === "in-progress" || l === "in progress" || l === "active")) {
    return "in-progress";
  }

  return "todo";
}

/**
 * Convert raw GitHub issues into normalized snapshot format.
 */

function buildGitHubIssuesSnapshot(issues: GitHubIssuePayload[]) {
  const snapshots = issues.map<GitHubItemSnapshot>((issue) => ({
    id: `gh-${issue.id}`,
    number: issue.number,
    title: issue.title,
    status: classifyIssue(issue),
    kind: issue.pull_request ? "pull-request" : "issue",
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels: issue.labels.map((label) => label.name),
  }));

  return {
    issues: snapshots,
    todoIssues: snapshots.filter((item) => item.status === "todo"),
    inProgressIssues: snapshots.filter((item) => item.status === "in-progress"),
    doneIssues: snapshots.filter((item) => item.status === "done"),
  };
}

/**
 * Fetch a single page of GitHub issues with retry handling.
 */

async function fetchGitHubIssuesPage(url: string, token: string) {
  let attempt = 0;

  while (attempt <= MAX_GITHUB_FETCH_RETRIES) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.ok) {
      return response;
    }

    if (
      !RETRYABLE_GITHUB_STATUS_CODES.has(response.status) ||
      attempt === MAX_GITHUB_FETCH_RETRIES
    ) {
      const errorBody = (await response.text()).slice(0, 500);

      throw new ApiError(502, "GitHub API communication failed", {
        status: response.status,
        body: errorBody,
      });
    }

    const delayMs = resolveRetryDelayMs(response, attempt);
    await sleep(delayMs);
    attempt += 1;
  }

  throw new ApiError(502, "GitHub API communication failed");
}

/**
 * Fetch cached GitHub project stats or load from DB.
 */

const getGitHubStats = async () => {
  const cached = await cacheGet(REDIS_STATS_KEY);

  if (cached) return cached;

  const latest = await prisma.gitHubSync.findUnique({
    where: { projectUrl: PROJECT_URL },
  });

  if (!latest) return null;

  const response = {
    projectName: latest.projectName,
    stats: {
      total: latest.issueCount,
      todo: latest.todoCount,
      inProgress: latest.inProgressCount,
      done: latest.doneCount,
      completionRate:
        latest.issueCount === 0
          ? "0.00"
          : ((latest.doneCount / latest.issueCount) * 100).toFixed(2),
    },
    syncedAt: latest.syncedAt,
  };

  await cacheSet(REDIS_STATS_KEY, response, 43200);

  return response;
};

/**
 * Fetch all GitHub issues with pagination support.
 */

async function fetchAllGitHubIssues(owner: string, repo: string, token: string, since?: Date) {
  const collected: GitHubIssuePayload[] = [];

  let page = 1;
  const perPage = 100;

  let url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${perPage}`;

  if (since) {
    url += `&since=${since.toISOString()}`;
  }

  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetchGitHubIssuesPage(`${url}&page=${page}`, token);

    const payload = (await response.json()) as GitHubIssuePayload[];
    if (payload.length === 0) {
      hasNextPage = false;
      continue;
    }

    collected.push(...payload.filter((item) => !item.title.startsWith("[Bot]")));

    hasNextPage = payload.length === perPage;

    if (hasNextPage) {
      page += 1;
    }
  }

  return collected;
}

/**
 * Fetch GitHub issues from DB with filters and pagination.
 * Results are cached per query.
 */

const getGitHubIssues = async (query: GitHubIssuesQuery): Promise<GitHubIssuesResult> => {
  const sortedQuery = new URLSearchParams();

  sortedQuery.set("limit", String(query.limit));
  sortedQuery.set("offset", String(query.offset));

  if (query.status) {
    sortedQuery.set("status", query.status);
  }

  if (query.kind) {
    sortedQuery.set("kind", query.kind);
  }

  sortedQuery.sort();

  const queryKey = `${ISSUES_CACHE_PREFIX}${sortedQuery.toString()}`;

  const cached = await cacheGet<GitHubIssuesResult>(queryKey);

  if (cached) return cached;

  const sync = await prisma.gitHubSync.findUnique({
    where: { projectUrl: PROJECT_URL },
    select: { id: true },
  });

  if (!sync) {
    const emptyResult: GitHubIssuesResult = {
      items: [],
      total: 0,
      limit: query.limit,
      offset: query.offset,
    };

    await cacheSet(queryKey, emptyResult, 300);

    return emptyResult;
  }

  const where: {
    syncId: string;
    status?: GitHubStatus;
    kind?: GitHubItemKind;
  } = {
    syncId: sync.id,
  };

  if (query.status) where.status = query.status;
  if (query.kind && query.kind !== "all") where.kind = query.kind;

  const [total, items] = await Promise.all([
    prisma.gitHubSyncItem.count({ where }),
    prisma.gitHubSyncItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: query.offset || 0,
      take: query.limit || 20,
    }),
  ]);

  const result: GitHubIssuesResult = { items, total, limit: query.limit, offset: query.offset };
  await cacheSet(queryKey, result, 300);

  return result;
};

/**
 * Determine whether GitHub stats need syncing (12h interval).
 */

const shouldSyncGitHubStats = async () => {
  const latest = await prisma.gitHubSync.findUnique({
    where: { projectUrl: PROJECT_URL },
    select: { syncedAt: true },
  });

  if (!latest) return true;

  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  return Date.now() - new Date(latest.syncedAt).getTime() >= TWELVE_HOURS_MS;
};

/**
 * Sync GitHub issues from GitHub API into DB and refresh caches.
 */

const syncGitHubStatsFromGitHub = async () => {
  const { owner, repo, token } = config.github;

  const existingSync = await prisma.gitHubSync.findUnique({
    where: { projectUrl: PROJECT_URL },
    select: { syncedAt: true, id: true },
  });

  const sinceDate = existingSync?.syncedAt ? new Date(existingSync.syncedAt) : undefined;

  const rawIssues = await fetchAllGitHubIssues(owner, repo, token, sinceDate);

  if (rawIssues.length === 0 && existingSync) {
    const updatedSync = await prisma.gitHubSync.update({
      where: { id: existingSync.id },
      data: { syncedAt: new Date(), nextSyncAt: new Date(Date.now() + 43200000) },
    });

    await cacheDel(REDIS_STATS_KEY);

    return updatedSync;
  }

  const snapshot = buildGitHubIssuesSnapshot(rawIssues);
  const CHUNK_SIZE = 50;

  const syncRecord = await prisma.$transaction(
    async (tx) => {
      const sync = await tx.gitHubSync.upsert({
        where: { projectUrl: PROJECT_URL },
        create: {
          projectName: `${owner}/${repo}`,
          projectUrl: PROJECT_URL,
          issueCount: 0,
          todoCount: 0,
          inProgressCount: 0,
          doneCount: 0,
          data: { lastSyncedBy: "System" },
          nextSyncAt: new Date(Date.now() + 43200000),
        },
        update: {
          syncedAt: new Date(),
          nextSyncAt: new Date(Date.now() + 43200000),
        },
      });

      const chunks = [];

      for (let i = 0; i < snapshot.issues.length; i += CHUNK_SIZE) {
        chunks.push(snapshot.issues.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((item) => {
            const githubId = item.id.replace("gh-", "");
            return tx.gitHubSyncItem.upsert({
              where: {
                syncId_githubId: { syncId: sync.id, githubId },
              },

              create: {
                syncId: sync.id,
                githubId,
                number: item.number,
                title: item.title,
                status: item.status,
                kind: item.kind,
                url: item.url,
                labels: item.labels,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt),
              },

              update: {
                title: item.title,
                status: item.status,
                labels: item.labels,
                updatedAt: new Date(item.updatedAt),
              },
            });
          }),
        );
      }

      const [todoCount, inProgressCount, doneCount] = await Promise.all([
        tx.gitHubSyncItem.count({ where: { syncId: sync.id, status: "todo" } }),
        tx.gitHubSyncItem.count({ where: { syncId: sync.id, status: "in-progress" } }),
        tx.gitHubSyncItem.count({ where: { syncId: sync.id, status: "done" } }),
      ]);

      const issueCount = todoCount + inProgressCount + doneCount;

      return tx.gitHubSync.update({
        where: { id: sync.id },
        data: { issueCount, todoCount, inProgressCount, doneCount },
      });
    },
    { timeout: 30000 },
  );

  await cacheDel(REDIS_STATS_KEY);
  await cacheDelByPrefix(ISSUES_CACHE_PREFIX);

  return syncRecord;
};

export { getGitHubStats, getGitHubIssues, shouldSyncGitHubStats, syncGitHubStatsFromGitHub };
