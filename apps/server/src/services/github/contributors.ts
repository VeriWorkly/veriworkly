import { cacheGet, cacheSet } from "#lib/redis";
import { logger } from "#lib/logger";
import { fetchGitHubApi } from "./client.js";
import type { GitHubContributorItem } from "./types.js";

const CONTRIBUTORS_CACHE_TTL = 86400; // 24 hours

/**
 * Fetch top contributors for the repository directly from GitHub API with 24-hour Redis caching.
 */
export async function fetchGitHubContributors(
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubContributorItem[]> {
  const cacheKey = `github:repo:contributors:${owner}:${repo}`;
  const cached = await cacheGet<GitHubContributorItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`;
    const response = await fetchGitHubApi(url, token);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      login?: string;
      avatar_url?: string;
      html_url?: string;
      contributions?: number;
      type?: string;
    }>;

    if (!Array.isArray(data)) return [];

    const contributors: GitHubContributorItem[] = data
      .filter((item) => item.login && item.avatar_url && item.html_url && item.type !== "Bot")
      .map((item) => ({
        login: item.login!,
        avatarUrl: item.avatar_url!,
        htmlUrl: item.html_url!,
        contributions: item.contributions ?? 1,
      }));

    if (contributors.length > 0) {
      await cacheSet(cacheKey, contributors, CONTRIBUTORS_CACHE_TTL);
    }

    return contributors;
  } catch (err) {
    logger.warn("Failed to fetch repository contributors from GitHub API:", err);
    return [];
  }
}
