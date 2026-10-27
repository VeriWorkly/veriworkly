import { randomUUID } from "node:crypto";

import request from "supertest";
import { expect } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "../env.js";
import { createUserWithSession, type TestUser } from "./auth.js";
import { signDodoWebhook } from "./webhook.js";

/**
 * Builders for the Dodo events and the requests the billing integration files share. A test file
 * that uses them still mocks the mail module and the outbound Dodo calls itself (`vi.mock` is
 * hoisted per file).
 */

export const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";
export const DAY_MS = 24 * 60 * 60 * 1000;

export function eventTime(step = 0) {
  return new Date(Date.now() - 60_000 + step * 1000);
}

export function subscriptionEvent(input: {
  userId: string;
  subscriptionId: string;
  productId: string;
  status: string;
  at: Date;
  nextBillingDate: Date | null;
  type?: string;
  cancelAtNextBillingDate?: boolean;
  amount?: number;
}) {
  return {
    type: input.type ?? `subscription.${input.status}`,
    timestamp: input.at.toISOString(),
    data: {
      subscription_id: input.subscriptionId,
      customer: { customer_id: "cus_test" },
      product_id: input.productId,
      status: input.status,
      cancel_at_next_billing_date: input.cancelAtNextBillingDate ?? false,
      next_billing_date: input.nextBillingDate ? input.nextBillingDate.toISOString() : null,
      recurring_pre_tax_amount: input.amount ?? 599,
      currency: "USD",
      metadata: { veriworkly_user_id: input.userId },
    },
  };
}

export function paymentEvent(input: {
  userId: string;
  type?: string;
  paymentId?: string;
  subscriptionId?: string | null;
  productId: string;
  amount: number;
  metadata?: Record<string, string>;
  at?: Date;
  chargeType?: string;
  servicePeriod?: { startsAt: Date; endsAt: Date };
}) {
  const at = input.at ?? eventTime();
  return {
    type: input.type ?? "payment.succeeded",
    timestamp: at.toISOString(),
    data: {
      payment_id: input.paymentId ?? `pay_${randomUUID()}`,
      subscription_id: input.subscriptionId ?? null,
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      total_amount: input.amount,
      settlement_amount: input.amount,
      currency: "USD",
      settlement_currency: "USD",
      is_update_payment_method: false,
      created_at: at.toISOString(),
      customer: { customer_id: "cus_test" },
      ...(input.chargeType ? { charge_type: input.chargeType } : {}),
      ...(input.servicePeriod
        ? {
            service_periods: [
              {
                subscription_id: input.subscriptionId,
                starts_at: input.servicePeriod.startsAt.toISOString(),
                ends_at: input.servicePeriod.endsAt.toISOString(),
              },
            ],
          }
        : {}),
      metadata: input.metadata ?? { veriworkly_user_id: input.userId },
    },
  };
}

/** A pack purchase as the checkout tags it. */
export function packPayment(userId: string, amount = 499, paymentId?: string) {
  return paymentEvent({
    userId,
    paymentId,
    productId: "prod_pack_500",
    amount,
    metadata: { veriworkly_user_id: userId, veriworkly_product: "credit_pack_500" },
  });
}

/** A 7-Day Hunt Pass purchase as the checkout tags it. */
export function passPayment(userId: string, amount = 599, at?: Date) {
  return paymentEvent({
    userId,
    productId: "prod_bundle_seven_day",
    amount,
    at,
    metadata: {
      veriworkly_user_id: userId,
      veriworkly_product: "bundle",
      veriworkly_interval: "seven_day",
    },
  });
}

export function refundEvent(
  paymentId: string,
  data: { amount?: number | null; isPartial?: boolean | null; currency?: string } = {},
) {
  return {
    type: "refund.succeeded",
    timestamp: new Date().toISOString(),
    data: {
      refund_id: `ref_${randomUUID()}`,
      payment_id: paymentId,
      status: "succeeded",
      ...(data.isPartial === undefined ? { is_partial: false } : { is_partial: data.isPartial }),
      ...(data.amount === undefined ? {} : { amount: data.amount }),
      currency: data.currency ?? "USD",
      created_at: new Date().toISOString(),
    },
  };
}

export function disputeEvent(
  paymentId: string,
  type: string,
  amount: string,
  status = type.replace("dispute.", "dispute_"),
) {
  return {
    type,
    timestamp: new Date().toISOString(),
    data: {
      dispute_id: `dsp_${randomUUID()}`,
      payment_id: paymentId,
      business_id: "bus_test",
      amount,
      currency: "USD",
      dispute_stage: "dispute",
      dispute_status: status,
      created_at: new Date().toISOString(),
    },
  };
}

export async function deliver(event: unknown, id?: string) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body, id ? { id } : {});
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return { response, eventId: headers["webhook-id"] as string };
}

export function asUser(user: TestUser, method: "get" | "post" | "patch" | "delete", url: string) {
  return request(app)[method](url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

export async function billingMe(user: TestUser) {
  const response = await asUser(user, "get", "/api/v1/billing/me");
  expect(response.status).toBe(200);
  return response.body.data;
}

export async function billingHistory(user: TestUser) {
  const response = await asUser(user, "get", "/api/v1/billing/history");
  expect(response.status).toBe(200);
  return response.body.data as Array<Record<string, unknown>>;
}

/** balance + reserved must equal what the grants still hold, at every step. */
export async function expectLedgerBalanced(userId: string) {
  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  const remaining = await prisma.creditGrant.aggregate({
    where: { userId },
    _sum: { remaining: true },
  });
  expect((wallet?.balance ?? 0) + (wallet?.reserved ?? 0)).toBe(remaining._sum.remaining ?? 0);
}

/**
 * An enrolled affiliate whose session came from a routable address (every test request comes
 * from loopback, which would otherwise flag each referral as sharing the affiliate's address).
 */
export async function enrolledAffiliate() {
  const user = await createUserWithSession();
  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { ipAddress: "203.0.113.7" },
  });
  const response = await asUser(user, "post", "/api/v1/affiliates/enroll").send({});
  expect(response.status).toBe(200);
  return { user, code: response.body.data.affiliateCode as string };
}

export async function referredUser(code: string) {
  const user = await createUserWithSession();
  const response = await asUser(user, "post", "/api/v1/affiliates/referral").send({ code });
  expect(response.status).toBe(200);
  return user;
}

export function affiliateWallet(userId: string) {
  return prisma.affiliateWallet.findUniqueOrThrow({
    where: { userId },
    select: { pendingCents: true, availableCents: true, paidCents: true, clawbackCents: true },
  });
}
