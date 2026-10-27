import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession } from "./helpers/auth.js";
import {
  affiliateWallet,
  asUser,
  billingHistory,
  billingMe,
  DAY_MS,
  deliver,
  disputeEvent,
  enrolledAffiliate,
  eventTime,
  expectLedgerBalanced,
  packPayment,
  passPayment,
  paymentEvent,
  referredUser,
  refundEvent,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * V-205, V-216: a refund or a lost dispute takes back what the payment bought (pack or month
 * credits, pass access), reverses the affiliate commission on it, and shows in the customer's
 * billing history; the payment it reverses is found through the indexed `providerPaymentId`, and
 * full vs partial is decided against the stored payment amount when the provider does not say.
 */

const { billingMailMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("#services/mail/billingMail", () => billingMailMock);

const { AffiliateService } = await import("#services/affiliate/index");
const { addMonthsUtc, runAnnualCreditGrants } = await import("#services/annualCreditService");

beforeEach(() => {
  for (const mock of Object.values(billingMailMock)) mock.mockReset().mockResolvedValue(undefined);
});

async function grantFor(userId: string, sourceId: string) {
  return prisma.creditGrant.findFirstOrThrow({ where: { userId, sourceId } });
}

async function commissionFor(paymentId: string) {
  return prisma.affiliateCommission.findUniqueOrThrow({ where: { providerPaymentId: paymentId } });
}

describe("V-205 a refunded credit pack", () => {
  it("shows in history, takes the credits back and reverses the pending commission", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    const paymentId = payment.data.payment_id;
    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(500);
    expect((await commissionFor(paymentId)).status).toBe("PENDING");
    expect((await affiliateWallet(affiliate.id)).pendingCents).toBe(4_000);

    const refund = await deliver(refundEvent(paymentId, { amount: 200_000 }));

    const row = (await billingHistory(buyer)).find(
      (item) => item.providerEventId === refund.eventId,
    );
    expect(row).toMatchObject({
      type: "refund.succeeded",
      productName: "500 extra credits",
      amountCents: 200_000,
      currency: "USD",
    });
    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(0);
    await expectLedgerBalanced(buyer.id);
    const clawback = await prisma.creditTransaction.findFirstOrThrow({
      where: { userId: buyer.id, type: "REFUND" },
    });
    expect(clawback).toMatchObject({ amount: -500, action: "payment_refund" });
    expect((await billingMe(buyer)).access.tier).toBe("free");

    const commission = await commissionFor(paymentId);
    expect(commission.status).toBe("REVERSED");
    expect(commission.reversedAt).not.toBeNull();
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      pendingCents: 0,
      availableCents: 0,
      clawbackCents: 0,
    });
  });

  it("takes back only what is left when part of the pack was spent", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id);
    await deliver(payment);
    const { CreditService } = await import("#services/creditService");
    await CreditService.consume(buyer.id, 120, { requestId: `spend-${randomUUID()}` });

    await deliver(refundEvent(payment.data.payment_id, { amount: 499 }));

    expect((await grantFor(buyer.id, payment.data.payment_id)).remaining).toBe(0);
    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: buyer.id } });
    expect(wallet.balance).toBe(0);
    await expectLedgerBalanced(buyer.id);
  });

  it("is applied once however often the refund is delivered", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id);
    await deliver(payment);
    const refund = refundEvent(payment.data.payment_id, { amount: 499 });

    await deliver(refund);
    await deliver(refund);
    // A second provider event for the same refund (a new event id) changes nothing either.
    await deliver({ ...refund, data: { ...refund.data, refund_id: `ref_${randomUUID()}` } });

    expect(
      await prisma.creditTransaction.count({ where: { userId: buyer.id, type: "REFUND" } }),
    ).toBe(1);
    await expectLedgerBalanced(buyer.id);
  });
});

