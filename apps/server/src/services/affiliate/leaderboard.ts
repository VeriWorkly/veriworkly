import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { AFFILIATE_LEADERBOARD_TTL_SECONDS } from "#services/affiliate/constants";
import { leaderboardCacheKey } from "#services/affiliate/cache";

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function buildLeaderboard(period: "monthly" | "all_time") {
  const grouped = await prisma.affiliateCommission.groupBy({
    by: ["affiliateId"],
    where: {
      status: { in: ["AVAILABLE", "PAID"] },
      ...(period === "monthly" ? { createdAt: { gte: monthStart() } } : {}),
    },
    _sum: { amountCents: true },
    _count: { id: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 50,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((item) => item.affiliateId) } },
    select: { id: true, name: true, username: true, image: true, affiliateTier: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  return grouped.map((item, index) => ({
    rank: index + 1,
    earningsCents: item._sum.amountCents ?? 0,
    commissions: item._count.id,
    user: byId.get(item.affiliateId) ?? null,
  }));
}

export async function leaderboard(period: "monthly" | "all_time") {
  const cached = await cacheGet<Awaited<ReturnType<typeof buildLeaderboard>>>(
    leaderboardCacheKey(period),
  );
  if (cached) return cached;
  const result = await buildLeaderboard(period);
  await cacheSet(leaderboardCacheKey(period), result, AFFILIATE_LEADERBOARD_TTL_SECONDS);
  return result;
}
