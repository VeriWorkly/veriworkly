import { Prisma, type AffiliateWithdrawalStatus } from "@prisma/client";

import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";

import { invalidateAffiliate } from "#services/affiliate/cache";
import {
  creditAvailable,
  markCommissionsPaid,
  settleReversedClawback,
} from "#services/affiliate/commissions";
import { writeAdminAudit, type AdminAuditInput } from "#services/admin/adminAuditService";

const WITHDRAWAL_IN_PROGRESS = "A withdrawal is already in progress";

/**
 * Only an ACTIVE affiliate's money moves out (V-204, studio S-092): a SUSPENDED (for example
 * fraud-flagged) or PENDING affiliate can neither request a withdrawal nor have one approved or
 * paid. Rejecting one, which returns the money to the wallet, stays open. Read with the user row
 * locked inside the transaction that moves the money, so a suspension that commits first wins.
 */
async function requireActiveAffiliate(tx: Prisma.TransactionClient, userId: string) {
  const [user] = await tx.$queryRaw<Array<{ affiliateStatus: string }>>`
    SELECT "affiliateStatus" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  if (user?.affiliateStatus !== "ACTIVE")
    throw new ApiError(
      403,
      "This affiliate account is not active, so its balance cannot be paid out.",
      { code: "AFFILIATE_NOT_ACTIVE", affiliateStatus: user?.affiliateStatus ?? null },
    );
}

/**
 * A withdrawal is not approved while the balance left after its reservation cannot cover what the
 * affiliate owes back (V-321): a commission reversed after the balance was reserved left its
 * whole amount as a claw-back, and approving would send that money out. A request that was
 * already netted (`requestWithdrawal`) leaves enough behind and is approved as usual. Rejecting
 * (which returns the reservation and repays the claw-back first) stays open. Marking an approved
 * withdrawal PAID is never refused for this: the money has already been sent by hand, and the
 * claw-back stays owed, netted against later credits and requests. Read with the wallet row
 * locked, so a reversal that commits first wins.
 */
async function refuseApprovalOverClawback(tx: Prisma.TransactionClient, userId: string) {
  const [wallet] = await tx.$queryRaw<Array<{ availableCents: number; clawbackCents: number }>>`
    SELECT "availableCents", "clawbackCents" FROM "AffiliateWallet"
    WHERE "userId" = ${userId} FOR UPDATE`;
  if (wallet && wallet.clawbackCents > wallet.availableCents)
    throw new ApiError(
      409,
      "This affiliate owes a claw-back from a refunded commission that the rest of the balance does not cover. Reject this withdrawal so the reserved balance repays it, then the affiliate can request the rest.",
      { code: "AFFILIATE_CLAWBACK_OUTSTANDING", clawbackCents: wallet.clawbackCents },
    );
}

export async function requestWithdrawal(userId: string, amountCents: number) {
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      await requireActiveAffiliate(tx, userId);
      const active = await tx.affiliateWithdrawal.findFirst({
        where: { userId, status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true },
      });
      if (active) throw new ApiError(409, WITHDRAWAL_IN_PROGRESS);

      // Money the affiliate owes back (`clawbackCents`, V-321) is netted against the available
      // balance: only what is left after the debt can be reserved, in one conditional write.
      const reserved = await tx.$executeRaw`
        UPDATE "AffiliateWallet"
        SET "availableCents" = "availableCents" - ${amountCents}, "updatedAt" = now()
        WHERE "userId" = ${userId} AND "availableCents" - "clawbackCents" >= ${amountCents}`;
      if (reserved === 0) throw new ApiError(400, "Available balance is too low.");

      // `currency` defaults to USD: the wallet this draws from is a USD balance.
      return tx.affiliateWithdrawal.create({ data: { userId, amountCents } });
    });
  } catch (error) {
    // Two requests that both passed the pre-check: the partial unique index (one REQUESTED or
    // APPROVED row per user) rejects the second insert and the transaction returns its reservation.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new ApiError(409, WITHDRAWAL_IN_PROGRESS);
    throw error;
  }
  await invalidateAffiliate(userId);
  return result;
}

/** The states a withdrawal may be in for each requested transition. */
const TRANSITION_FROM: Record<"APPROVED" | "REJECTED" | "PAID", AffiliateWithdrawalStatus[]> = {
  APPROVED: ["REQUESTED"],
  REJECTED: ["REQUESTED", "APPROVED"],
  PAID: ["APPROVED"],
};

// Dodo Payments currently only exposes a read-only `payouts.list` endpoint for the settlements
// Dodo sends to VeriWorkly - it has no API to send money out to a third party (an affiliate).
// So payouts here can only be recorded once a human has actually paid the affiliate out of band
// (bank transfer, PayPal, etc.) and marks the request as reviewed below. Revisit this if Dodo ever
// ships a payout/transfer API.
//
// The transition is one conditional write (V-007): the row changes only if it is still in a state
// the transition is allowed from at commit time, and the wallet moves only when it did. Concurrent
// PAID and REJECTED on one withdrawal therefore cannot both pay and refund; the loser gets 409.
// The admin's audit entry, when given, commits in the same transaction (V-074).
export async function updateWithdrawal(
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  note?: string,
  reviewerId?: string,
  audit?: AdminAuditInput,
) {
  const result = await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.affiliateWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new ApiError(404, "Withdrawal not found.");
    // Detached by an account deletion (only PAID or REJECTED rows can be): nothing to move.
    if (!withdrawal.userId)
      throw new ApiError(409, "This withdrawal belongs to a deleted account.");
    if (status !== "REJECTED") await requireActiveAffiliate(tx, withdrawal.userId);

    const transitioned = await tx.affiliateWithdrawal.updateMany({
      where: { id, status: { in: TRANSITION_FROM[status] } },
      data: {
        status,
        payoutNote: note,
        reviewedAt: new Date(),
        // Who signed off matters for a money movement that happens out of band; without it
        // the payout trail stops at "someone with admin access approved this".
        ...(reviewerId ? { reviewedBy: reviewerId } : {}),
        ...(status === "PAID" ? { paidAt: new Date() } : {}),
      },
    });
    if (transitioned.count !== 1) {
      // Re-read inside the transaction so the reason reflects what a concurrent reviewer did.
      const current = await tx.affiliateWithdrawal.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw new ApiError(404, "Withdrawal not found.");
      if (current.status === "REJECTED" || current.status === "PAID")
        throw new ApiError(409, "Withdrawal is already finalized.");
      if (status === "PAID")
        throw new ApiError(409, "Approve the withdrawal before marking it paid.");
      throw new ApiError(409, "Withdrawal is already approved.");
    }

    // After the write above locked the withdrawal row: the same order the REJECTED path takes
    // (withdrawal, then wallet), so a concurrent approval and rejection cannot deadlock.
    if (status === "APPROVED") await refuseApprovalOverClawback(tx, withdrawal.userId);

    if (status === "REJECTED" || status === "PAID") {
      // Credits need no balance guard, but a missing wallet row must roll the transition back
      // rather than surface as a P2025 the caller cannot act on. Money a rejection returns
      // repays any claw-back the affiliate owes first (V-205).
      if (status === "REJECTED") {
        const repaid = await creditAvailable(tx, withdrawal.userId, withdrawal.amountCents);
        if (repaid === null) throw new ApiError(409, "Affiliate wallet not found.");
        await settleReversedClawback(tx, withdrawal.userId, repaid);
      } else {
        const paid = await tx.affiliateWallet.updateMany({
          where: { userId: withdrawal.userId },
          data: { paidCents: { increment: withdrawal.amountCents } },
        });
        if (paid.count !== 1) throw new ApiError(409, "Affiliate wallet not found.");
      }
      // The commissions this payout covered are paid now (V-017).
      if (status === "PAID") await markCommissionsPaid(tx, withdrawal.userId, id);
    }

    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: { ...audit.metadata, status, amountCents: withdrawal.amountCents },
      });

    return {
      ...(await tx.affiliateWithdrawal.findUniqueOrThrow({ where: { id } })),
      userId: withdrawal.userId,
    };
  });
  await invalidateAffiliate(result.userId);
  return result;
}
