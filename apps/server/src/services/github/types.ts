export type GitHubStatus = "todo" | "in-progress" | "done";
export type GitHubItemKind = "issue" | "pull-request";

/** A Prisma DateTime filter: `gte` from, and `lte` (a datetime) or `lt` (the day after a date). */
export type GitHubDateRange = { gte?: Date; lte?: Date; lt?: Date };

export type GitHubIssuesQuery = {
  status?: GitHubStatus;
  kind?: GitHubItemKind | "all";
  createdAt?: GitHubDateRange;
  updatedAt?: GitHubDateRange;
  limit: number;
  offset: number;
};

/** The public shape of a board item: no sync bookkeeping (syncId, githubId, insertedAt). */
export interface GitHubIssueItem {
  id: string;
  number: number;
  title: string;
  status: string;
  kind: string;
  url: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type GitHubIssuesResult = {
  items: GitHubIssueItem[];
  total: number;
  limit: number;
  offset: number;
  /** When the board was last synced from GitHub; null before the first sync. */
  syncedAt: Date | null;
};

export interface GitHubIssuePayload {
  id: number;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string }>;
  state: "open" | "closed";
  /** Why a closed issue was closed: `completed`, `not_planned`, `duplicate` or `reopened`. */
  state_reason?: string | null;
  /** Present on a pull request; `merged_at` is null for one closed without merging. */
  pull_request?: { merged_at?: string | null } | null;
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

export interface GitHubPullRequestPayload {
  number: number;
  title: string;
  html_url: string;
  user: { login: string; avatar_url: string; html_url: string } | null;
  /** Present on list responses; null when the PR was closed without merging. */
  merged_at?: string | null;
  head: { ref: string };
  base: { ref: string };
}

export interface MergedPullRequest {
  number: number;
  title: string;
  url: string;
  author: { login: string; avatarUrl: string; htmlUrl: string } | null;
  mergedAt: string;
  headRef: string;
  baseRef: string;
}

export interface GitHubPullRequestSummary {
  title: string;
  url: string;
  author: { login: string; avatarUrl: string; htmlUrl: string } | null;
}

export interface GitHubContributorItem {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
}

export interface GitHubReleasePayload {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}

export interface ParsedReleaseBody {
  summary: string | null;
  added: string[];
  improved: string[];
  fixed: string[];
  breaking: string[];
  security: string[];
  /** The release's own pull request list ("**#191** — title"), kept out of the change lists. */
  pullRequests: Array<{ number: number; title: string }>;
}
