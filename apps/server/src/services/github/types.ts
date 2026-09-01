import type { prisma } from "#lib/prisma";

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

export interface GitHubIssuePayload {
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

export interface GitHubPullRequestPayload {
  title: string;
  html_url: string;
  user: { login: string; avatar_url: string; html_url: string } | null;
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
}
