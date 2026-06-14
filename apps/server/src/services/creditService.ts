import { Prisma } from "@prisma/client";

import { getAiModePolicy } from "#services/aiPolicy";
import type { AiActionKey, AiMode } from "#services/aiTypes";
import { ApiError } from "#utils/errors";
import { prisma } from "#utils/prisma";
import { cacheDel, cacheGet, cacheSet } from "#utils/redis";

const CREDIT_SUMMARY_TTL_SECONDS = 30;
const CREDIT_HISTORY_TTL_SECONDS = 60;
const CREDIT_HISTORY_LIMIT = 50;
const CREDIT_RESERVATION_TTL_MS = 5 * 60 * 1000;

type CreditContext = {
  requestId: string;
  action?: string;
  documentId?: string;
  referenceId?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
};

type CreditGrantContext = CreditContext & {
  source: string;
  sourceId: string;
  expiresAt?: Date | null;
};

function validateAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new ApiError(400, "Credit amount must be a positive integer.");
}

function summaryCacheKey(userId: string) {
  return `credits:summary:${userId}`;
}

function historyCacheKey(userId: string) {
  return `credits:history:${userId}`;
}

export class CreditService {
  static async invalidate(userId: string) {
    await Promise.all([
      cacheDel(summaryCacheKey(userId)),
      cacheDel(historyCacheKey(userId)),
      cacheDel(`billing:summary:${userId}`),
    ]);
  }

  static costFor(action: AiActionKey, mode: AiMode = "standard") {
    return getAiModePolicy(action, mode).credits;
  }

