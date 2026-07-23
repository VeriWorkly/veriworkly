import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";

import { invalidateAffiliate } from "#services/affiliate/cache";

export async function requestWithdrawal(userId: string, amountCents: number) {
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

// Dodo Payments currently only exposes a read-only `payouts.list` endpoint for the settlements
// Dodo sends to VeriWorkly - it has no API to send money out to a third party (an affiliate).
// So payouts here can only be recorded once a human has actually paid the affiliate out of band
// (bank transfer, PayPal, etc.) and marks the request as reviewed below. Revisit this if Dodo ever
// ships a payout/transfer API.
export async function updateWithdrawal(id: string, status: "APPROVED" | "REJECTED" | "PAID", note?: string) {
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