describe("V-216 full or partial, from the stored payment when the provider does not say", () => {
  it("reads a refund without is_partial at the full amount as full", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id);
    await deliver(payment);

    await deliver(refundEvent(payment.data.payment_id, { amount: 499, isPartial: null }));

    expect((await grantFor(buyer.id, payment.data.payment_id)).remaining).toBe(0);
  });

  it("reads a refund without is_partial below the paid amount as partial and keeps the credits", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id);
    await deliver(payment);

    const refund = await deliver(
      refundEvent(payment.data.payment_id, { amount: 200, isPartial: null }),
    );

    expect((await grantFor(buyer.id, payment.data.payment_id)).remaining).toBe(500);
    // Still the customer's refund, still in their history.
    expect(
      (await billingHistory(buyer)).some((item) => item.providerEventId === refund.eventId),
    ).toBe(true);
  });

  it("still finds the payment after the retention job redacted its payload", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id);
    await deliver(payment);
    await prisma.$executeRaw`
      UPDATE "BillingWebhookEvent"
      SET "payload" = jsonb_build_object('redacted', true, 'type', "type")
      WHERE "type" = 'payment.succeeded' AND "userId" = ${buyer.id}`;

    const refund = await deliver(
      refundEvent(payment.data.payment_id, { amount: 499, isPartial: null }),
    );

    expect((await grantFor(buyer.id, payment.data.payment_id)).remaining).toBe(0);
    const stored = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { providerEventId: refund.eventId },
    });
    expect(stored).toMatchObject({
      userId: buyer.id,
      providerPaymentId: payment.data.payment_id,
      productName: "500 extra credits",
    });
  });

  it("stops an annual schedule and takes back its month when the refund names no is_partial after redaction", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodStart = new Date(Date.now() - 60_000);
    const periodEnd = addMonthsUtc(periodStart, 12);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_ai_credits_annual",
      amount: 5_990,
      at: periodStart,
      servicePeriod: { startsAt: periodStart, endsAt: periodEnd },
    });
    await deliver(payment);
    await prisma.$executeRaw`
      UPDATE "BillingWebhookEvent"
      SET "payload" = jsonb_build_object('redacted', true, 'type', "type")
      WHERE "type" = 'payment.succeeded' AND "userId" = ${user.id}`;

    await deliver(refundEvent(payment.data.payment_id, { amount: 5_990, isPartial: null }));

    const schedule = await prisma.subscriptionCreditSchedule.findFirstOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(schedule.stoppedAt).not.toBeNull();
    const monthOne = await grantFor(user.id, `${schedule.id}:0`);
    expect(monthOne.remaining).toBe(0);
    await runAnnualCreditGrants(new Date(addMonthsUtc(periodStart, 1).getTime() + DAY_MS));
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(1);
    await expectLedgerBalanced(user.id);
  });
});

describe("V-205 a refunded pass and subscription month", () => {
  it("revokes a refunded pass and takes back its credits", async () => {
    const buyer = await createUserWithSession();
    const payment = passPayment(buyer.id);
    await deliver(payment);
    expect((await billingMe(buyer)).access.tier).toBe("pass");

    await deliver(refundEvent(payment.data.payment_id, { amount: 599 }));

    const grants = await prisma.entitlementGrant.findMany({
      where: { userId: buyer.id, sourceId: payment.data.payment_id },
    });
    expect(grants.length).toBeGreaterThan(0);
    expect(grants.every((grant) => grant.revokedAt !== null)).toBe(true);
    const me = await billingMe(buyer);
    expect(me.access.tier).toBe("free");
    expect(me.canPublish).toBe(false);
    await expectLedgerBalanced(buyer.id);
  });

  it("takes back a refunded month's credits but leaves the subscription to its own events", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodEnd = new Date(Date.now() + 30 * DAY_MS);
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
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_ai_credits_monthly",
      amount: 599,
      servicePeriod: { startsAt: new Date(Date.now() - 60_000), endsAt: periodEnd },
    });
    await deliver(payment);
    expect((await billingMe(user)).credits.available).toBe(1_000);

    await deliver(refundEvent(payment.data.payment_id, { amount: 599 }));

    expect((await billingMe(user)).credits.available).toBe(0);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { providerSubId: subscriptionId } }))
        .status,
    ).toBe("ACTIVE");
    await expectLedgerBalanced(user.id);
  });
});

