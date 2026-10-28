import { beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import {
  affiliateWallet,
  asUser,
  deliver,
  enrolledAffiliate,
  packPayment,
  referredUser,
} from "./helpers/billing.js";

/**
 * Phase 11 group 4a, affiliate: V-324 the affiliate's own dashboard shows their withdrawals
 * without the reviewing admin's id, V-325 a withdrawal already paid out of band can be recorded
 * PAID after the affiliate was suspended.
 */

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
}));

const { AffiliateService } = await import("#services/affiliate/index");

let admin: TestUser;
beforeAll(async () => {
  admin = await createUserWithSession({ email: "admin@example.test", emailVerified: true });
});

/** An affiliate with an approved $40 withdrawal. */
async function approvedWithdrawal() {
  const { user: affiliate, code } = await enrolledAffiliate();
  const buyer = await referredUser(code);
  const payment = packPayment(buyer.id, 200_000);
  await deliver(payment);
  const commission = await prisma.affiliateCommission.findUniqueOrThrow({
    where: { providerPaymentId: payment.data.payment_id },
  });
  await AffiliateService.updateCommission(commission.id, "AVAILABLE");

  const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
    amountCents: 4_000,
  });
  expect(requested.status, JSON.stringify(requested.body)).toBe(200);
  const id = requested.body.data.id as string;
  const approve = await asUser(admin, "patch", `/api/v1/admin/affiliates/withdrawals/${id}`).send({
    status: "APPROVED",
    payoutNote: "Sent by bank transfer",
    reason: "Bank transfer confirmed",
  });
  expect(approve.status, JSON.stringify(approve.body)).toBe(200);
  return { affiliate, id };
}

describe("V-324 the affiliate dashboard's withdrawals", () => {
  it("show the affiliate their own fields and the note, never the reviewing admin's id", async () => {
    const { affiliate, id } = await approvedWithdrawal();

    const dashboard = await asUser(affiliate, "get", "/api/v1/affiliates/me");
    expect(dashboard.status).toBe(200);
    const withdrawal = (dashboard.body.data.withdrawals as Array<Record<string, unknown>>).find(
      (item) => item.id === id,
    );
    expect(withdrawal).toBeDefined();
    expect(withdrawal).not.toHaveProperty("reviewedBy");
    expect(withdrawal).not.toHaveProperty("userId");
    expect(withdrawal).toMatchObject({
      amountCents: 4_000,
      currency: "USD",
      status: "APPROVED",
      payoutNote: "Sent by bank transfer",
    });
  });
});

describe("V-325 a withdrawal paid out of band, then the affiliate suspended", () => {
  it("can still be recorded PAID, and the wallet shows it paid, not returned", async () => {
    const { affiliate, id } = await approvedWithdrawal();
    await prisma.user.update({
      where: { id: affiliate.id },
      data: { affiliateStatus: "SUSPENDED" },
    });

    const paid = await asUser(admin, "patch", `/api/v1/admin/affiliates/withdrawals/${id}`).send({
      status: "PAID",
      payoutNote: "Transfer had already left",
      reason: "Transfer left before the suspension",
    });
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    expect((await prisma.affiliateWithdrawal.findUniqueOrThrow({ where: { id } })).status).toBe(
      "PAID",
    );
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 0,
      paidCents: 4_000,
    });
  });
});
