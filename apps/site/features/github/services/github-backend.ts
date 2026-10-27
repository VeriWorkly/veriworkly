import { fetchApiData } from "@/utils/fetchApiData";

const GITHUB_STATS_REVALIDATE_SECONDS = 300;

export type GitHubStatus = "todo" | "in-progress" | "done";
export type GitHubItemKind = "issue" | "pull-request";
export type GitHubFilterKind = GitHubItemKind | "all";
export type GitHubFilterStatus = GitHubStatus | "all";

export interface GitHubIssueItem {
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

/** As apps/server/src/services/github/issues.ts getGitHubStats returns it. */
export interface GitHubProjectStats {
  projectName: string;
  /** Empty when the server has no project URL configured; the page falls back to the repository link. */
  projectUrl?: string;
  stats: {
    total: number;
    issues: number;
    pullRequests: number;
    todo: number;
    inProgress: number;
    done: number;
    completionRate: string;
  };
  syncedAt: string;
  /** When the next scheduled sync runs; null when no schedule is configured. */
  nextSyncAt?: string | null;
}

export interface GitHubIssuePage {
  items: GitHubIssueItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
  syncedAt: string | null;
}

export async function fetchGitHubStatsFromBackend(options?: RequestInit) {
  return fetchApiData<GitHubProjectStats>("/github/stats", {
    next: { revalidate: GITHUB_STATS_REVALIDATE_SECONDS },
    ...options,
  });
}

export async function fetchGitHubIssuesFromBackend(query: {
  status?: GitHubFilterStatus;
  kind?: GitHubFilterKind;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "all" && value !== null) {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString() ? `?${params.toString()}` : "";

  return fetchApiData<GitHubIssuePage>(`/github/issues${queryString}`, {
    next: { revalidate: GITHUB_STATS_REVALIDATE_SECONDS },
  });
}
