import type { AffiliateCommission, Prisma } from "@prisma/client";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";

import {
  AFFILIATE_TIER_RATE_BPS,
  AFFILIATE_WALLET_CURRENCY,
  affiliateTierRank,
  tierEarnedBy,
  type AffiliateTierKey,
} from "#services/affiliate/constants";
import { invalidateAffiliate } from "#services/affiliate/cache";
import { writeAdminAudit, type AdminAuditInput } from "#services/admin/adminAuditService";

export const SHARED_ADDRESS_REASON = "Shared address with affiliate; review before release";

/**
 * The conversions that count towards a tier: a converted referral with at least one clean
 * commission, meaning not REVERSED and not held for a shared address (a PENDING commission with
 * `SHARED_ADDRESS_REASON`; once an admin releases it, it counts). A refunded purchase or a
 * self-referral pattern therefore never promotes an affiliate. Migration
 * 20261026140000_promote_affiliates_to_earned_tiers applies the same rule in SQL.
 */
export function cleanConversionsWhere(
  affiliateId: string,
  convertedBefore?: Date,
): Prisma.AffiliateReferralWhereInput {
  return {
    affiliateId,
    status: "CONVERTED",
    ...(convertedBefore ? { convertedAt: { lte: convertedBefore } } : {}),
    commissions: {
      some: {
        OR: [
          { status: { in: ["AVAILABLE", "PAID"] } },
          {
            status: "PENDING",
            OR: [{ reason: null }, { reason: { not: SHARED_ADDRESS_REASON } }],
          },
        ],
      },
    },
  };
}

/**
 * Tier auto-promotion (V-180): the studio and the site promise Growth at 10 conversions and
 * Partner at 50 (`AFFILIATE_TIERS`). Runs in the transaction that converts a referral, after
 * that transaction locked the affiliate's row: two conversions landing together count one after
 * the other, so neither misses the threshold the pair crosses.
 *
 * - Counts clean conversions only (`cleanConversionsWhere`).
 * - Promotes only: a tier is never lowered here, whatever the count says.
 * - Idempotent: the write is a compare-and-set on the tier it read, and a count that earns
 *   nothing new writes nothing.
 * - An admin's tier decision (`User.affiliateTierDecidedAt`, on the row) holds
 *   until a threshold is crossed after it: promotion needs a tier above both the current one and
 *   the one the conversions at the time of that decision had earned. A demotion therefore sticks
 *   until the next milestone, and an early promotion still reaches Partner at 50.
 */
async function promoteForConversions(tx: Prisma.TransactionClient, affiliateId: string) {
  const affiliate = await tx.user.findUnique({
    where: { id: affiliateId },
    select: { affiliateTier: true, affiliateTierDecidedAt: true },
  });
  if (!affiliate) return null;

  const current = affiliate.affiliateTier as AffiliateTierKey;
  const conversions = await tx.affiliateReferral.count({
    where: cleanConversionsWhere(affiliateId),
  });
  const earned = tierEarnedBy(conversions);
  if (affiliateTierRank(earned) <= affiliateTierRank(current)) return null;

  const decidedAt = affiliate.affiliateTierDecidedAt;
  if (decidedAt) {
    const conversionsAtDecision = await tx.affiliateReferral.count({
      where: cleanConversionsWhere(affiliateId, decidedAt),
    });
    if (affiliateTierRank(earned) <= affiliateTierRank(tierEarnedBy(conversionsAtDecision)))
      return null;
  }

  const promoted = await tx.user.updateMany({
    where: { id: affiliateId, affiliateTier: current },
    data: { affiliateTier: earned },
  });

  return promoted.count === 1 ? { from: current, to: earned, conversions } : null;
}

/**
 * Every credit to an affiliate's available balance goes through here (V-205): a claw-back the
 * affiliate still owes (a commission reversed after its money had left the wallet) is repaid
 * first, and only the rest becomes available. Must run inside the caller's transaction; the
 * wallet row is locked so a concurrent reversal and release settle one after the other. Returns
 * the cents that went to the claw-back, or null when the affiliate has no wallet.
 */
