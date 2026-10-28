import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const { billingMailMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("#services/mail/billingMail", () => billingMailMock);
vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { PortfolioService } from "#services/portfolioService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import {
  DAY_MS,
  deliver,
  disputeEvent,
  eventTime,
  passPayment,
  paymentEvent,
  refundEvent,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * V-401: a refund or a lost dispute on what paid for a premium portfolio (a pass, or a
 * subscription period that is cancelled) takes the live Nimbus site down to the free tier, as the
 * owner rule says ("lapsed portfolios drop to free"), and the public read stops serving the paid
 * template. V-402: deleting the account takes the cached public portfolio down at once.
 */

function premiumContent() {
  return {
    schemaVersion: 1,
    templateId: "nimbus",
    identity: {
      name: "Test Person",
      headline: "Builds things",
      bio: "A bio long enough to publish.",
      location: "Somewhere",
      email: "person@example.test",
      availability: "Open",
      avatar: null,
    },
    seo: { title: "Test Person", description: "Portfolio", socialImage: null },
    socialLinks: [],
    sections: [{ id: "projects", type: "projects", title: "Work", visible: true, items: [] }],
  };
}

async function livePremiumSite(userId: string, templateId = "nimbus") {
  const subdomain = `paid${randomUUID().slice(0, 8)}`;
  const document = await prisma.document.create({
    data: {
      userId,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: subdomain,
      templateId,
      content: { ...premiumContent(), templateId },
      visibility: "PUBLIC",
    },
  });
  await prisma.portfolioPublication.create({
    data: {
      userId,
      documentId: document.id,
      subdomain,
      templateId,
      snapshot: { ...premiumContent(), templateId },
    },
  });
  return subdomain;
}

const publicRead = (subdomain: string) =>
  request(app).get(`/api/v1/portfolios/public/${subdomain}`).set("Origin", STUDIO_ORIGIN);

async function expectServedOnFreeTier(userId: string, subdomain: string) {
  // At once, before any scheduled job: the reversal itself stops the paid template being served.
  const atOnce = await publicRead(subdomain);
  expect(JSON.stringify(atOnce.body)).not.toContain('"nimbus"');
  expect(
    (await prisma.portfolioPublication.findUniqueOrThrow({ where: { userId } })).status,
  ).not.toBe("GRACE");

  // What the hourly job does; the reversal may already have settled it.
  await PortfolioService.settleLapsedPortfolios();

  const row = await prisma.portfolioPublication.findUniqueOrThrow({ where: { userId } });
  expect(row.templateId).not.toBe("nimbus");
  expect(row.status).toBe("LIVE");

  const served = await publicRead(subdomain);
  expect(served.status, JSON.stringify(served.body)).toBe(200);
  expect(JSON.stringify(served.body)).not.toContain('"nimbus"');
}

async function passHolder() {
  const user = await createUserWithSession();
  const payment = passPayment(user.id);
  await deliver(payment);
  const subdomain = await livePremiumSite(user.id);
  // Warm the public read on the paid template.
  const warm = await publicRead(subdomain);
  expect(warm.status, JSON.stringify(warm.body)).toBe(200);
  expect(JSON.stringify(warm.body)).toContain('"nimbus"');
  return { user, subdomain, paymentId: payment.data.payment_id };
}

describe("V-401 a reversed payment takes a premium portfolio to the free tier", () => {
  it("a refunded pass", async () => {
    const { user, subdomain, paymentId } = await passHolder();

    await deliver(refundEvent(paymentId, { amount: 599 }));

    await expectServedOnFreeTier(user.id, subdomain);
  });

  it("a pass lost in a dispute", async () => {
    const { user, subdomain, paymentId } = await passHolder();

    await deliver(disputeEvent(paymentId, "dispute.lost", "599"));

    await expectServedOnFreeTier(user.id, subdomain);
  });

  it("a refunded period of a cancelled subscription", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodEnd = new Date(Date.now() + 25 * DAY_MS);
    const subscription = (status: string, step: number) =>
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status,
        at: eventTime(step),
        nextBillingDate: periodEnd,
      });
    await deliver(subscription("active", 0));
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_bundle_monthly",
      amount: 1499,
      at: eventTime(1),
    });
    await deliver(payment);
    const subdomain = await livePremiumSite(user.id);
    expect((await publicRead(subdomain)).status).toBe(200);

    await deliver(subscription("cancelled", 2));
    // Cancelled at period end: still paid for, still premium.
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { userId: user.id } }))
        .templateId,
    ).toBe("nimbus");

    await deliver(refundEvent(payment.data.payment_id, { amount: 1499 }));

    await expectServedOnFreeTier(user.id, subdomain);
  });
});

describe("V-402 deleting the account takes the public portfolio down at once", () => {
  async function ownerWithWarmSite() {
    const owner = await createUserWithSession();
    const subdomain = await livePremiumSite(owner.id, "signal");
    expect((await publicRead(subdomain)).status).toBe(200);
    expect((await publicRead(subdomain)).status).toBe(200);
    return { owner, subdomain };
  }

  async function expectGone(owner: TestUser, subdomain: string) {
    expect((await publicRead(subdomain)).status).toBe(404);
    expect(
      await prisma.portfolioPublication.findUnique({ where: { userId: owner.id } }),
    ).toBeNull();
  }

  it("on the owner's own deletion", async () => {
    const { owner, subdomain } = await ownerWithWarmSite();

    const removed = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", owner.cookie);
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);

    await expectGone(owner, subdomain);
  });

  it("on an admin deletion", async () => {
    const admin = await createUserWithSession({ email: "admin@example.test" });
    const { owner, subdomain } = await ownerWithWarmSite();

    const removed = await request(app)
      .delete(`/api/v1/admin/users/${owner.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", admin.cookie)
      .send({ confirmEmail: owner.email, reason: "Requested erasure" });
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);

    await expectGone(owner, subdomain);
  });
});
