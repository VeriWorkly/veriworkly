import { cacheDel } from "#lib/redis";

export function dashboardCacheKey(userId: string) {
  return `affiliate:dashboard:${userId}`;
}

export function leaderboardCacheKey(period: "monthly" | "all_time") {
  return `affiliate:leaderboard:${period}`;
}

/** Both public leaderboards: they carry each listed affiliate's display name and tier. */
export async function invalidateLeaderboards() {
  await Promise.all([
    cacheDel(leaderboardCacheKey("monthly")),
    cacheDel(leaderboardCacheKey("all_time")),
  ]);
}

export async function invalidateAffiliate(userId: string, leaderboard = false) {
  await Promise.all([
    cacheDel(dashboardCacheKey(userId)),
    ...(leaderboard ? [invalidateLeaderboards()] : []),
  ]);
}
