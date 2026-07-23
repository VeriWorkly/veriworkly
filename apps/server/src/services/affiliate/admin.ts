import { prisma } from "#lib/prisma";

import { invalidateAffiliate } from "#services/affiliate/cache";

export async function adminOverview() {
  const [withdrawals, affiliates, commissions, recentCommissions] = await Promise.all([
    prisma.affiliateWithdrawal.findMany({
      include: { user: { select: { name: true, email: true, affiliateCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { affiliateStatus: { not: "NOT_ENROLLED" } },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        affiliateStatus: true,
        affiliateTier: true,
      },
      take: 100,
    }),
    prisma.affiliateCommission.aggregate({ _sum: { amountCents: true }, _count: { id: true } }),
    prisma.affiliateCommission.findMany({
      include: { affiliate: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return { withdrawals, affiliates, commissions, recentCommissions };
}

export async function updateAffiliate(
  userId: string,
  input: { status?: "PENDING" | "ACTIVE" | "SUSPENDED"; tier?: "TIER_1" | "TIER_2" | "TIER_3" },
) {
  const result = await prisma.user.update({
    where: { id: userId },
    data: { affiliateStatus: input.status, affiliateTier: input.tier },
    select: {
      id: true,
      name: true,
      email: true,
      affiliateCode: true,
      affiliateStatus: true,
      affiliateTier: true,
    },
  });
  await invalidateAffiliate(userId, true);
  return result;
}
