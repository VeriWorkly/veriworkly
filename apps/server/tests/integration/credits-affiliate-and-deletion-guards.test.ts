import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import {
  affiliateWallet,
  asUser,
  billingMe,
  DAY_MS,
  deliver,
  enrolledAffiliate,
  eventTime,
  expectLedgerBalanced,
  packPayment,
  referredUser,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * Phase 10 group 1: V-204 withdrawals only for ACTIVE affiliates, V-017 payouts mark commissions
 * PAID, V-228 client AI request ids cannot reach server ledger keys, V-229 a customer note apart
 * from the admin reason, V-230 typed admin adjustments, V-252 detached wallets excluded from live
 * totals and swept, V-234 deletion with an unpaid affiliate balance needs a confirmation.
 */

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
}));

const { AffiliateService } = await import("#services/affiliate/index");
const { CreditService, sweepExpiredCredits } = await import("#services/creditService");

let admin: TestUser;
beforeAll(async () => {
  admin = await createUserWithSession({ email: "admin@example.test", emailVerified: true });
});

async function commissionFor(paymentId: string) {
  return prisma.affiliateCommission.findUniqueOrThrow({ where: { providerPaymentId: paymentId } });
}

/** An affiliate with `cents` available, earned from a referred pack purchase. */
async function affiliateWithBalance(purchaseCents = 200_000) {
  const { user, code } = await enrolledAffiliate();
  const buyer = await referredUser(code);
  const payment = packPayment(buyer.id, purchaseCents);
  await deliver(payment);
  await AffiliateService.updateCommission(
    (await commissionFor(payment.data.payment_id)).id,
    "AVAILABLE",
  );
  return { affiliate: user, buyer, paymentId: payment.data.payment_id };
}

describe("V-204 only an ACTIVE affiliate's balance is approved for payout", () => {
  it("refuses a suspended affiliate's withdrawal with 403 and leaves the wallet alone", async () => {
    const { affiliate } = await affiliateWithBalance();
    await prisma.user.update({
      where: { id: affiliate.id },
      data: { affiliateStatus: "SUSPENDED" },
    });

    const response = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).toContain("AFFILIATE_NOT_ACTIVE");
    expect(await affiliateWallet(affiliate.id)).toMatchObject({ availableCents: 4_000 });
    expect(await prisma.affiliateWithdrawal.count({ where: { userId: affiliate.id } })).toBe(0);
  });

  it("refuses to approve a withdrawal once the affiliate is suspended, but lets it be rejected", async () => {
    const { affiliate } = await affiliateWithBalance();
    const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });
    expect(requested.status).toBe(200);
    const id = requested.body.data.id as string;
    await prisma.user.update({
      where: { id: affiliate.id },
      data: { affiliateStatus: "SUSPENDED" },
    });

    const list = await asUser(admin, "get", "/api/v1/admin/affiliates/withdrawals");
    expect(list.status).toBe(200);
    const row = (
      list.body.data.items as Array<{ id: string; user: { affiliateStatus: string } }>
    ).find((item) => item.id === id);
    expect(row?.user.affiliateStatus).toBe("SUSPENDED");

    const approve = await asUser(admin, "patch", `/api/v1/admin/affiliates/withdrawals/${id}`).send(
      {
        status: "APPROVED",
        reason: "Checked",
      },
    );
    expect(approve.status).toBe(403);
    expect((await prisma.affiliateWithdrawal.findUniqueOrThrow({ where: { id } })).status).toBe(
      "REQUESTED",
    );

    const reject = await asUser(admin, "patch", `/api/v1/admin/affiliates/withdrawals/${id}`).send({
      status: "REJECTED",
      reason: "Fraud review",
    });
    expect(reject.status).toBe(200);
    expect((await affiliateWallet(affiliate.id)).availableCents).toBe(4_000);
  });
});

describe("V-017 a payout marks the commissions it covered PAID", () => {
  it("pays commissions oldest first, and leaves one only partly covered AVAILABLE", async () => {
    const { affiliate, buyer, paymentId: first } = await affiliateWithBalance(200_000);
    const second = packPayment(buyer.id, 150_000);
    await deliver(second);
    await AffiliateService.updateCommission(
      (await commissionFor(second.data.payment_id)).id,
      "AVAILABLE",
    );
    expect((await affiliateWallet(affiliate.id)).availableCents).toBe(7_000);

    const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 5_000,
    });
    const withdrawalId = requested.body.data.id as string;
    await AffiliateService.updateWithdrawal(withdrawalId, "APPROVED");
    await AffiliateService.updateWithdrawal(withdrawalId, "PAID");

    expect(await commissionFor(first)).toMatchObject({ status: "PAID", withdrawalId });
    expect((await commissionFor(second.data.payment_id)).status).toBe("AVAILABLE");
  });
});