export async function creditAvailable(tx: Prisma.TransactionClient, userId: string, cents: number) {
  const [wallet] = await tx.$queryRaw<Array<{ clawbackCents: number }>>`
    SELECT "clawbackCents" FROM "AffiliateWallet" WHERE "userId" = ${userId} FOR UPDATE`;
  if (!wallet) return null;
  const repaid = Math.min(wallet.clawbackCents, cents);
  await tx.affiliateWallet.update({
    where: { userId },
    data: {
      availableCents: { increment: cents - repaid },
      ...(repaid > 0 ? { clawbackCents: { decrement: repaid } } : {}),
    },
  });
  if (repaid > 0)
    logger.info("Affiliate claw-back repaid from a new credit", { affiliateId: userId, repaid });
  return repaid;
}

/**
 * A rejected withdrawal returns money that never left (V-205): the claw-back it repays was owed
 * for money that was only reserved, not paid out. The reversed commissions' recorded claw-back
 * shrinks by the same cents, oldest first, so a later payout is not held to cover it.
 */
export async function settleReversedClawback(
  tx: Prisma.TransactionClient,
  affiliateId: string,
  cents: number,
) {
  let left = cents;
  if (left <= 0) return;
  const reversed = await tx.affiliateCommission.findMany({
    where: { affiliateId, status: "REVERSED", paidAt: null, clawbackCents: { gt: 0 } },
    orderBy: [{ reversedAt: "asc" }, { id: "asc" }],
    select: { id: true, clawbackCents: true },
  });
  for (const commission of reversed) {
    if (left <= 0) break;
    const settled = Math.min(commission.clawbackCents, left);
    await tx.affiliateCommission.update({
      where: { id: commission.id },
      data: { clawbackCents: { decrement: settled } },
    });
    left -= settled;
  }
}

function normalizeCurrency(value: string | undefined) {
  const currency = (value ?? AFFILIATE_WALLET_CURRENCY).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    throw new ApiError(400, "Currency must be a three-letter ISO 4217 code.");
  return currency;
}