describe("V-205 affiliate commission reversal", () => {
  it("debits the available balance when the commission was already released", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    const commission = await commissionFor(payment.data.payment_id);
    await AffiliateService.updateCommission(commission.id, "AVAILABLE", "matured");
    expect((await affiliateWallet(affiliate.id)).availableCents).toBe(4_000);

    await deliver(refundEvent(payment.data.payment_id, { amount: 200_000 }));

    expect((await commissionFor(payment.data.payment_id)).status).toBe("REVERSED");
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 0,
      pendingCents: 0,
      clawbackCents: 0,
    });
  });

  it("records a claw-back when the balance was already withdrawn, and repays it from the next commission", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const first = packPayment(buyer.id, 200_000);
    await deliver(first);
    await AffiliateService.updateCommission(
      (await commissionFor(first.data.payment_id)).id,
      "AVAILABLE",
    );
    const withdrawal = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });
    expect(withdrawal.status, JSON.stringify(withdrawal.body)).toBe(200);

    await deliver(refundEvent(first.data.payment_id, { amount: 200_000 }));

    const reversed = await commissionFor(first.data.payment_id);
    expect(reversed).toMatchObject({ status: "REVERSED", clawbackCents: 4_000 });
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 0,
      clawbackCents: 4_000,
    });

    // The next commission released pays the claw-back first.
    const second = packPayment(buyer.id, 300_000);
    await deliver(second);
    await AffiliateService.updateCommission(
      (await commissionFor(second.data.payment_id)).id,
      "AVAILABLE",
    );
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 2_000,
      clawbackCents: 0,
    });
  });

  it("claws back a commission a payout already paid", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    await AffiliateService.updateCommission(
      (await commissionFor(payment.data.payment_id)).id,
      "AVAILABLE",
    );
    const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });
    const withdrawalId = requested.body.data.id as string;
    await AffiliateService.updateWithdrawal(withdrawalId, "APPROVED");
    await AffiliateService.updateWithdrawal(withdrawalId, "PAID");
    expect(await commissionFor(payment.data.payment_id)).toMatchObject({
      status: "PAID",
      withdrawalId,
    });

    await deliver(refundEvent(payment.data.payment_id, { amount: 200_000 }));

    expect(await commissionFor(payment.data.payment_id)).toMatchObject({
      status: "REVERSED",
      clawbackCents: 4_000,
    });
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      paidCents: 4_000,
      clawbackCents: 4_000,
    });
  });

  it("leaves the commission alone on a partial refund", async () => {
    const { code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);

    await deliver(refundEvent(payment.data.payment_id, { amount: 1_000, isPartial: true }));

    expect((await commissionFor(payment.data.payment_id)).status).toBe("PENDING");
  });
});

describe("V-205 disputes", () => {
  it("does nothing while a dispute is open, and reverses everything once it is lost", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    const paymentId = payment.data.payment_id;

    const opened = await deliver(disputeEvent(paymentId, "dispute.opened", "200000"));
    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(500);
    expect((await commissionFor(paymentId)).status).toBe("PENDING");
    expect(
      (
        await prisma.billingWebhookEvent.findUniqueOrThrow({
          where: { providerEventId: opened.eventId },
        })
      ).userId,
    ).toBe(buyer.id);

    const lost = await deliver(disputeEvent(paymentId, "dispute.lost", "200000"));

    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(0);
    expect((await commissionFor(paymentId)).status).toBe("REVERSED");
    expect((await affiliateWallet(affiliate.id)).pendingCents).toBe(0);
    const row = (await billingHistory(buyer)).find((item) => item.providerEventId === lost.eventId);
    expect(row).toMatchObject({ type: "dispute.lost", amountCents: 200_000, currency: "USD" });
    await expectLedgerBalanced(buyer.id);
  });

  it("keeps everything when a dispute is won", async () => {
    const buyer = await createUserWithSession();
    const payment = passPayment(buyer.id);
    await deliver(payment);

    await deliver(disputeEvent(payment.data.payment_id, "dispute.won", "599"));

    expect((await billingMe(buyer)).access.tier).toBe("pass");
  });
});

