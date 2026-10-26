import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { sweepExpiredCredits } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";

/** The configured admin (env.ts sets ADMIN_EMAIL); one account shared by every test in the file. */
let adminPromise: Promise<TestUser> | undefined;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function selfDelete(user: TestUser) {
  return request(app)
    .delete("/api/v1/users/me")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie);
}

async function adminDelete(target: TestUser) {
  const adminUser = await admin();
  return request(app)
    .delete(`/api/v1/admin/users/${target.id}`)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", adminUser.cookie)
    .send({ confirmEmail: target.email, reason: "integration test" });
}

async function asAdmin() {
  const adminUser = await admin();
  return {
    get: (url: string) =>
      request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", adminUser.cookie),
    patch: (url: string) =>
      request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", adminUser.cookie),
    delete: (url: string) =>
      request(app).delete(url).set("Origin", STUDIO_ORIGIN).set("Cookie", adminUser.cookie),
  };
}

function subscription(
  userId: string,
  overrides: Partial<{
    status: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    rawStatus: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    lastWebhookAt: Date | null;
    createdAt: Date;
  }> = {},
) {
  return prisma.subscription.create({
    data: {
      userId,
      provider: "dodo",
      providerSubId: `sub_${randomUUID()}`,
      providerCustomerId: "cus_deletion",
      productKey: "portfolio_pro",
      status: overrides.status ?? "ACTIVE",
      rawStatus: overrides.rawStatus ?? "active",
      interval: "MONTHLY",
      cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
      currentPeriodEnd:
        overrides.currentPeriodEnd === undefined
          ? new Date(Date.now() + 20 * DAY_MS)
          : overrides.currentPeriodEnd,
      graceEndsAt: overrides.graceEndsAt ?? null,
      lastWebhookAt: overrides.lastWebhookAt ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}

/** A wallet with a grant, a debit allocated against it and an in-flight reservation. */
async function seedLedger(userId: string) {
  const wallet = await prisma.creditWallet.create({
    data: { userId, balance: 90, reserved: 5, lifetimeCredited: 100, lifetimeDebited: 10 },
  });
  const grant = await prisma.creditGrant.create({
    data: {
      walletId: wallet.id,
      userId,
      amount: 100,
      remaining: 90,
      source: "payment",
      sourceId: `pay_${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * DAY_MS),
    },
  });
  const debit = await prisma.creditTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: "DEBIT",
      amount: -10,
      balanceAfter: 90,
      action: "ats_analysis",
      requestId: `req_${randomUUID()}`,
    },
  });
  const allocation = await prisma.creditUsageAllocation.create({
    data: { transactionId: debit.id, grantId: grant.id, amount: 10 },
  });
  await prisma.creditReservation.create({
    data: {
      walletId: wallet.id,
      userId,
      requestId: `req_${randomUUID()}`,
      action: "ats_analysis",
      cost: 5,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  return { wallet, grant, debit, allocation };
}

async function deliver(event: unknown) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body);
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  return { response, eventId: headers["webhook-id"] };
}

describe("deleting an account with a subscription that can still charge (V-168, V-169)", () => {
  it("admin delete refuses a live subscription, names it, and keeps the user", async () => {
    const target = await createUserWithSession();
    const live = await subscription(target.id);

    const response = await adminDelete(target);

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.message).toContain(live.id);
    expect(response.body.message).toContain("ACTIVE");
    expect(response.body.message).toMatch(/cancel/i);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it("self delete refuses a scheduled cancellation until the paid period has ended", async () => {
    const target = await createUserWithSession();
    const periodEnd = new Date(Date.now() + 12 * DAY_MS);
    await subscription(target.id, { cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd });

    const response = await selfDelete(target);

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.message).toContain(periodEnd.toISOString().slice(0, 10));
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it("admin delete also refuses a scheduled cancellation (our flag is not the provider)", async () => {
    const target = await createUserWithSession();
    await subscription(target.id, { cancelAtPeriodEnd: true });

    expect((await adminDelete(target)).status).toBe(409);
  });

  it("self delete refuses a subscription in dunning, and one awaiting its first charge", async () => {
    const pastDue = await createUserWithSession();
    await subscription(pastDue.id, {
      status: "PAST_DUE",
      rawStatus: "on_hold",
      currentPeriodEnd: new Date(Date.now() - DAY_MS),
      graceEndsAt: new Date(Date.now() + 6 * DAY_MS),
    });
    const pending = await createUserWithSession();
    await subscription(pending.id, { status: "INACTIVE", rawStatus: "pending" });

    const pastDueResponse = await selfDelete(pastDue);
    expect(pastDueResponse.status).toBe(409);
    expect(pastDueResponse.body.message).toMatch(/Manage Subscription/);
    expect((await selfDelete(pending)).status).toBe(409);
  });

  it("keeps refusing while the provider still bills, whatever the local label says", async () => {
    const target = await createUserWithSession();
    // An admin labelled it CANCELED; Dodo never heard of it and still reports it active.
    await subscription(target.id, { status: "CANCELED", rawStatus: "active" });

    expect((await selfDelete(target)).status).toBe(409);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it("lets a checkout that was never paid stop blocking once the checkout has expired", async () => {
    const abandoned = await createUserWithSession();
    const longAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await subscription(abandoned.id, {
      status: "INACTIVE",
      rawStatus: "pending",
      lastWebhookAt: longAgo,
      createdAt: longAgo,
    });
    const recent = await createUserWithSession();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await subscription(recent.id, {
      status: "INACTIVE",
      rawStatus: "pending",
      lastWebhookAt: hourAgo,
      createdAt: hourAgo,
    });

    expect((await selfDelete(recent)).status).toBe(409);
    expect((await selfDelete(abandoned)).status).toBe(200);
  });

  it("allows deletion once the provider has cancelled, even inside the paid period", async () => {
    const target = await createUserWithSession();
    await subscription(target.id, { status: "CANCELED", rawStatus: "cancelled" });

    expect((await selfDelete(target)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
  });
});

describe("billing records outlive the account (V-183, owner decision 5)", () => {
  it("self delete detaches subscriptions, grants, wallet and ledger instead of deleting them", async () => {
    const target = await createUserWithSession();
    const sub = await subscription(target.id, { status: "CANCELED", rawStatus: "cancelled" });
    const entitlement = await prisma.entitlementGrant.create({
      data: {
        userId: target.id,
        key: "portfolio_publish",
        source: "SUBSCRIPTION",
        sourceId: sub.providerSubId!,
      },
    });
    const { wallet, grant, debit, allocation } = await seedLedger(target.id);
    const event = await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: `evt_${randomUUID()}`,
        userId: target.id,
        type: "payment.succeeded",
        payload: {},
        status: "PROCESSED",
      },
    });
    await prisma.document.create({
      data: { userId: target.id, slug: "cv", title: "CV", content: { basics: { name: "Gone" } } },
    });

    expect((await selfDelete(target)).status).toBe(200);

    // Personal data is gone.
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.document.count({ where: { userId: target.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0);
    expect(await prisma.creditReservation.count({ where: { walletId: wallet.id } })).toBe(0);

    // The money history is kept, detached.
    expect((await prisma.subscription.findUnique({ where: { id: sub.id } }))?.userId).toBeNull();
    expect(
      (await prisma.entitlementGrant.findUnique({ where: { id: entitlement.id } }))?.userId,
    ).toBeNull();
    const keptWallet = await prisma.creditWallet.findUnique({ where: { id: wallet.id } });
    expect(keptWallet?.userId).toBeNull();
    // The in-flight reservation died with the account, so nothing is held against the balance.
    expect(keptWallet?.reserved).toBe(0);
    expect(keptWallet?.balance).toBe(90);
    expect((await prisma.creditGrant.findUnique({ where: { id: grant.id } }))?.userId).toBeNull();
    expect(
      (await prisma.creditTransaction.findUnique({ where: { id: debit.id } }))?.userId,
    ).toBeNull();
    expect(
      await prisma.creditUsageAllocation.findUnique({ where: { id: allocation.id } }),
    ).not.toBeNull();
    expect(
      (await prisma.billingWebhookEvent.findUnique({ where: { id: event.id } }))?.userId,
    ).toBeNull();
  });

  it("admin delete keeps the same records", async () => {
    const target = await createUserWithSession();
    const { grant, debit } = await seedLedger(target.id);

    const response = await adminDelete(target);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await prisma.creditGrant.findUnique({ where: { id: grant.id } })).not.toBeNull();
    expect(await prisma.creditTransaction.findUnique({ where: { id: debit.id } })).not.toBeNull();
  });

  it("the credit sweep skips a deleted account's expired grant without failing", async () => {
    const target = await createUserWithSession();
    const { grant } = await seedLedger(target.id);
    await prisma.creditGrant.update({
      where: { id: grant.id },
      data: { expiresAt: new Date(Date.now() - DAY_MS) },
    });
    expect((await selfDelete(target)).status).toBe(200);

    const totals = await sweepExpiredCredits();

    expect(totals.failed).toBe(0);
    expect((await prisma.creditGrant.findUnique({ where: { id: grant.id } }))?.remaining).toBe(90);
  });

  it("a subscription webhook for a deleted account is recorded, not retried, and recreates nothing", async () => {
    const target = await createUserWithSession();
    const sub = await subscription(target.id, { status: "CANCELED", rawStatus: "cancelled" });
    expect((await selfDelete(target)).status).toBe(200);

    for (const metadata of [{ veriworkly_user_id: target.id }, {}]) {
      const { response, eventId } = await deliver({
        type: "subscription.expired",
        timestamp: new Date().toISOString(),
        data: {
          subscription_id: sub.providerSubId,
          customer: { customer_id: "cus_deletion" },
          product_id: "prod_portfolio_pro_monthly",
          status: "expired",
          cancel_at_next_billing_date: false,
          next_billing_date: null,
          metadata,
        },
      });

      expect(response.status, JSON.stringify(response.body)).toBe(200);
      const stored = await prisma.billingWebhookEvent.findUnique({
        where: { providerEventId: eventId },
      });
      expect(stored?.status).toBe("PROCESSED");
      expect(stored?.userId).toBeNull();
    }
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect((await prisma.subscription.findUnique({ where: { id: sub.id } }))?.userId).toBeNull();
    expect(await prisma.entitlementGrant.count({ where: { userId: target.id } })).toBe(0);
  });

  it("deletion strips free text that can name people from the kept ledger, grants and payouts", async () => {
    const target = await createUserWithSession();
    const adminUser = await admin();
    const asAdminPost = (url: string) =>
      request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", adminUser.cookie);
    const freeText = "Goodwill for Jane Doe, jane.doe@example.test";

    const credit = await asAdminPost("/api/v1/admin/billing/credits").send({
      userId: target.id,
      amount: 75,
      reason: freeText,
    });
    expect(credit.status, JSON.stringify(credit.body)).toBe(200);
    const entitlement = await asAdminPost("/api/v1/admin/billing/entitlements").send({
      userId: target.id,
      key: "analytics",
      reason: freeText,
    });
    expect(entitlement.status, JSON.stringify(entitlement.body)).toBe(200);
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: {
        userId: target.id,
        amountCents: 5_000,
        status: "PAID",
        paidAt: new Date(),
        payoutNote: `Paid to ${freeText}`,
      },
    });
    // A pass entitlement an admin revoked with a reason.
    const pass = await prisma.entitlementGrant.create({
      data: {
        userId: target.id,
        key: "portfolio_publish",
        source: "SYSTEM",
        sourceId: `pay_${randomUUID()}`,
        metadata: { productKey: "bundle", interval: "seven_day", pass: true },
      },
    });
    const revoke = await request(app)
      .delete(`/api/v1/admin/billing/entitlements/${pass.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", adminUser.cookie)
      .send({ reason: freeText });
    expect(revoke.status, JSON.stringify(revoke.body)).toBe(200);

    expect((await selfDelete(target)).status).toBe(200);

    const transaction = await prisma.creditTransaction.findUniqueOrThrow({
      where: { id: credit.body.data.transaction?.id ?? credit.body.data.id },
    });
    expect(transaction.amount).toBe(75);
    expect(JSON.stringify(transaction)).not.toMatch(/Jane|jane\.doe/);
    const grant = await prisma.entitlementGrant.findUniqueOrThrow({
      where: { id: entitlement.body.data.id },
    });
    expect(grant.key).toBe("analytics");
    expect(JSON.stringify(grant)).not.toMatch(/Jane|jane\.doe/);
    const payout = await prisma.affiliateWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(payout.amountCents).toBe(5_000);
    expect(JSON.stringify(payout)).not.toMatch(/Jane|jane\.doe/);
    const revokedPass = await prisma.entitlementGrant.findUniqueOrThrow({ where: { id: pass.id } });
    expect(revokedPass.revokedAt).not.toBeNull();
    expect((revokedPass.metadata as { pass?: boolean }).pass).toBe(true);
    expect(JSON.stringify(revokedPass)).not.toMatch(/Jane|jane\.doe/);

    // The admin log keeps what was done and by whom, not the free text about the person.
    const entries = await prisma.adminAuditEntry.findMany({
      where: {
        OR: [
          { targetId: target.id },
          { targetId: pass.id },
          { metadata: { path: ["userId"], equals: target.id } },
        ],
      },
    });
    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const entry of entries) {
      expect(entry.action).toBeTruthy();
      expect(entry.actorId).toBe(adminUser.id);
      expect(JSON.stringify(entry)).not.toMatch(/Jane|jane\.doe/);
    }
  });

  it("admin affiliate commission and withdrawal lists show a deleted affiliate as a placeholder", async () => {
    const affiliate = await createUserWithSession();
    const commission = await prisma.affiliateCommission.create({
      data: {
        affiliateId: affiliate.id,
        providerPaymentId: `pay_${randomUUID()}`,
        amountCents: 120,
        rateBps: 200,
        status: "PAID",
      },
    });
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: { userId: affiliate.id, amountCents: 5_000, status: "PAID", paidAt: new Date() },
    });
    expect((await selfDelete(affiliate)).status).toBe(200);
    const api = await asAdmin();
    const placeholder = { id: "deleted", email: "Deleted account", name: null, deleted: true };

    const commissions = await api.get("/api/v1/admin/affiliates/commissions");
    expect(commissions.status, JSON.stringify(commissions.body)).toBe(200);
    const listedCommission = commissions.body.data.items.find(
      (item: { id: string }) => item.id === commission.id,
    );
    expect(listedCommission.affiliate).toMatchObject(placeholder);

    const withdrawals = await api.get("/api/v1/admin/affiliates/withdrawals");
    expect(withdrawals.status, JSON.stringify(withdrawals.body)).toBe(200);
    const listedWithdrawal = withdrawals.body.data.items.find(
      (item: { id: string }) => item.id === withdrawal.id,
    );
    expect(listedWithdrawal.user).toMatchObject(placeholder);
  });

  it("a credit-pack payment for a deleted account grants nothing and does not fail", async () => {
    const target = await createUserWithSession();
    expect((await selfDelete(target)).status).toBe(200);
    const errorLog = vi.spyOn(logger, "error");
    const paymentId = `pay_${randomUUID()}`;

    const { response, eventId } = await deliver({
      type: "payment.succeeded",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: paymentId,
        subscription_id: null,
        product_cart: [{ product_id: "prod_pack_250", quantity: 1 }],
        total_amount: 299,
        settlement_amount: 299,
        settlement_tax: null,
        tax: null,
        currency: "USD",
        settlement_currency: "USD",
        is_update_payment_method: false,
        created_at: new Date().toISOString(),
        metadata: { veriworkly_user_id: target.id, veriworkly_product: "credit_pack_250" },
      },
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const stored = await prisma.billingWebhookEvent.findUnique({
      where: { providerEventId: eventId },
    });
    expect(stored?.status).toBe("PROCESSED");
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.creditWallet.count({ where: { userId: target.id } })).toBe(0);
    // Money was taken for an account that no longer exists: a human has to refund it.
    expect(stored?.error).toMatch(/refund needed/i);
    expect(stored?.error).toContain(paymentId);
    expect(stored?.error).toContain("299");
    const refundLog = errorLog.mock.calls.find(([message]) =>
      /refund needed/i.test(String(message)),
    );
    expect(refundLog).toBeDefined();
    expect(JSON.stringify(refundLog)).not.toContain(target.email);
  });

  it("a failed payment for a deleted account is processed and redacted, not failed", async () => {
    const target = await createUserWithSession();
    expect((await selfDelete(target)).status).toBe(200);

    const { response, eventId } = await deliver({
      type: "payment.failed",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: `pay_${randomUUID()}`,
        subscription_id: null,
        product_cart: [{ product_id: "prod_bundle_seven_day", quantity: 1 }],
        total_amount: 599,
        settlement_amount: 599,
        currency: "USD",
        settlement_currency: "USD",
        is_update_payment_method: false,
        created_at: new Date().toISOString(),
        customer: { customer_id: "cus_gone", email: target.email, name: "Gone" },
        metadata: { veriworkly_user_id: target.id },
      },
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const stored = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { providerEventId: eventId },
    });
    expect(stored).toMatchObject({ status: "PROCESSED", userId: null });
    expect(JSON.stringify(stored.payload)).not.toContain(target.email);
  });

  it("deletion strips personal data from the kept webhook events, keeping ids, status and amounts", async () => {
    const target = await createUserWithSession();
    const other = await createUserWithSession();
    const sub = await subscription(target.id, { status: "CANCELED", rawStatus: "cancelled" });

    const event = (userId: string | null, data: Prisma.InputJsonObject) =>
      prisma.billingWebhookEvent.create({
        data: {
          providerEventId: `evt_${randomUUID()}`,
          userId,
          type: "payment.succeeded",
          payload: { type: "payment.succeeded", timestamp: new Date().toISOString(), data },
          status: "PROCESSED",
        },
      });
    const payment = (userId: string, subscriptionId = sub.providerSubId) => ({
      payment_id: `pay_${randomUUID()}`,
      subscription_id: subscriptionId,
      status: "succeeded",
      total_amount: 999,
      settlement_amount: 999,
      currency: "USD",
      settlement_currency: "USD",
      customer: {
        customer_id: "cus_deletion",
        name: "Jane Personal",
        email: "jane.personal@example.test",
        phone_number: "+15550100",
      },
      billing: { street: "1 Private Lane", city: "Hometown", zipcode: "12345", country: "US" },
      card_last_four: "4242",
      metadata: { veriworkly_user_id: userId, veriworkly_product: "portfolio_pro" },
    });

    const owned = await event(target.id, payment(target.id));
    // Never attributed (it failed), but it names the account in its metadata.
    const unattributed = await event(null, payment(target.id));
    const someoneElse = await event(other.id, payment(other.id, `sub_${randomUUID()}`));

    expect((await selfDelete(target)).status).toBe(200);

    for (const row of [owned, unattributed]) {
      const kept = await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: row.id } });
      const text = JSON.stringify(kept.payload);
      for (const personal of [
        "Jane Personal",
        "jane.personal",
        "+15550100",
        "Private Lane",
        "Hometown",
        "card_last_four",
        "zipcode",
      ])
        expect(text, personal).not.toContain(personal);

      const data = (kept.payload as { data: Record<string, unknown> }).data;
      expect(data).toMatchObject({
        payment_id: (row.payload as { data: { payment_id: string } }).data.payment_id,
        subscription_id: sub.providerSubId,
        status: "succeeded",
        total_amount: 999,
        currency: "USD",
        customer: { customer_id: "cus_deletion" },
        metadata: { veriworkly_user_id: target.id },
      });
      expect(kept.status).toBe("PROCESSED");
      expect(kept.type).toBe("payment.succeeded");
    }

    // Another customer's events are not touched.
    const untouched = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { id: someoneElse.id },
    });
    expect(JSON.stringify(untouched.payload)).toContain("jane.personal@example.test");
  });

  it("an event that arrives after deletion is stored without the personal data it carries", async () => {
    const target = await createUserWithSession();
    expect((await selfDelete(target)).status).toBe(200);

    const { response, eventId } = await deliver({
      type: "payment.succeeded",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: `pay_${randomUUID()}`,
        subscription_id: null,
        product_cart: [{ product_id: "prod_pack_250", quantity: 1 }],
        total_amount: 299,
        settlement_amount: 299,
        currency: "USD",
        settlement_currency: "USD",
        is_update_payment_method: false,
        customer: { customer_id: "cus_late", name: "Late Person", email: "late@example.test" },
        billing: { street: "2 Late Street", city: "Lateville", country: "US" },
        metadata: { veriworkly_user_id: target.id, veriworkly_product: "credit_pack_250" },
      },
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const stored = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { providerEventId: eventId },
    });
    expect(stored.status).toBe("PROCESSED");
    const text = JSON.stringify(stored.payload);
    for (const personal of ["Late Person", "late@example.test", "Late Street", "Lateville"])
      expect(text, personal).not.toContain(personal);
    expect(text).toContain("cus_late");
  });

  it("admin billing lists show detached rows with a deleted-account placeholder, and refuse to edit them", async () => {
    const target = await createUserWithSession();
    const sub = await subscription(target.id, { status: "CANCELED", rawStatus: "cancelled" });
    const entitlement = await prisma.entitlementGrant.create({
      data: { userId: target.id, key: "analytics", source: "MANUAL", sourceId: randomUUID() },
    });
    await seedLedger(target.id);
    expect((await selfDelete(target)).status).toBe(200);
    const api = await asAdmin();

    for (const path of ["subscriptions", "credits", "entitlements", "webhooks"]) {
      const response = await api.get(`/api/v1/admin/billing/${path}`);
      expect(response.status, `${path}: ${JSON.stringify(response.body)}`).toBe(200);
    }
    const subscriptions = await api.get("/api/v1/admin/billing/subscriptions");
    const listed = subscriptions.body.data.items.find((item: { id: string }) => item.id === sub.id);
    // The studio reads row.user.id and row.user.email: a detached row carries a placeholder.
    const placeholder = { id: "deleted", email: "Deleted account", name: null, deleted: true };
    expect(listed.user).toMatchObject(placeholder);
    const credits = await api.get("/api/v1/admin/billing/credits");
    expect(credits.body.data.items.every((item: { user: unknown }) => item.user !== null)).toBe(
      true,
    );
    const entitlements = await api.get("/api/v1/admin/billing/entitlements");
    const listedGrant = entitlements.body.data.items.find(
      (item: { id: string }) => item.id === entitlement.id,
    );
    expect(listedGrant.user).toMatchObject(placeholder);

    const edit = await api
      .patch(`/api/v1/admin/billing/subscriptions/${sub.id}`)
      .send({ status: "ACTIVE", reason: "integration test" });
    expect(edit.status, JSON.stringify(edit.body)).toBe(409);

    const revoke = await api
      .delete(`/api/v1/admin/billing/entitlements/${entitlement.id}`)
      .send({ reason: "integration test" });
    expect(revoke.status, JSON.stringify(revoke.body)).toBe(409);
  });
});