describe("V-228 client AI request ids", () => {
  it("never collide with the server's own ledger keys", async () => {
    const user = await createUserWithSession();
    const grant = await CreditService.grant(user.id, 100, {
      requestId: `test-grant:${randomUUID()}`,
      source: "credit_pack",
      sourceId: randomUUID(),
      expiresAt: new Date(Date.now() + DAY_MS),
    });
    const grantId = grant.referenceId as string;
    // The id the expiry sweep will use for that grant, sent as a client request id.
    const hostile = `expire:${grantId}`;

    await CreditService.reserve(user.id, 10, "ats_analysis", hostile);
    const debit = await CreditService.commitReservation(user.id, hostile, {});
    expect(debit.requestId).toBe(`ai:${hostile}`);

    // The grant expires: the sweep's write under `expire:<grant id>` still goes through.
    expect(await CreditService.expireCredits(user.id, new Date(Date.now() + 2 * DAY_MS))).toBe(90);
    await expectLedgerBalanced(user.id);

    // A retry of the same client id is still the same request.
    await expect(CreditService.reserve(user.id, 10, "ats_analysis", hostile)).rejects.toMatchObject(
      { statusCode: 409 },
    );
  });
});

describe("V-229 / V-230 admin adjustments", () => {
  it("shows the customer the note, never the admin's internal reason", async () => {
    const user = await createUserWithSession();
    const response = await asUser(admin, "post", "/api/v1/admin/billing/credits").send({
      userId: user.id,
      amount: 50,
      reason: "Ticket 123: suspected abuse on the old account",
      customerNote: "Sorry for the trouble",
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const history = await asUser(user, "get", "/api/v1/billing/credits/history");
    const text = JSON.stringify(history.body.data);
    expect(text).toContain("Sorry for the trouble");
    expect(text).not.toContain("suspected abuse");
    const audit = await prisma.adminAuditEntry.findFirstOrThrow({
      where: { targetId: user.id, action: "billing.credit.adjust" },
    });
    expect(audit.reason).toContain("suspected abuse");
  });

  it("restores a lost pack as paid pack credits with the pack's 90-day expiry", async () => {
    const user = await createUserWithSession();
    const response = await asUser(admin, "post", "/api/v1/admin/billing/credits").send({
      userId: user.id,
      amount: 500,
      reason: "Pack payment taken but never granted",
      kind: "pack",
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const grant = await prisma.creditGrant.findFirstOrThrow({ where: { userId: user.id } });
    expect(grant.source).toBe("credit_pack");
    expect(grant.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 89 * DAY_MS);
    expect(grant.expiresAt!.getTime()).toBeLessThan(Date.now() + 91 * DAY_MS);
    const me = await billingMe(user);
    expect(me.access).toMatchObject({ tier: "credits", isPaying: true });
  });

  it("restores a subscription month that ends with the plan's month, and only for a credits plan", async () => {
    const user = await createUserWithSession();
    const refused = await asUser(admin, "post", "/api/v1/admin/billing/credits").send({
      userId: user.id,
      amount: 1_000,
      reason: "Month lost in an outage",
      kind: "subscription_month",
    });
    expect(refused.status).toBe(409);
    expect(JSON.stringify(refused.body)).toContain("NO_CREDIT_SUBSCRIPTION");

    const subscriptionId = `sub_${randomUUID()}`;
    const periodEnd = new Date(Date.now() + 12 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const restored = await asUser(admin, "post", "/api/v1/admin/billing/credits").send({
      userId: user.id,
      amount: 1_000,
      reason: "Month lost in an outage",
      kind: "subscription_month",
    });
    expect(restored.status, JSON.stringify(restored.body)).toBe(200);

    const grant = await prisma.creditGrant.findFirstOrThrow({ where: { userId: user.id } });
    expect(grant.source).toBe("subscription_payment");
    expect(grant.sourceId.startsWith(`${subscriptionId}:`)).toBe(true);
    expect(grant.expiresAt?.getTime()).toBe(periodEnd.getTime());
  });

  it("refuses to remove credits as anything but goodwill", async () => {
    const user = await createUserWithSession();
    const response = await asUser(admin, "post", "/api/v1/admin/billing/credits").send({
      userId: user.id,
      amount: -10,
      reason: "Wrong kind",
      kind: "pack",
    });
    expect(response.status).toBe(400);
  });
});

describe("V-252 detached wallets", () => {
  it("are left out of the live totals and still expire", async () => {
    const before = await asUser(admin, "get", "/api/v1/admin/billing/summary");
    expect(before.status).toBe(200);

    const user = await createUserWithSession();
    await CreditService.grant(user.id, 300, {
      requestId: `test-grant:${randomUUID()}`,
      source: "credit_pack",
      sourceId: randomUUID(),
      expiresAt: new Date(Date.now() + DAY_MS),
    });
    const { deleteUserCascade } = await import("#services/userService");
    await prisma.$transaction((tx) => deleteUserCascade(tx, user.id));
    const wallet = await prisma.creditWallet.findFirstOrThrow({
      where: { userId: null, balance: 300 },
    });

    const after = await asUser(admin, "get", "/api/v1/admin/billing/summary");
    expect(after.body.data.credits.balance).toBe(before.body.data.credits.balance);

    await sweepExpiredCredits(new Date(Date.now() + 2 * DAY_MS));
    const swept = await prisma.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(swept.balance).toBe(0);
    expect(
      await prisma.creditGrant.aggregate({
        where: { walletId: wallet.id },
        _sum: { remaining: true },
      }),
    ).toMatchObject({ _sum: { remaining: 0 } });
  });
});

describe("V-234 deleting an account with an unpaid affiliate balance", () => {
  it("answers 409 with the amount, then deletes once the forfeit is confirmed", async () => {
    const { affiliate, paymentId } = await affiliateWithBalance();

    const refused = await asUser(affiliate, "delete", "/api/v1/users/me").send({});
    expect(refused.status).toBe(409);
    const details = refused.body.details ?? refused.body.error?.details;
    expect(details).toMatchObject({
      code: "AFFILIATE_BALANCE_FORFEIT",
      amountCents: 4_000,
      currency: "USD",
    });
    expect(await prisma.user.count({ where: { id: affiliate.id } })).toBe(1);

    const confirmed = await asUser(affiliate, "delete", "/api/v1/users/me").send({
      confirmAffiliateForfeit: true,
    });
    expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
    expect(await prisma.user.count({ where: { id: affiliate.id } })).toBe(0);
    // The detached commission no longer reads as money owed.
    expect(await commissionFor(paymentId)).toMatchObject({ affiliateId: null, status: "REVERSED" });
  });
});

describe("review: the forfeit is decided inside the deletion transaction", () => {
  it("forfeits what the wallet holds at deletion time and audits the amount", async () => {
    const { affiliate } = await affiliateWithBalance();

    const confirmed = await asUser(affiliate, "delete", "/api/v1/users/me").send({
      confirmAffiliateForfeit: true,
    });
    expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);

    const audit = await prisma.adminAuditEntry.findFirstOrThrow({
      where: { targetId: affiliate.id, action: "affiliate.balance.forfeit" },
    });
    expect(audit.metadata).toMatchObject({
      availableCents: 4_000,
      pendingCents: 0,
      currency: "USD",
    });
  });

  it("refuses inside the transaction when a balance appears after the pre-check", async () => {
    const { affiliate } = await affiliateWithBalance();
    const { deleteUserCascade } = await import("#services/userService");

    await expect(
      prisma.$transaction((tx) =>
        deleteUserCascade(tx, affiliate.id, { requireAffiliateForfeitConfirmation: true }),
      ),
    ).rejects.toMatchObject({ statusCode: 409, details: { code: "AFFILIATE_BALANCE_FORFEIT" } });
    expect(await prisma.user.count({ where: { id: affiliate.id } })).toBe(1);
  });
});

describe("review: AI requests reserved before the ai: prefix", () => {
  async function legacyReservation(userId: string) {
    await CreditService.grant(userId, 100, {
      requestId: `test-grant:${randomUUID()}`,
      source: "credit_pack",
      sourceId: randomUUID(),
      expiresAt: new Date(Date.now() + DAY_MS),
    });
    const requestId = `legacy-${randomUUID()}`;
    const reservation = await CreditService.reserve(userId, 10, "ats_analysis", requestId);
    // As stored before the deploy: the bare client id.
    await prisma.creditReservation.update({ where: { id: reservation.id }, data: { requestId } });
    return requestId;
  }

  it("still commits a reservation stored under the bare id", async () => {
    const user = await createUserWithSession();
    const requestId = await legacyReservation(user.id);

    const debit = await CreditService.commitReservation(user.id, requestId, {});
    expect(debit.amount).toBe(-10);
    await expectLedgerBalanced(user.id);
  });

  it("still releases a reservation stored under the bare id", async () => {
    const user = await createUserWithSession();
    const requestId = await legacyReservation(user.id);

    expect(await CreditService.releaseReservation(user.id, requestId)).toBe(true);
    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).reserved,
    ).toBe(0);
    await expectLedgerBalanced(user.id);
  });
});

describe("review: the confirmed forfeit amount", () => {
  it("refuses again when the balance grew past what the user confirmed, and audits the claw-back debt", async () => {
    const { affiliate } = await affiliateWithBalance();

    const stale = await asUser(affiliate, "delete", "/api/v1/users/me").send({
      confirmAffiliateForfeit: true,
      confirmedAffiliateForfeitCents: 1_000,
    });
    expect(stale.status).toBe(409);
    expect(JSON.stringify(stale.body)).toContain("AFFILIATE_BALANCE_FORFEIT");
    expect(await prisma.user.count({ where: { id: affiliate.id } })).toBe(1);

    const confirmed = await asUser(affiliate, "delete", "/api/v1/users/me").send({
      confirmAffiliateForfeit: true,
      confirmedAffiliateForfeitCents: 4_000,
    });
    expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
    const audit = await prisma.adminAuditEntry.findFirstOrThrow({
      where: { targetId: affiliate.id, action: "affiliate.balance.forfeit" },
    });
    expect(audit.metadata).toMatchObject({ amountCents: 4_000, clawbackCents: 0 });
  });
});
