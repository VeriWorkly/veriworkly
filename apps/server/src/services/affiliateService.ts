import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { ApiError } from "#utils/errors";
import { prisma } from "#utils/prisma";
import { cacheDel, cacheGet, cacheSet } from "#utils/redis";

const tierRateBps = { TIER_1: 200, TIER_2: 300, TIER_3: 500 } as const;
const AFFILIATE_DASHBOARD_TTL_SECONDS = 60;
const AFFILIATE_LEADERBOARD_TTL_SECONDS = 300;
const AFFILIATE_TIERS = [
  { key: "TIER_1", name: "Starter", rateBps: 200, requiredConversions: 0, perks: ["2% commission", "Monthly leaderboard access"] },
  { key: "TIER_2", name: "Growth", rateBps: 300, requiredConversions: 10, perks: ["3% commission", "Priority payout review"] },
  { key: "TIER_3", name: "Partner", rateBps: 500, requiredConversions: 50, perks: ["5% commission", "Priority support", "Partner campaigns"] },
] as const;

function dashboardCacheKey(userId: string) {
  return `affiliate:dashboard:${userId}`;
}

function leaderboardCacheKey(period: "monthly" | "all_time") {
  return `affiliate:leaderboard:${period}`;
}

async function invalidateAffiliate(userId: string, leaderboard = false) {
  await Promise.all([
    cacheDel(dashboardCacheKey(userId)),
    ...(leaderboard
      ? [cacheDel(leaderboardCacheKey("monthly")), cacheDel(leaderboardCacheKey("all_time"))]
      : []),
  ]);
}