describe("V-216 migration backfill", () => {
  it("fills the payment id and attributes stored refunds to their payment's customer, idempotently", async () => {
    const migration = readFileSync(
      path.resolve(
        __dirname,
        "../../prisma/migrations/20261027090000_refunds_disputes_and_affiliate_clawback/migration.sql",
      ),
      "utf8",
    );
    const statements = migration
      .split(/^-- backfill\r?$/m)
      .slice(1)
      .map((part) => part.slice(0, part.lastIndexOf(";") + 1).trim());
    expect(statements).toHaveLength(3);

    const user = await createUserWithSession();
    const tag = randomUUID();
    const paymentId = `pay_${tag}`;
    const payment = packPayment(user.id, 499, paymentId);
    const refund = refundEvent(paymentId, { amount: 499 });
    // What the code before V-205 stored: the payment attributed, the refund not.
    await prisma.billingWebhookEvent.createMany({
      data: [
        {
          providerEventId: `evt_pay_${tag}`,
          userId: user.id,
          type: payment.type,
          payload: payment,
        },
        { providerEventId: `evt_ref_${tag}`, userId: null, type: refund.type, payload: refund },
        {
          providerEventId: `evt_sub_${tag}`,
          userId: user.id,
          type: "subscription.active",
          payload: { type: "subscription.active", data: { subscription_id: "sub_x" } },
        },
      ].map((row) => ({ ...row, status: "PROCESSED" as const, processedAt: new Date() })),
    });

    for (let run = 0; run < 2; run++)
      for (const statement of statements) await prisma.$executeRawUnsafe(statement);

    const stored = await prisma.billingWebhookEvent.findMany({
      where: { providerEventId: { endsWith: tag } },
      select: { providerEventId: true, userId: true, providerPaymentId: true },
    });
    const byId = (id: string) => stored.find((row) => row.providerEventId === id);
    expect(byId(`evt_pay_${tag}`)).toMatchObject({ providerPaymentId: paymentId });
    expect(byId(`evt_ref_${tag}`)).toMatchObject({ providerPaymentId: paymentId, userId: user.id });
    expect(byId(`evt_sub_${tag}`)).toMatchObject({ providerPaymentId: null });
  });
});

describe("review: reversals that add up to the whole payment", () => {
  it("two partial refunds that sum to the payment take everything back once", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    const paymentId = payment.data.payment_id;

    await deliver(refundEvent(paymentId, { amount: 120_000, isPartial: true }));
    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(500);
    expect((await commissionFor(paymentId)).status).toBe("PENDING");

    const second = refundEvent(paymentId, { amount: 80_000, isPartial: true });
    await deliver(second);
    // The same refund again, under another event id: counted once.
    await deliver(second);

    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(0);
    expect((await commissionFor(paymentId)).status).toBe("REVERSED");
    expect((await affiliateWallet(affiliate.id)).pendingCents).toBe(0);
    expect(
      await prisma.creditTransaction.count({ where: { userId: buyer.id, type: "REFUND" } }),
    ).toBe(1);
    await expectLedgerBalanced(buyer.id);
  });

  it("a partial refund and a lost dispute for the rest take everything back", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id, 499);
    await deliver(payment);
    const paymentId = payment.data.payment_id;

    await deliver(refundEvent(paymentId, { amount: 200, isPartial: true }));
    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(500);
    await deliver(disputeEvent(paymentId, "dispute.lost", "299"));

    expect((await grantFor(buyer.id, paymentId)).remaining).toBe(0);
    await expectLedgerBalanced(buyer.id);
  });
});

describe("review: payouts never mark a commission paid with a claw-back's money", () => {
  it("leaves a commission AVAILABLE when its money repaid a claw-back rather than a payout", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const first = packPayment(buyer.id, 200_000);
    await deliver(first);
    await AffiliateService.updateCommission(
      (await commissionFor(first.data.payment_id)).id,
      "AVAILABLE",
    );
    const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });
    const withdrawalId = requested.body.data.id as string;
    // Refunded while its money sits in the withdrawal: a 4,000 claw-back.
    await deliver(refundEvent(first.data.payment_id, { amount: 200_000 }));
    // Large enough to repay the whole claw-back: a payout is refused while any is owed (V-321).
    const second = packPayment(buyer.id, 250_000);
    await deliver(second);
    await AffiliateService.updateCommission(
      (await commissionFor(second.data.payment_id)).id,
      "AVAILABLE",
    );
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 1_000,
      clawbackCents: 0,
    });

    await AffiliateService.updateWithdrawal(withdrawalId, "APPROVED");
    await AffiliateService.updateWithdrawal(withdrawalId, "PAID");

    // The payout paid out the refunded commission's money, not the second one's.
    expect((await commissionFor(second.data.payment_id)).status).toBe("AVAILABLE");
  });
});