  static async releaseExpiredReservations(userId: string, at = new Date()) {
    const expired = await prisma.creditReservation.findMany({
      where: { userId, status: "PENDING", expiresAt: { lte: at } },
      select: { id: true, walletId: true, cost: true },
      take: 100,
    });
    if (!expired.length) return 0;

    const released = await prisma.$transaction(async (tx) => {
      let total = 0;
      for (const reservation of expired) {
        const changed = await tx.creditReservation.updateMany({
          where: { id: reservation.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        if (!changed.count) continue;
        await tx.creditWallet.update({
          where: { id: reservation.walletId },
          data: {
            balance: { increment: reservation.cost },
            reserved: { decrement: reservation.cost },
          },
        });
        total += reservation.cost;
      }
      return total;
    });
    if (released) await this.invalidate(userId);
    return released;
  }

  static async expireCredits(userId: string, at = new Date()) {
    const activeReservations = await prisma.creditReservation.count({
      where: { userId, status: "PENDING", expiresAt: { gt: at } },
    });
    if (activeReservations) return 0;

    const expired = await prisma.creditGrant.findMany({
      where: { userId, remaining: { gt: 0 }, expiresAt: { lte: at } },
      select: { id: true, walletId: true, remaining: true },
      take: 100,
    });
    if (!expired.length) return 0;

    const total = await prisma.$transaction(async (tx) => {
      let expiredTotal = 0;
      for (const grant of expired) {
        const changed = await tx.creditGrant.updateMany({
          where: { id: grant.id, remaining: grant.remaining },
          data: { remaining: 0 },
        });
        if (!changed.count) continue;
        const wallet = await tx.creditWallet.update({
          where: { id: grant.walletId },
          data: {
            balance: { decrement: grant.remaining },
            lifetimeDebited: { increment: grant.remaining },
          },
        });
        const transaction = await tx.creditTransaction.create({
          data: {
            walletId: grant.walletId,
            userId,
            type: "EXPIRATION",
            amount: -grant.remaining,
            balanceAfter: wallet.balance,
            requestId: `expire:${grant.id}`,
            referenceId: grant.id,
            reason: "Credit grant expired",
          },
        });
        await tx.creditUsageAllocation.create({
          data: { transactionId: transaction.id, grantId: grant.id, amount: grant.remaining },
        });
        expiredTotal += grant.remaining;
      }
      return expiredTotal;
    });
    if (total) await this.invalidate(userId);
    return total;
  }

  static async getWallet(userId: string) {
    await this.releaseExpiredReservations(userId);
    await this.expireCredits(userId);
    const cached = await cacheGet<{
      balance: number;
      lifetimeCredited: number;
      lifetimeDebited: number;
      nextExpiryAt: Date | null;
      nextExpiryCredits: number;
      updatedAt: Date;
    }>(summaryCacheKey(userId));
    if (cached) return cached;

    const [wallet, nextGrant] = await Promise.all([
      prisma.creditWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: {
          balance: true,
          reserved: true,
          lifetimeCredited: true,
          lifetimeDebited: true,
          updatedAt: true,
        },
      }),
      prisma.creditGrant.findFirst({
        where: { userId, remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
        select: { expiresAt: true, remaining: true },
      }),
    ]);
    const result = {
      ...wallet,
      nextExpiryAt: nextGrant?.expiresAt ?? null,
      nextExpiryCredits: nextGrant?.remaining ?? 0,
    };
    await cacheSet(summaryCacheKey(userId), result, CREDIT_SUMMARY_TTL_SECONDS);
    return result;
  }

  static async reserveAction(userId: string, action: AiActionKey, mode: AiMode, requestId: string) {
    const cost = this.costFor(action, mode);
    return this.reserve(userId, cost, action, requestId);
  }

  static async reserve(userId: string, cost: number, action: string, requestId: string) {
    validateAmount(cost);
    await this.releaseExpiredReservations(userId);
    await this.expireCredits(userId);

    const reservation = await prisma.$transaction(async (tx) => {
      const existing = await tx.creditReservation.findUnique({ where: { requestId } });
      if (existing) {
        if (existing.userId !== userId || existing.action !== action || existing.cost !== cost)
          throw new ApiError(409, "AI request id was already used for another operation.");
        if (existing.status === "PENDING")
          throw new ApiError(409, "This AI request is processing.");
        if (existing.status === "COMMITTED")
          throw new ApiError(409, "This AI request already completed.");
        throw new ApiError(409, "This AI request id can no longer be reused.");
      }

      const wallet = await tx.creditWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      if (wallet.balance < cost) throw new ApiError(402, "Not enough AI credits.");

      const changed = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: cost } },
        data: { balance: { decrement: cost }, reserved: { increment: cost } },
      });
      if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");

      return tx.creditReservation.create({
        data: {
          walletId: wallet.id,
          userId,
          requestId,
          action,
          cost,
          expiresAt: new Date(Date.now() + CREDIT_RESERVATION_TTL_MS),
        },
      });
    });
    await this.invalidate(userId);
    return reservation;
  }

  static async commitReservation(
    userId: string,
    requestId: string,
    context: Omit<CreditContext, "requestId" | "action">,
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({ where: { requestId } });
      if (!reservation || reservation.userId !== userId)
        throw new ApiError(404, "AI credit reservation was not found.");
      if (reservation.status !== "PENDING")
        throw new ApiError(409, "AI credit reservation is no longer pending.");

      const grants = await tx.creditGrant.findMany({
        where: {
          userId,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: reservation.createdAt } }],
        },
        orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      });
      let outstanding = reservation.cost;
      const allocations: Array<{ grantId: string; amount: number }> = [];
      for (const grant of grants) {
        if (!outstanding) break;
        const amount = Math.min(grant.remaining, outstanding);
        const changed = await tx.creditGrant.updateMany({
          where: { id: grant.id, remaining: { gte: amount } },
          data: { remaining: { decrement: amount } },
        });
        if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");
        allocations.push({ grantId: grant.id, amount });
        outstanding -= amount;
      }
      if (outstanding) throw new ApiError(409, "Reserved credits are no longer available.");

      const wallet = await tx.creditWallet.update({
        where: { id: reservation.walletId },
        data: {
          reserved: { decrement: reservation.cost },
          lifetimeDebited: { increment: reservation.cost },
        },
      });
      const transaction = await tx.creditTransaction.create({
        data: {
          walletId: reservation.walletId,
          userId,
          type: "DEBIT",
          amount: -reservation.cost,
          balanceAfter: wallet.balance,
          requestId,
          action: reservation.action,
          ...context,
        },
      });
      await tx.creditUsageAllocation.createMany({
        data: allocations.map((item) => ({ transactionId: transaction.id, ...item })),
      });
      await tx.creditReservation.update({
        where: { id: reservation.id },
        data: { status: "COMMITTED" },
      });
      return transaction;
    });
    await this.invalidate(userId);
    return result;
  }

  static async releaseReservation(userId: string, requestId: string) {
    const released = await prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({ where: { requestId } });
      if (!reservation || reservation.userId !== userId || reservation.status !== "PENDING")
        return false;
      const changed = await tx.creditReservation.updateMany({
        where: { id: reservation.id, status: "PENDING" },
        data: { status: "RELEASED" },
      });
      if (!changed.count) return false;
      await tx.creditWallet.update({
        where: { id: reservation.walletId },
        data: {
          balance: { increment: reservation.cost },
          reserved: { decrement: reservation.cost },
        },
      });
      return true;
    });
    if (released) await this.invalidate(userId);
    return released;
  }

  static async getHistory(userId: string, take = CREDIT_HISTORY_LIMIT) {
    if (take === CREDIT_HISTORY_LIMIT) {
      const cached = await cacheGet<Awaited<ReturnType<typeof prisma.creditTransaction.findMany>>>(
        historyCacheKey(userId),
      );
      if (cached) return cached;
    }
    const result = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(take, 1), 100),
    });
    if (take === CREDIT_HISTORY_LIMIT)
      await cacheSet(historyCacheKey(userId), result, CREDIT_HISTORY_TTL_SECONDS);
    return result;
  }

  static async consumeAction(
    userId: string,
    action: AiActionKey,
    context: Omit<CreditContext, "action">,
    mode: AiMode = "standard",
  ) {
    return this.consume(userId, this.costFor(action, mode), { ...context, action });
  }

  static async consume(userId: string, cost: number, context: CreditContext) {
    validateAmount(cost);
    await this.expireCredits(userId);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { requestId: context.requestId },
      });
      if (existing) {
        if (existing.userId !== userId || existing.amount !== -cost)
          throw new ApiError(409, "Credit request id was already used for another operation.");
        return existing;
      }

      const wallet = await tx.creditWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      if (wallet.balance < cost) throw new ApiError(402, "Not enough AI credits.");

      const grants = await tx.creditGrant.findMany({
        where: {
          userId,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      });
      let outstanding = cost;
      const allocations: Array<{ grantId: string; amount: number }> = [];
      for (const grant of grants) {
        if (!outstanding) break;
        const amount = Math.min(grant.remaining, outstanding);
        const changed = await tx.creditGrant.updateMany({
          where: { id: grant.id, remaining: { gte: amount } },
          data: { remaining: { decrement: amount } },
        });
        if (!changed.count) throw new ApiError(409, "Credit balance changed. Retry the action.");
        allocations.push({ grantId: grant.id, amount });
        outstanding -= amount;
      }
      if (outstanding) throw new ApiError(402, "Not enough unexpired AI credits.");

      const updated = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: cost }, lifetimeDebited: { increment: cost } },
      });
      const transaction = await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "DEBIT",
          amount: -cost,
          balanceAfter: updated.balance,
          ...context,
        },
      });
      await tx.creditUsageAllocation.createMany({
        data: allocations.map((item) => ({ transactionId: transaction.id, ...item })),
      });
      return transaction;
    });
    await this.invalidate(userId);
    return result;
  }

  static async grant(userId: string, amount: number, context: CreditGrantContext) {
    validateAmount(amount);
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.creditTransaction.findUnique({
          where: { requestId: context.requestId },
        });
        if (existing) return existing;
        const wallet = await tx.creditWallet.upsert({
          where: { userId },
          create: { userId, balance: amount, lifetimeCredited: amount },
          update: { balance: { increment: amount }, lifetimeCredited: { increment: amount } },
        });
        const grant = await tx.creditGrant.create({
          data: {
            walletId: wallet.id,
            userId,
            amount,
            remaining: amount,
            source: context.source,
            sourceId: context.sourceId,
            expiresAt: context.expiresAt,
          },
        });
        const transaction = await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: "GRANT",
            amount,
            balanceAfter: wallet.balance,
            referenceId: grant.id,
            requestId: context.requestId,
            action: context.action,
            documentId: context.documentId,
            reason: context.reason,
            metadata: context.metadata,
          },
        });
        return transaction;
      });
      await this.invalidate(userId);
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.creditTransaction.findUnique({
          where: { requestId: context.requestId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  static async adjust(userId: string, amount: number, context: CreditContext) {
    if (!Number.isSafeInteger(amount) || amount === 0)
      throw new ApiError(400, "Credit adjustment must be a non-zero integer.");
    if (amount > 0)
      return this.grant(userId, amount, {
        ...context,
        source: "admin_adjustment",
        sourceId: context.requestId,
        expiresAt: null,
      });
    return this.consume(userId, Math.abs(amount), { ...context, action: "admin_adjustment" });
  }
}