function createCode() {
  return randomBytes(5).toString("hex");
}

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export class AffiliateService {
  static async enroll(userId: string) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { affiliateStatus: true, affiliateCode: true },
    });
    if (!current) throw new ApiError(404, "User not found.");
    if (current.affiliateStatus === "ACTIVE" || current.affiliateStatus === "PENDING")
      return this.getDashboard(userId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: {
              affiliateStatus: "ACTIVE",
              affiliateCode: current.affiliateCode || createCode(),
              affiliateEnrolledAt: new Date(),
            },
          }),
          prisma.affiliateWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
        ]);
        await invalidateAffiliate(userId);
        return this.getDashboard(userId);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
          throw error;
      }
    }
    throw new ApiError(503, "Could not create a unique affiliate code.");
  }

  static async trackClick(code: string, referrerHost?: string) {
    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: code.toLowerCase() },
      select: { id: true, affiliateStatus: true },
    });
    if (!affiliate || affiliate.affiliateStatus !== "ACTIVE")
      throw new ApiError(404, "Affiliate link not found.");

    await prisma.affiliateClick.create({
      data: { affiliateId: affiliate.id, code: code.toLowerCase(), referrerHost },
    });
    await invalidateAffiliate(affiliate.id);
    return { tracked: true };
  }

  static async applyReferral(userId: string, code: string) {
    const affiliate = await prisma.user.findUnique({
      where: { affiliateCode: code.toLowerCase() },
      select: { id: true, affiliateStatus: true },
    });
    if (!affiliate || affiliate.affiliateStatus !== "ACTIVE")
      throw new ApiError(404, "Affiliate code not found.");
    if (affiliate.id === userId) throw new ApiError(400, "Self-referrals are not allowed.");

    try {
      const referral = await prisma.affiliateReferral.create({
        data: { affiliateId: affiliate.id, referredUserId: userId, code: code.toLowerCase() },
      });
      await invalidateAffiliate(affiliate.id);
      return referral;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ApiError(409, "This account already has a referral.");
      throw error;
    }
  }

  static async getDashboard(userId: string) {
    const cached = await cacheGet<Awaited<ReturnType<typeof AffiliateService.buildDashboard>>>(
      dashboardCacheKey(userId),
    );
    if (cached) return cached;
    const result = await this.buildDashboard(userId);
    await cacheSet(dashboardCacheKey(userId), result, AFFILIATE_DASHBOARD_TTL_SECONDS);
    return result;
  }

  private static async buildDashboard(userId: string) {
    const [user, wallet, clicks, referrals, commissions, withdrawals] = await Promise.all([
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

    const result = {
      ...user,
      clicks,
      referrals,
      conversions: referrals.filter((item) => item.status === "CONVERTED").length,
      commissions,
      withdrawals,
      wallet: wallet ?? { pendingCents: 0, availableCents: 0, paidCents: 0 },
      minimumWithdrawalCents: 2_500,
      tierProgress: {
        currentConversions: referrals.filter((item) => item.status === "CONVERTED").length,
        nextTierConversions:
          user.affiliateTier === "TIER_1" ? 10 : user.affiliateTier === "TIER_2" ? 50 : null,
      },
      tiers: AFFILIATE_TIERS,
    };
    return result;
  }

  static async leaderboard(period: "monthly" | "all_time") {
    const cached = await cacheGet<Awaited<ReturnType<typeof AffiliateService.buildLeaderboard>>>(
      leaderboardCacheKey(period),
    );
    if (cached) return cached;
    const result = await this.buildLeaderboard(period);
    await cacheSet(leaderboardCacheKey(period), result, AFFILIATE_LEADERBOARD_TTL_SECONDS);
    return result;
  }

  private static async buildLeaderboard(period: "monthly" | "all_time") {
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

    const result = grouped.map((item, index) => ({
      rank: index + 1,
      earningsCents: item._sum.amountCents ?? 0,
      commissions: item._count.id,
      user: byId.get(item.affiliateId) ?? null,
    }));
    return result;
  }

  static async requestWithdrawal(userId: string, amountCents: number) {
    const result = await prisma.$transaction(async (tx) => {
      const active = await tx.affiliateWithdrawal.findFirst({
        where: { userId, status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true },
      });
      if (active) throw new ApiError(409, "You already have an active withdrawal request.");

      const reserved = await tx.affiliateWallet.updateMany({
        where: { userId, availableCents: { gte: amountCents } },
        data: { availableCents: { decrement: amountCents } },
      });
      if (reserved.count === 0) throw new ApiError(400, "Available balance is too low.");

      return tx.affiliateWithdrawal.create({ data: { userId, amountCents } });
    });
    await invalidateAffiliate(userId);
    return result;
  }

  static async createCommission(input: {
    referredUserId: string;
    subscriptionId?: string;
    providerPaymentId: string;
    purchaseAmountCents: number;
    status: "PENDING" | "AVAILABLE";
    reason?: string;
  }) {
    const referral = await prisma.affiliateReferral.findUnique({
      where: { referredUserId: input.referredUserId },
      include: { affiliate: { select: { affiliateTier: true, affiliateStatus: true } } },
    });
    if (!referral || referral.affiliate.affiliateStatus !== "ACTIVE")
      throw new ApiError(404, "Active affiliate referral not found.");

    const rateBps = tierRateBps[referral.affiliate.affiliateTier];
    const amountCents = Math.floor((input.purchaseAmountCents * rateBps) / 10_000);
    if (amountCents < 1) throw new ApiError(400, "Commission amount is too small.");

    const result = await prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.create({
        data: {
          affiliateId: referral.affiliateId,
          referralId: referral.id,
          subscriptionId: input.subscriptionId,
          providerPaymentId: input.providerPaymentId,
          amountCents,
          rateBps,
          status: input.status,
          availableAt: input.status === "AVAILABLE" ? new Date() : null,
          reason: input.reason,
        },
      });
      await tx.affiliateReferral.update({
        where: { id: referral.id },
        data: { status: "CONVERTED", convertedAt: referral.convertedAt ?? new Date() },
      });
      await tx.affiliateWallet.upsert({
        where: { userId: referral.affiliateId },
        create: {
          userId: referral.affiliateId,
          pendingCents: input.status === "PENDING" ? amountCents : 0,
          availableCents: input.status === "AVAILABLE" ? amountCents : 0,
        },
        update:
          input.status === "PENDING"
            ? { pendingCents: { increment: amountCents } }
            : { availableCents: { increment: amountCents } },
      });
      return commission;
    });
    await invalidateAffiliate(referral.affiliateId, true);
    return result;
  }

  static async updateWithdrawal(id: string, status: "APPROVED" | "REJECTED" | "PAID", note?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.affiliateWithdrawal.findUnique({ where: { id } });
      if (!withdrawal) throw new ApiError(404, "Withdrawal not found.");
      if (["REJECTED", "PAID"].includes(withdrawal.status))
        throw new ApiError(409, "Withdrawal is already finalized.");
      if (status === "PAID" && withdrawal.status !== "APPROVED")
        throw new ApiError(409, "Approve the withdrawal before marking it paid.");

      if (status === "REJECTED") {
        await tx.affiliateWallet.update({
          where: { userId: withdrawal.userId },
          data: { availableCents: { increment: withdrawal.amountCents } },
        });
      }
      if (status === "PAID") {
        await tx.affiliateWallet.update({
          where: { userId: withdrawal.userId },
          data: { paidCents: { increment: withdrawal.amountCents } },
        });
      }

      return tx.affiliateWithdrawal.update({
        where: { id },
        data: {
          status,
          payoutNote: note,
          reviewedAt: new Date(),
          paidAt: status === "PAID" ? new Date() : null,
        },
      });
    });
    await invalidateAffiliate(result.userId);
    return result;
  }

  static async updateCommission(id: string, status: "AVAILABLE" | "REVERSED", reason?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const commission = await tx.affiliateCommission.findUnique({ where: { id } });
      if (!commission) throw new ApiError(404, "Commission not found.");
      if (commission.status !== "PENDING") throw new ApiError(409, "Only pending commissions can be updated.");
      await tx.affiliateWallet.update({
        where: { userId: commission.affiliateId },
        data: {
          pendingCents: { decrement: commission.amountCents },
          ...(status === "AVAILABLE" ? { availableCents: { increment: commission.amountCents } } : {}),
        },
      });
      return tx.affiliateCommission.update({
        where: { id },
        data: {
          status,
          reason,
          availableAt: status === "AVAILABLE" ? new Date() : null,
          reversedAt: status === "REVERSED" ? new Date() : null,
        },
      });
    });
    await invalidateAffiliate(result.affiliateId, true);
    return result;
  }

  static async adminOverview() {
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

  static async updateAffiliate(
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
}