describe("review: a pending commission the wallet does not cover", () => {
  it("still processes the refund, releases what the wallet holds and notes the shortfall", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const payment = packPayment(buyer.id, 200_000);
    await deliver(payment);
    await prisma.affiliateWallet.update({
      where: { userId: affiliate.id },
      data: { pendingCents: 1_000 },
    });

    const refund = await deliver(refundEvent(payment.data.payment_id, { amount: 200_000 }));

    expect((await commissionFor(payment.data.payment_id)).status).toBe("REVERSED");
    expect((await affiliateWallet(affiliate.id)).pendingCents).toBe(0);
    const stored = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { providerEventId: refund.eventId },
    });
    expect(stored.status).toBe("PROCESSED");
    expect(stored.error).toMatch(/3000 cents/);
    expect(
      (await billingHistory(buyer)).some((item) => item.providerEventId === refund.eventId),
    ).toBe(true);
  });
});

describe("review: a rejected withdrawal settles the claw-back it caused", () => {
  it("lets a later payout mark later commissions PAID", async () => {
    const { user: affiliate, code } = await enrolledAffiliate();
    const buyer = await referredUser(code);
    const first = packPayment(buyer.id, 200_000);
    await deliver(first);
    await AffiliateService.updateCommission(
      (await commissionFor(first.data.payment_id)).id,
      "AVAILABLE",
    );
    const requested = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 4_000,
    });
    await deliver(refundEvent(first.data.payment_id, { amount: 200_000 }));
    // The withdrawn money comes back: the claw-back is repaid by it, and nothing was paid out.
    await AffiliateService.updateWithdrawal(requested.body.data.id as string, "REJECTED");
    expect(await affiliateWallet(affiliate.id)).toMatchObject({
      availableCents: 0,
      clawbackCents: 0,
    });
    expect((await commissionFor(first.data.payment_id)).clawbackCents).toBe(0);

    const second = packPayment(buyer.id, 150_000);
    await deliver(second);
    await AffiliateService.updateCommission(
      (await commissionFor(second.data.payment_id)).id,
      "AVAILABLE",
    );
    const payout = await asUser(affiliate, "post", "/api/v1/affiliates/withdrawals").send({
      amountCents: 3_000,
    });
    await AffiliateService.updateWithdrawal(payout.body.data.id as string, "APPROVED");
    await AffiliateService.updateWithdrawal(payout.body.data.id as string, "PAID");

    expect((await commissionFor(second.data.payment_id)).status).toBe("PAID");
  });
});

describe("review: refunding the earlier of two stacked passes", () => {
  it("pulls the later pass back so it starts when the refund lands, credits included", async () => {
    const buyer = await createUserWithSession();
    const first = passPayment(buyer.id, 599, new Date(Date.now() - 2 * DAY_MS));
    await deliver(first);
    const second = passPayment(buyer.id);
    await deliver(second);

    const refundedAt = Date.now();
    await deliver(refundEvent(first.data.payment_id, { amount: 599 }));

    const later = await prisma.entitlementGrant.findMany({
      where: { userId: buyer.id, sourceId: second.data.payment_id },
    });
    for (const grant of later) {
      expect(grant.revokedAt).toBeNull();
      expect(Math.abs(grant.endsAt!.getTime() - (refundedAt + 7 * DAY_MS))).toBeLessThan(60_000);
    }
    const credits = await grantFor(buyer.id, second.data.payment_id);
    expect(credits.expiresAt?.getTime()).toBe(later[0]!.endsAt!.getTime());
    const me = await billingMe(buyer);
    expect(new Date(me.access.passEndsAt).getTime()).toBe(later[0]!.endsAt!.getTime());
  });
});

describe("review: refunding a pass in the middle of a stack", () => {
  it("moves the passes after it back by its own length only", async () => {
    const buyer = await createUserWithSession();
    await deliver(passPayment(buyer.id, 599, new Date(Date.now() - 2 * DAY_MS)));
    const middle = passPayment(buyer.id, 599, new Date(Date.now() - 60_000));
    await deliver(middle);
    const last = passPayment(buyer.id);
    await deliver(last);
    const before = await prisma.entitlementGrant.findFirstOrThrow({
      where: { userId: buyer.id, sourceId: last.data.payment_id },
    });

    await deliver(refundEvent(middle.data.payment_id, { amount: 599 }));

    const after = await prisma.entitlementGrant.findFirstOrThrow({ where: { id: before.id } });
    expect(before.endsAt!.getTime() - after.endsAt!.getTime()).toBe(7 * DAY_MS);
  });
});
