import { cacheDel } from "#lib/redis";

export function dashboardCacheKey(userId: string) {
  return `affiliate:dashboard:${userId}`;
}

export function leaderboardCacheKey(period: "monthly" | "all_time") {
  return `affiliate:leaderboard:${period}`;
}

export async function invalidateAffiliate(userId: string, leaderboard = false) {
  await Promise.all([
    cacheDel(dashboardCacheKey(userId)),
    ...(leaderboard
      ? [cacheDel(leaderboardCacheKey("monthly")), cacheDel(leaderboardCacheKey("all_time"))]
      : []),
  ]);
}
