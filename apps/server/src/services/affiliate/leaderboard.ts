import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { AFFILIATE_LEADERBOARD_TTL_SECONDS } from "#services/affiliate/constants";
import { leaderboardCacheKey } from "#services/affiliate/cache";

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * "Jane D.": enough to recognise yourself on a public page, not enough to find the person (V-236).
 * Nobody opted in to being published, so no username, image or id leaves the server.
 */
export function leaderboardDisplayName(name: string | null): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const [first, ...rest] = parts;
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

async function buildLeaderboard(period: "monthly" | "all_time") {
  const grouped = await prisma.affiliateCommission.groupBy({
    by: ["affiliateId"],
    where: {
      status: { in: ["AVAILABLE", "PAID"] },
      // Commissions of deleted affiliates stay as history with no owner; they rank nobody. A
      // suspended or pending affiliate is not ranked either (V-236).
      affiliateId: { not: null },
      affiliate: { affiliateStatus: "ACTIVE" },
      ...(period === "monthly" ? { createdAt: { gte: monthStart() } } : {}),
    },
    _sum: { amountCents: true },
    _count: { id: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 50,
  });
  const affiliateIds = grouped.flatMap((item) => (item.affiliateId ? [item.affiliateId] : []));
  const users = await prisma.user.findMany({
    where: { id: { in: affiliateIds } },
    select: { id: true, name: true, affiliateTier: true },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  const toPublicEntry = (user: (typeof users)[number] | null) =>
    user && { name: leaderboardDisplayName(user.name), affiliateTier: user.affiliateTier };

  return grouped.map((item, index) => ({
    rank: index + 1,
    earningsCents: item._sum.amountCents ?? 0,
    commissions: item._count.id,
    user: toPublicEntry((item.affiliateId && byId.get(item.affiliateId)) || null),
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
