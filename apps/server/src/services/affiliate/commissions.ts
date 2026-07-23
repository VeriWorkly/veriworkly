import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";

import { AFFILIATE_TIER_RATE_BPS } from "#services/affiliate/constants";
import { invalidateAffiliate } from "#services/affiliate/cache";

export async function createCommission(input: {
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

  const rateBps = AFFILIATE_TIER_RATE_BPS[referral.affiliate.affiliateTier];
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

export async function updateCommission(id: string, status: "AVAILABLE" | "REVERSED", reason?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const commission = await tx.affiliateCommission.findUnique({ where: { id } });
    if (!commission) throw new ApiError(404, "Commission not found.");
    if (commission.status !== "PENDING")
      throw new ApiError(409, "Only pending commissions can be updated.");
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
