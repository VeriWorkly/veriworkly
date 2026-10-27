import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";
import { affiliateWallet } from "./helpers/billing.js";

/**
 * V-269: an admin can reverse a commission that was already released or paid, with the same
 * claw-back a refund applies, audited in the same transaction. V-270: converting a non-USD
 * commission to USD keeps the rate the sale earned.
 */

const asAdmin = adminClient().request;

async function seedReleasedCommission(
  status: "AVAILABLE" | "PAID",
  wallet: object,
  amountCents = 500,
) {
  const affiliate = await createUserWithSession();
  await prisma.user.update({
    where: { id: affiliate.id },
    data: { affiliateStatus: "ACTIVE", affiliateCode: `c${randomUUID().slice(0, 8)}` },
  });
  const commission = await prisma.affiliateCommission.create({
    data: {
      affiliateId: affiliate.id,
      providerPaymentId: `pay_${randomUUID()}`,
      amountCents,
      rateBps: 2_000,
      status,
      availableAt: new Date(),
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });
  await prisma.affiliateWallet.create({ data: { userId: affiliate.id, ...wallet } });
  return { affiliate, commission };
}

describe("V-269 an admin can reverse a released commission", () => {
  it("takes an AVAILABLE commission back from the balance, the rest as a claw-back, audited", async () => {
    const { affiliate, commission } = await seedReleasedCommission("AVAILABLE", {
      availableCents: 300,
    });

    const response = await asAdmin("patch", `/admin/affiliates/commissions/${commission.id}`).send({
      status: "REVERSED",
      reason: "Refunded outside Dodo",
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: "REVERSED", clawbackCents: 200 });
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 0,
      clawbackCents: 200,
    });
    const audit = await prisma.adminAuditEntry.findFirstOrThrow({
      where: { action: "affiliate.commission.update", targetId: commission.id },
    });
    expect(audit.metadata).toMatchObject({
      status: "REVERSED",
      previousStatus: "AVAILABLE",
      amountCents: 500,
      clawbackCents: 200,
    });
  });

  it.each([
    [5_000, { availableCents: 2_000, clawbackCents: 0 }],
    [1_000, { availableCents: 0, clawbackCents: 2_000 }],
  ])(
    "takes a PAID commission back from the available balance first (%i available), the rest as a claw-back",
    async (availableCents, after) => {
      const { affiliate, commission } = await seedReleasedCommission(
        "PAID",
        { availableCents, paidCents: 3_000 },
        3_000,
      );

      const first = await asAdmin("patch", `/admin/affiliates/commissions/${commission.id}`).send({
        status: "REVERSED",
        reason: "Chargeback",
      });
      expect(first.status).toBe(200);
      expect(first.body.data).toMatchObject({
        status: "REVERSED",
        clawbackCents: after.clawbackCents,
      });
      expect(await affiliateWallet(affiliate.id)).toMatchObject({ ...after, paidCents: 3_000 });

      const second = await asAdmin("patch", `/admin/affiliates/commissions/${commission.id}`).send({
        status: "REVERSED",
        reason: "Chargeback",
      });
      expect(second.status).toBe(409);
      expect(await affiliateWallet(affiliate.id)).toMatchObject(after);
    },
  );

  it("rolls the reversal back when its audit entry cannot be written", async () => {
    const { affiliate, commission } = await seedReleasedCommission("AVAILABLE", {
      availableCents: 500,
    });
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "audit_blocked_v269" CHECK (false) NOT VALID`,
    );
    try {
      const response = await asAdmin(
        "patch",
        `/admin/affiliates/commissions/${commission.id}`,
      ).send({ status: "REVERSED", reason: "Refunded" });
      expect(response.status).toBeGreaterThanOrEqual(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "AdminAuditEntry" DROP CONSTRAINT "audit_blocked_v269"`,
      );
    }
    expect(
      (await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: commission.id } })).status,
    ).toBe("AVAILABLE");
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 500,
      clawbackCents: 0,
    });
  });
});

describe("V-270 converting a commission to USD keeps the original rate", () => {
  it("uses the pending commission's rateBps, not the affiliate's tier today", async () => {
    const affiliate = await createUserWithSession();
    await prisma.user.update({
      where: { id: affiliate.id },
      data: {
        affiliateStatus: "ACTIVE",
        affiliateCode: `c${randomUUID().slice(0, 8)}`,
        // Promoted since the sale: today's rate is higher than the one the sale earned.
        affiliateTier: "TIER_3",
      },
    });
    const referred = await createUserWithSession();
    const referral = await prisma.affiliateReferral.create({
      data: { affiliateId: affiliate.id, referredUserId: referred.id, code: "code" },
    });
    const original = await prisma.affiliateCommission.create({
      data: {
        affiliateId: affiliate.id,
        referralId: referral.id,
        providerPaymentId: `pay_${randomUUID()}`,
        amountCents: 180,
        currency: "EUR",
        rateBps: 1_500,
        status: "PENDING",
      },
    });

    const response = await asAdmin("post", "/admin/affiliates/commissions").send({
      referredUserId: referred.id,
      providerPaymentId: `manual_${randomUUID()}`,
      purchaseAmountCents: 1_300,
      currency: "USD",
      convertedFromId: original.id,
      reason: "Converted at the settlement rate",
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ rateBps: 1_500, amountCents: 195 });
  });
});
