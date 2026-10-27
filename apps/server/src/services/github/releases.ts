import { fetchGitHubApi } from "./client.js";
import type {
  GitHubPullRequestPayload,
  GitHubPullRequestSummary,
  GitHubReleasePayload,
  MergedPullRequest,
} from "./types.js";

/**
 * Fetch a single pull request's title, URL, and author from GitHub.
 * Used to enrich changelog PR references with real contributor data.
 */
export async function fetchPullRequestSummary(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<GitHubPullRequestSummary> {
  const response = await fetchGitHubApi(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    token,
  );

  const payload = (await response.json()) as GitHubPullRequestPayload;

  return {
    title: payload.title,
    url: payload.html_url,
    author: payload.user
      ? {
          login: payload.user.login,
          avatarUrl: payload.user.avatar_url,
          htmlUrl: payload.user.html_url,
        }
      : null,
  };
}

/**
 * Fetch every published release for a repo (no drafts, no prereleases), oldest to newest.
 */
export async function fetchAllGitHubReleases(
  owner: string,
  repo: string,
  token: string,
): Promise<GitHubReleasePayload[]> {
  const collected: GitHubReleasePayload[] = [];
  let page = 1;
  const perPage = 100;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetchGitHubApi(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`,
      token,
    );

    const payload = (await response.json()) as GitHubReleasePayload[];
    if (payload.length === 0) {
      hasNextPage = false;
      continue;
    }

    // Drafts and prereleases are not shipped: neither becomes a public changelog entry.
    collected.push(...payload.filter((release) => !release.draft && !release.prerelease));
    hasNextPage = payload.length === perPage;
    page += 1;
  }

  return collected.reverse();
}

/**
 * Every merged pull request in the repo, newest first, with its author. One request returns 100,
 * so the whole history costs a couple of calls instead of one per PR.
 */
export async function fetchMergedPullRequests(
  owner: string,
  repo: string,
  token: string,
): Promise<MergedPullRequest[]> {
  const merged: MergedPullRequest[] = [];
  const perPage = 100;

  // ponytail: 20 pages (2,000 closed PRs) is the ceiling; raise it, or filter by date, past that.
  for (let page = 1; page <= 20; page++) {
    const response = await fetchGitHubApi(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&sort=created&direction=desc&per_page=${perPage}&page=${page}`,
      token,
    );
    const payload = (await response.json()) as GitHubPullRequestPayload[];

    for (const pr of payload) {
      if (!pr.merged_at) continue;

      merged.push({
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        author: pr.user
          ? { login: pr.user.login, avatarUrl: pr.user.avatar_url, htmlUrl: pr.user.html_url }
          : null,
        mergedAt: pr.merged_at,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
      });
    }

    if (payload.length < perPage) break;
  }

  return merged;
}
