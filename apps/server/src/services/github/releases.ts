import { logger } from "#lib/logger";
import { fetchGitHubApi } from "./client.js";
import type {
  GitHubPullRequestPayload,
  GitHubPullRequestSummary,
  GitHubReleasePayload,
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
 * Fetch every non-draft release for a repo, oldest to newest.
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

    collected.push(...payload.filter((release) => !release.draft));
    hasNextPage = payload.length === perPage;
    page += 1;
  }

  return collected.reverse();
}

/**
 * Derives PR references for a release by diffing it against the previous
 * release tag and pulling PR numbers out of merge-commit messages. Best
 * effort: a failed lookup just drops that ref rather than throwing, and an
 * absent previous tag (oldest release) yields an empty list.
 */
export async function derivePrRefsFromCommits(
  owner: string,
  repo: string,
  token: string,
  baseTag: string | undefined,
  headTag: string,
): Promise<
  Array<{ number: number; title: string; url: string; author: GitHubPullRequestSummary["author"] }>
> {
  if (!baseTag) return [];

  let commits: Array<{ commit: { message: string } }>;

  try {
    const response = await fetchGitHubApi(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseTag}...${headTag}`,
      token,
    );
    const payload = (await response.json()) as { commits?: Array<{ commit: { message: string } }> };
    commits = payload.commits ?? [];
  } catch (error) {
    logger.error(`Failed to compare ${baseTag}...${headTag} for changelog sync`, error);
    return [];
  }

  const prNumbers = new Set<number>();
  for (const { commit } of commits) {
    const match = commit.message.match(/Merge pull request #(\d+)/i);
    if (match) prNumbers.add(Number.parseInt(match[1], 10));
    if (prNumbers.size >= 20) break;
  }

  const refs: Array<{
    number: number;
    title: string;
    url: string;
    author: GitHubPullRequestSummary["author"];
  }> = [];

  for (const number of prNumbers) {
    try {
      const summary = await fetchPullRequestSummary(owner, repo, number, token);
      refs.push({ number, title: summary.title, url: summary.url, author: summary.author });
    } catch (error) {
      logger.error(`Failed to enrich PR #${number} while deriving changelog refs`, error);
    }
  }

  return refs;
}
