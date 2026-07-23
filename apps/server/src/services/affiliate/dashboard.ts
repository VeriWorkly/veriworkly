import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { AFFILIATE_DASHBOARD_TTL_SECONDS, AFFILIATE_MINIMUM_WITHDRAWAL_CENTS, AFFILIATE_TIERS } from "#services/affiliate/constants";
import { dashboardCacheKey } from "#services/affiliate/cache";

async function buildDashboard(userId: string) {
  const [user, wallet, clicks, totalReferrals, convertedReferrals, referrals, commissions, withdrawals] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          affiliateStatus: true,
          affiliateTier: true,
          affiliateCode: true,
          affiliateEnrolledAt: true,
        },
      }),
      prisma.affiliateWallet.findUnique({ where: { userId } }),
      prisma.affiliateClick.count({ where: { affiliateId: userId } }),
      prisma.affiliateReferral.count({ where: { affiliateId: userId } }),
      prisma.affiliateReferral.count({ where: { affiliateId: userId, status: "CONVERTED" } }),
      prisma.affiliateReferral.findMany({
        where: { affiliateId: userId },
        select: { id: true, status: true, createdAt: true, convertedAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.affiliateCommission.findMany({
        where: { affiliateId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.affiliateWithdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);
  if (!user) throw new ApiError(404, "User not found.");

  return {
    ...user,
    clicks,
    // `referrals` is a recency-limited preview list for the activity feed; `totalReferrals` and
    // `conversions` are exact counts and must be used for any metric or progress calculation.
    referrals,
    totalReferrals,
    conversions: convertedReferrals,
    commissions,
    withdrawals,
    wallet: wallet ?? { pendingCents: 0, availableCents: 0, paidCents: 0 },
    minimumWithdrawalCents: AFFILIATE_MINIMUM_WITHDRAWAL_CENTS,
    tierProgress: {
      currentConversions: convertedReferrals,
      nextTierConversions:
        user.affiliateTier === "TIER_1" ? 10 : user.affiliateTier === "TIER_2" ? 50 : null,
    },
    tiers: AFFILIATE_TIERS,
  };
}

export async function getDashboard(userId: string) {
  const cached = await cacheGet<Awaited<ReturnType<typeof buildDashboard>>>(
    dashboardCacheKey(userId),
  );
  if (cached) return cached;
  const result = await buildDashboard(userId);
  await cacheSet(dashboardCacheKey(userId), result, AFFILIATE_DASHBOARD_TTL_SECONDS);
  return result;
}