export async function createCommission(
  input: {
    referredUserId: string;
    subscriptionId?: string;
    providerPaymentId: string;
    purchaseAmountCents: number;
    status: "PENDING" | "AVAILABLE";
    reason?: string;
    /** ISO 4217 code of `purchaseAmountCents`; defaults to the wallet currency (USD). */
    currency?: string;
    /**
     * Manual conversion (admin only): the pending non-USD commission this USD commission replaces.
     * The original is marked REVERSED in the same transaction so it cannot be converted twice.
     */
    convertedFromId?: string;
  },
  audit?: AdminAuditInput,
) {
  const referral = await prisma.affiliateReferral.findUnique({
    where: { referredUserId: input.referredUserId },
    include: { affiliate: { select: { affiliateTier: true, affiliateStatus: true } } },
  });
  if (!referral || referral.affiliate.affiliateStatus !== "ACTIVE")
    throw new ApiError(404, "Active affiliate referral not found.");

  // A conversion re-records a sale that already earned its commission: at the rate that sale
  // earned, kept on the original row, not the tier the affiliate holds today (V-270). The
  // transaction below still refuses an original that is not this affiliate's pending non-USD row.
  const original = input.convertedFromId
    ? await prisma.affiliateCommission.findUnique({
        where: { id: input.convertedFromId },
        select: { rateBps: true },
      })
    : null;
  if (input.convertedFromId && !original)
    throw new ApiError(
      409,
      "convertedFromId must be a pending non-USD commission of the same affiliate.",
    );
  const rateBps = original?.rateBps ?? AFFILIATE_TIER_RATE_BPS[referral.affiliate.affiliateTier];
  const amountCents = Math.floor((input.purchaseAmountCents * rateBps) / 10_000);
  if (amountCents < 1) throw new ApiError(400, "Commission amount is too small.");

  const currency = normalizeCurrency(input.currency);
  const inWalletCurrency = currency === AFFILIATE_WALLET_CURRENCY;
  if (input.convertedFromId && !inWalletCurrency)
    throw new ApiError(400, `A converted commission must be in ${AFFILIATE_WALLET_CURRENCY}.`);

  // The wallet is a USD balance. A commission in any other currency is recorded with its own
  // currency, kept PENDING whatever the caller asked for, and never added to the wallet; an admin
  // converts it and records the USD amount by hand (it shows as `requiresManualConversion`).
  let status = inWalletCurrency ? input.status : "PENDING";
  let reason = input.reason;
  // A referral applied from one of the affiliate's own addresses is recorded, not refused (V-016);
  // its money waits for a human instead of maturing on its own.
  if (referral.sharedAddressWithAffiliate) {
    status = "PENDING";
    reason = SHARED_ADDRESS_REASON;
  }

  const { commission: result, promotion } = await prisma.$transaction(async (tx) => {
    // First, before anything is written: the tier count below must see every conversion that
    // committed before this one (see `promoteForConversions`).
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${referral.affiliateId} FOR UPDATE`;
    const commission = await tx.affiliateCommission.create({
      data: {
        affiliateId: referral.affiliateId,
        referralId: referral.id,
        subscriptionId: input.subscriptionId,
        providerPaymentId: input.providerPaymentId,
        amountCents,
        currency,
        rateBps,
        status,
        availableAt: status === "AVAILABLE" ? new Date() : null,
        reason,
      },
    });
    if (input.convertedFromId) {
      // Conditional on the original still being a pending non-USD row of this affiliate, so two
      // admins converting the same commission cannot both succeed.
      const converted = await tx.affiliateCommission.updateMany({
        where: {
          id: input.convertedFromId,
          affiliateId: referral.affiliateId,
          status: "PENDING",
          currency: { not: AFFILIATE_WALLET_CURRENCY },
        },
        data: {
          status: "REVERSED",
          reversedAt: new Date(),
          reason: `Converted to ${AFFILIATE_WALLET_CURRENCY} as ${commission.id}`,
        },
      });
      if (converted.count !== 1)
        throw new ApiError(
          409,
          "convertedFromId must be a pending non-USD commission of the same affiliate.",
        );
    }
    await tx.affiliateReferral.update({
      where: { id: referral.id },
      data: { status: "CONVERTED", convertedAt: referral.convertedAt ?? new Date() },
    });
    const promotion = await promoteForConversions(tx, referral.affiliateId);
    if (inWalletCurrency) {
      await tx.affiliateWallet.upsert({
        where: { userId: referral.affiliateId },
        create: { userId: referral.affiliateId },
        update: {},
      });
      if (status === "PENDING")
        await tx.affiliateWallet.update({
          where: { userId: referral.affiliateId },
          data: { pendingCents: { increment: amountCents } },
        });
      else await creditAvailable(tx, referral.affiliateId, amountCents);
    }
    // A manual commission is money an admin is minting: its audit entry commits with it (V-074).
    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        targetId: commission.id,
        metadata: { ...audit.metadata, amountCents, currency, status },
      });
    return { commission, promotion };
  });
  if (promotion)
    logger.info("Affiliate tier promoted", { affiliateId: referral.affiliateId, ...promotion });
  await invalidateAffiliate(referral.affiliateId, true);
  return result;
}

/**
 * The admin's commission transitions, each committing its audit entry with it (V-074):
 * - PENDING -> AVAILABLE | REVERSED, a single conditional write: the status flips only if the
 *   row is still PENDING at commit time, and the wallet moves only when that flip happened
 *   (V-007). Two concurrent releases therefore credit the wallet once; the loser gets 409.
 * - AVAILABLE | PAID -> REVERSED (V-269): a released commission taken back, for a refund made
 *   outside the provider or a chargeback settled by hand. The same claw-back as a refund
 *   (`reverseLockedCommission`): the available balance gives back what it can, the rest is owed
 *   and repaid from the next credit.
 */
export async function updateCommission(
  id: string,
  status: "AVAILABLE" | "REVERSED",
  reason?: string,
  audit?: AdminAuditInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    // Lock order as in the refund path: the commission row, then the wallet.
    await tx.$queryRaw`SELECT "id" FROM "AffiliateCommission" WHERE "id" = ${id} FOR UPDATE`;
    const commission = await tx.affiliateCommission.findUnique({ where: { id } });
    if (!commission) throw new ApiError(404, "Commission not found.");
    // The affiliate deleted their account: the row stays as history, but there is no wallet
    // left to release into, and nobody to pay.
    const affiliateId = commission.affiliateId;
    if (!affiliateId)
      throw new ApiError(409, "This commission belongs to a deleted account and cannot change.");

    if (
      status === "REVERSED" &&
      (commission.status === "AVAILABLE" || commission.status === "PAID")
    ) {
      const reversal = await reverseLockedCommission(tx, commission, reason ?? null);
      if (audit)
        await writeAdminAudit(tx, {
          ...audit,
          metadata: {
            ...audit.metadata,
            status,
            previousStatus: commission.status,
            amountCents: commission.amountCents,
            clawbackCents: reversal.clawbackCents,
          },
        });
      logReversal(reversal, { by: "admin" });
      return {
        ...(await tx.affiliateCommission.findUniqueOrThrow({ where: { id } })),
        affiliateId,
      };
    }

    const inWalletCurrency = commission.currency === AFFILIATE_WALLET_CURRENCY;
    if (status === "AVAILABLE" && !inWalletCurrency)
      throw new ApiError(
        409,
        `This commission is in ${commission.currency}; convert it to ${AFFILIATE_WALLET_CURRENCY} and record it manually before releasing it.`,
      );

    const transitioned = await tx.affiliateCommission.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status,
        reason,
        availableAt: status === "AVAILABLE" ? new Date() : null,
        reversedAt: status === "REVERSED" ? new Date() : null,
      },
    });
    if (transitioned.count !== 1)
      throw new ApiError(
        409,
        status === "REVERSED"
          ? "Only pending, available or paid commissions can be reversed."
          : "Only pending commissions can be released.",
      );

    // Non-USD commissions were never added to the wallet, so there is nothing to move.
    if (inWalletCurrency) {
      const moved = await tx.affiliateWallet.updateMany({
        where: { userId: affiliateId, pendingCents: { gte: commission.amountCents } },
        data: { pendingCents: { decrement: commission.amountCents } },
      });
      // Rolls the status change back: the wallet no longer holds what this commission says it
      // reserved, which is a ledger problem to look at, not something to paper over.
      if (moved.count !== 1)
        throw new ApiError(409, "Wallet pending balance does not cover this commission.");
      if (status === "AVAILABLE") await creditAvailable(tx, affiliateId, commission.amountCents);
    }

    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: {
          ...audit.metadata,
          status,
          previousStatus: commission.status,
          amountCents: commission.amountCents,
        },
      });

    return { ...(await tx.affiliateCommission.findUniqueOrThrow({ where: { id } })), affiliateId };
  });
  await invalidateAffiliate(result.affiliateId, true);
  return result;
}

const CONVERTED_PREFIX = `Converted to ${AFFILIATE_WALLET_CURRENCY} as `;

type Reversal = {
  id: string;
  affiliateId: string | null;
  from: AffiliateCommission["status"];
  clawbackCents: number;
  pendingShortfallCents: number;
};

/**
 * Reverses one commission whose row the caller has locked and re-read (and found not REVERSED),
 * moving the wallet by the rules `reverseCommissionForPayment` describes. Shared by the refund path
 * and the admin reversal (V-269), so both take money back the same way.
 */
async function reverseLockedCommission(
  tx: Prisma.TransactionClient,
  commission: AffiliateCommission,
  reason: string | null,
): Promise<Reversal> {
  const affiliateId = commission.affiliateId;
  if (affiliateId)
    await tx.$queryRaw`SELECT "id" FROM "AffiliateWallet" WHERE "userId" = ${affiliateId} FOR UPDATE`;

  const transitioned = await tx.affiliateCommission.updateMany({
    where: { id: commission.id, status: commission.status },
    data: { status: "REVERSED", reversedAt: new Date(), reason },
  });
  if (transitioned.count !== 1)
    throw new ApiError(409, "The commission changed while it was being reversed. Retry.");

  const inWallet = affiliateId && commission.currency === AFFILIATE_WALLET_CURRENCY;
  let clawbackCents = 0;
  let pendingShortfallCents = 0;
  if (inWallet && commission.status === "PENDING") {
    // Releases what the wallet still holds for it. A wallet that holds less is a ledger problem
    // for a human, but the refund itself must still be processed (history, running total), so
    // the shortfall is returned for the event's note and logged rather than thrown.
    const wallet = await tx.affiliateWallet.findUnique({
      where: { userId: affiliateId },
      select: { pendingCents: true },
    });
    const released = Math.min(Math.max(wallet?.pendingCents ?? 0, 0), commission.amountCents);
    pendingShortfallCents = commission.amountCents - released;
    if (released > 0)
      await tx.affiliateWallet.update({
        where: { userId: affiliateId },
        data: { pendingCents: { decrement: released } },
      });
  } else if (inWallet && (commission.status === "AVAILABLE" || commission.status === "PAID")) {
    // Released money comes back out of the available balance first, whether it is still there
    // (AVAILABLE) or was paid out and the balance has earned more since (PAID); only what the
    // balance cannot cover becomes a claw-back the affiliate owes.
    const wallet = await tx.affiliateWallet.findUnique({
      where: { userId: affiliateId },
      select: { availableCents: true },
    });
    const debit = Math.min(Math.max(wallet?.availableCents ?? 0, 0), commission.amountCents);
    clawbackCents = commission.amountCents - debit;
    await tx.affiliateWallet.updateMany({
      where: { userId: affiliateId },
      data: {
        availableCents: { decrement: debit },
        clawbackCents: { increment: clawbackCents },
      },
    });
  }
  if (clawbackCents > 0)
    await tx.affiliateCommission.update({
      where: { id: commission.id },
      data: { clawbackCents },
    });

  return {
    id: commission.id,
    affiliateId,
    from: commission.status,
    clawbackCents,
    pendingShortfallCents,
  };
}

function logReversal(result: Reversal, context: Record<string, unknown>) {
  logger.info("Affiliate commission reversed", {
    commissionId: result.id,
    ...context,
    from: result.from,
    clawbackCents: result.clawbackCents,
  });
  if (result.clawbackCents > 0)
    logger.warn("Affiliate owes a claw-back: the reversed commission had already left the wallet", {
      commissionId: result.id,
      affiliateId: result.affiliateId,
      clawbackCents: result.clawbackCents,
    });
  if (result.pendingShortfallCents > 0)
    logger.error("Affiliate wallet held less pending than the reversed commission", {
      commissionId: result.id,
      affiliateId: result.affiliateId,
      shortfallCents: result.pendingShortfallCents,
    });
}

/**
 * A refund or a lost dispute took the purchase back, so the commission earned on it goes too
 * (V-205). Safe to repeat: a commission already REVERSED is left alone.
 *
 * - PENDING: reversed and its pending cents released; a wallet holding less is noted, not thrown.
 * - AVAILABLE: reversed and debited from the available balance; whatever the balance no longer
 *   holds (withdrawn meanwhile) becomes a claw-back the affiliate owes (`clawbackCents` on the
 *   commission and the wallet), repaid from the next credit (`creditAvailable`).
 * - PAID: the money has left, so it comes back out of the available balance like AVAILABLE, and
 *   what the balance cannot cover is a claw-back. `paidAt` stays as the record.
 * - A non-USD commission an admin converted is followed to the USD commission that replaced it.
 * - A deleted affiliate's commission is marked REVERSED; there is no wallet left to touch.
 *
 * Returns the reversed commission's id and any pending cents the wallet no longer held, or null
 * when there was nothing to reverse.
 */
export async function reverseCommissionForPayment(providerPaymentId: string, reason: string) {
  const result = await prisma.$transaction(async (tx) => {
    let commission = await tx.affiliateCommission.findUnique({ where: { providerPaymentId } });
    if (commission?.status === "REVERSED" && commission.reason?.startsWith(CONVERTED_PREFIX))
      commission = await tx.affiliateCommission.findUnique({
        where: { id: commission.reason.slice(CONVERTED_PREFIX.length).trim() },
      });
    if (!commission) return null;

    // Lock order as in `updateCommission`: the commission row, then the wallet. A release or a
    // withdrawal running at the same time settles before or after this, never in between, and
    // the status is re-read under the lock.
    await tx.$queryRaw`SELECT "id" FROM "AffiliateCommission" WHERE "id" = ${commission.id} FOR UPDATE`;
    commission = await tx.affiliateCommission.findUniqueOrThrow({ where: { id: commission.id } });
    if (commission.status === "REVERSED") return null;

    return reverseLockedCommission(tx, commission, reason);
  });
  if (!result) return null;

  logReversal(result, { providerPaymentId, by: "refund or dispute" });
  if (result.affiliateId) await invalidateAffiliate(result.affiliateId, true);
  return { id: result.id, pendingShortfallCents: result.pendingShortfallCents };
}

/**
 * The commissions a payout paid (V-017): AVAILABLE USD commissions, oldest first, while the
 * affiliate's payouts so far cover them (all PAID withdrawals, less the commissions already marked
 * paid and the withdrawn money of commissions reversed since). A commission only partly covered
 * stays AVAILABLE until a later payout covers the rest. Runs in the transaction that marks the
 * withdrawal PAID.
 */
export async function markCommissionsPaid(
  tx: Prisma.TransactionClient,
  affiliateId: string,
  withdrawalId: string,
) {
  const [wallet, alreadyPaid, reversedOut] = await Promise.all([
    tx.affiliateWallet.findUnique({ where: { userId: affiliateId }, select: { paidCents: true } }),
    tx.affiliateCommission.aggregate({
      where: { affiliateId, currency: AFFILIATE_WALLET_CURRENCY, paidAt: { not: null } },
      _sum: { amountCents: true },
    }),
    // A commission reversed after its money had left the wallet (withdrawn, then refunded): the
    // payout paid that money, so it covers no later commission. A later commission whose money
    // only repaid the claw-back has not been paid out.
    tx.affiliateCommission.aggregate({
      where: {
        affiliateId,
        currency: AFFILIATE_WALLET_CURRENCY,
        status: "REVERSED",
        paidAt: null,
        clawbackCents: { gt: 0 },
      },
      _sum: { clawbackCents: true },
    }),
  ]);
  let covered =
    (wallet?.paidCents ?? 0) -
    (alreadyPaid._sum.amountCents ?? 0) -
    (reversedOut._sum.clawbackCents ?? 0);
  if (covered <= 0) return 0;

  const available = await tx.affiliateCommission.findMany({
    where: { affiliateId, status: "AVAILABLE", currency: AFFILIATE_WALLET_CURRENCY },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, amountCents: true },
  });
  const paidAt = new Date();
  let count = 0;
  for (const commission of available) {
    if (commission.amountCents > covered) break;
    const marked = await tx.affiliateCommission.updateMany({
      where: { id: commission.id, status: "AVAILABLE" },
      data: { status: "PAID", paidAt, withdrawalId },
    });
    if (!marked.count) continue;
    covered -= commission.amountCents;
    count += 1;
  }
  return count;
}
