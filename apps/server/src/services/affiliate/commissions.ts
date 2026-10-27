import type { Prisma } from "@prisma/client";

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

  const rateBps = AFFILIATE_TIER_RATE_BPS[referral.affiliate.affiliateTier];
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
    if (inWalletCurrency)
      await tx.affiliateWallet.upsert({
        where: { userId: referral.affiliateId },
        create: {
          userId: referral.affiliateId,
          pendingCents: status === "PENDING" ? amountCents : 0,
          availableCents: status === "AVAILABLE" ? amountCents : 0,
        },
        update:
          status === "PENDING"
            ? { pendingCents: { increment: amountCents } }
            : { availableCents: { increment: amountCents } },
      });
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
 * The one PENDING -> AVAILABLE | REVERSED transition. Maturation is still an admin action this
 * round, but it goes through here so it is a single conditional write: the status flips only if
 * the row is still PENDING at commit time, and the wallet moves only when that flip happened
 * (V-007). Two concurrent releases therefore credit the wallet once; the loser gets 409.
 */
export async function updateCommission(
  id: string,
  status: "AVAILABLE" | "REVERSED",
  reason?: string,
  audit?: AdminAuditInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    const commission = await tx.affiliateCommission.findUnique({ where: { id } });
    if (!commission) throw new ApiError(404, "Commission not found.");
    // The affiliate deleted their account: the row stays as history, but there is no wallet
    // left to release into, and nobody to pay.
    const affiliateId = commission.affiliateId;
    if (!affiliateId)
      throw new ApiError(409, "This commission belongs to a deleted account and cannot change.");

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
      throw new ApiError(409, "Only pending commissions can be updated.");

    // Non-USD commissions were never added to the wallet, so there is nothing to move.
    if (inWalletCurrency) {
      const moved = await tx.affiliateWallet.updateMany({
        where: { userId: affiliateId, pendingCents: { gte: commission.amountCents } },
        data: {
          pendingCents: { decrement: commission.amountCents },
          ...(status === "AVAILABLE"
            ? { availableCents: { increment: commission.amountCents } }
            : {}),
        },
      });
      // Rolls the status change back: the wallet no longer holds what this commission says it
      // reserved, which is a ledger problem to look at, not something to paper over.
      if (moved.count !== 1)
        throw new ApiError(409, "Wallet pending balance does not cover this commission.");
    }

    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: { ...audit.metadata, status, amountCents: commission.amountCents },
      });

    return { ...(await tx.affiliateCommission.findUniqueOrThrow({ where: { id } })), affiliateId };
  });
  await invalidateAffiliate(result.affiliateId, true);
  return result;
}
