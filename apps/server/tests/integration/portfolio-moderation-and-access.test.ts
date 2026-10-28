import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { settleLapsedPortfolios } from "#jobs/portfolioAccessJob";
import { PortfolioAssetService } from "#services/portfolioAssetService";
import { settleBillingNotifications } from "#services/billingNotifications";
import { PortfolioService } from "#services/portfolioService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

const { mailMock } = vi.hoisted(() => ({
  mailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
    sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("#services/mail/billingMail", () => mailMock);
vi.mock("#services/mail/portfolioMail", () => mailMock);

const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";
const DAY_MS = 24 * 60 * 60 * 1000;

let adminPromise: Promise<TestUser> | null = null;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function asUser(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

/** Public routes sit behind `flexibleAuth`, which wants a first-party Origin even without a session. */
function publicGet(path: string) {
  return request(app).get(path).set("Origin", STUDIO_ORIGIN);
}

function validContent(templateId: "signal" | "atelier" | "nimbus" | "cipher") {
  return {
    schemaVersion: 1,
    templateId,
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

async function seedPublication(
  userId: string,
  templateId: "signal" | "atelier" | "nimbus" | "cipher",
  overrides: {
    status?: "LIVE" | "GRACE" | "SUSPENDED";
    suspensionReason?: string | null;
    subdomain?: string;
  } = {},
) {
  const suffix = randomUUID().slice(0, 8);
  const subdomain = overrides.subdomain ?? `pub-${suffix}`;
  const document = await prisma.document.create({
    data: {
      userId,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: subdomain,
      templateId,
      content: validContent(templateId),
      visibility: "PUBLIC",
    },
  });
  const publication = await prisma.portfolioPublication.create({
    data: {
      userId,
      documentId: document.id,
      subdomain,
      templateId,
      snapshot: validContent(templateId),
      status: overrides.status ?? "LIVE",
      suspensionReason: overrides.suspensionReason ?? null,
      suspendedAt: overrides.status === "SUSPENDED" ? new Date() : null,
    },
  });
  return { document, publication };
}

async function publicationOf(userId: string) {
  return prisma.portfolioPublication.findUniqueOrThrow({ where: { userId } });
}

/**
 * Decision 6: a lapsed premium portfolio stays online on a free template with the badge. The row
 * is LIVE, the stored template and the snapshot's own `templateId` agree, the badge and the paid
 * SEO block are gone, and the public read serves it as a free site.
 */
async function expectDroppedToFree(userId: string, templateId: "signal" | "atelier") {
  const row = await publicationOf(userId);
  expect(row.status).toBe("LIVE");
  expect(row.suspensionReason).toBeNull();
  expect(row.templateId).toBe(templateId);

  const snapshot = row.snapshot as {
    templateId: string;
    removeWatermark?: boolean;
    seo: { title: string };
  };
  expect(snapshot.templateId).toBe(templateId);
  expect(snapshot.removeWatermark).toBe(false);
  expect(snapshot.seo.title).toBe("");

  const served = await publicGet(`/api/v1/portfolios/public/${row.subdomain}`);
  expect(served.status).toBe(200);
  expect(served.body.data.templateId).toBe(templateId);
  expect(served.body.data.isPaid).toBe(false);
  expect(served.body.data.isPremiumTemplate).toBe(false);
  expect(served.body.data.isPremium).toBe(false);

  return row;
}

async function expectUntouchedSignal(userId: string) {
  const row = await publicationOf(userId);
  expect(row.status).toBe("LIVE");
  expect(row.templateId).toBe("signal");
  expect((row.snapshot as { seo: { title: string } }).seo.title).toBe("Test Person");
}

function subscriptionEvent(input: {
  userId: string;
  subscriptionId: string;
  productId?: string;
  status: "active" | "cancelled" | "on_hold" | "expired";
  at?: Date;
  nextBillingDate?: Date | null;
}) {
  const at = input.at ?? new Date(Date.now() - 60_000);
  return {
    type: `subscription.${input.status}`,
    timestamp: at.toISOString(),
    data: {
      subscription_id: input.subscriptionId,
      customer: { customer_id: "cus_portfolio" },
      product_id: input.productId ?? "prod_portfolio_pro_monthly",
      status: input.status,
      cancel_at_next_billing_date: false,
      next_billing_date:
        input.nextBillingDate === undefined
          ? new Date(Date.now() + 30 * DAY_MS).toISOString()
          : input.nextBillingDate
            ? input.nextBillingDate.toISOString()
            : null,
      metadata: { veriworkly_user_id: input.userId },
    },
  };
}

async function deliver(event: unknown) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body);
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  expect(response.status).toBe(200);
  return response;
}

async function adminSuspend(publicationId: string) {
  const response = await asUser(
    await admin(),
    request(app).patch(`/api/v1/admin/portfolios/${publicationId}`),
  ).send({ status: "SUSPENDED", reason: "Impersonation reported by the trademark owner" });
  expect(response.status).toBe(200);
  return response;
}

describe("V-039 sticky moderation", () => {
  it("refuses the user's Publish with 403 and keeps the row SUSPENDED", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    await adminSuspend(publication.id);

    const publish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });

    expect(publish.status).toBe(403);
    expect(publish.body.message ?? publish.body.error).toMatch(/taken down by a moderator/i);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toMatch(/^moderation:/);
  });

  it("survives a renewal webhook", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus");

    await adminSuspend(publication.id);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: `sub_${randomUUID()}`,
        status: "active",
      }),
    );

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toMatch(/^moderation:/);
  });

  it("is not cleared by the user's own unpublish", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "signal");

    await adminSuspend(publication.id);

    const unpublish = await asUser(user, request(app).post("/api/v1/portfolios/unpublish")).send();
    expect(unpublish.status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toMatch(/^moderation:/);
  });

  it("a force-unpublish cannot be undone by the owner publishing again", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    const takedown = await asUser(
      await admin(),
      request(app).delete(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ reason: "Phishing page", confirm: publication.subdomain });
    expect(takedown.status, JSON.stringify(takedown.body)).toBe(200);

    const publish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });

    expect(publish.status, JSON.stringify(publish.body)).toBe(403);
    expect(publish.body.message ?? publish.body.error).toMatch(/taken down by a moderator/i);
    // V-225: the row stays, as a moderation takedown, so its view history is kept.
    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("moderation:Phishing page");
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).visibility,
    ).toBe("PRIVATE");
  });

  it("V-225: a force-unpublish keeps the portfolio's daily views and takes the site offline", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "signal");
    await prisma.portfolioViewDaily.createMany({
      data: [
        { publicationId: publication.id, date: new Date(Date.now() - DAY_MS), count: 4 },
        {
          publicationId: publication.id,
          date: new Date(Date.now() - 2 * DAY_MS),
          referrerHost: "example.test",
          count: 2,
        },
      ],
    });

    const takedown = await asUser(
      await admin(),
      request(app).delete(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ reason: "Phishing page", confirm: publication.subdomain });
    expect(takedown.status, JSON.stringify(takedown.body)).toBe(200);
    expect(takedown.body.data).toMatchObject({
      id: publication.id,
      subdomain: publication.subdomain,
    });

    expect(
      await prisma.portfolioViewDaily.count({ where: { publicationId: publication.id } }),
    ).toBe(2);
    expect((await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`)).status).toBe(
      404,
    );
    const listed = await publicGet("/api/v1/portfolios/public");
    expect(JSON.stringify(listed.body)).not.toContain(publication.subdomain);
  });

  it("V-248: the suspended-portfolio queue counts takedowns and billing suspensions, not the owner's own unpublish", async () => {
    const owner = await createUserWithSession();
    const billed = await createUserWithSession();
    await seedPublication(owner.id, "signal", {
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
    await seedPublication(billed.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "moderation:Spam",
    });

    const expected = await prisma.portfolioPublication.count({
      where: { status: "SUSPENDED", NOT: { suspensionReason: "user_unpublished" } },
    });

    const queue = await asUser(await admin(), request(app).get("/api/v1/admin/overview/queue"));
    expect(queue.status, JSON.stringify(queue.body)).toBe(200);
    expect(queue.body.data.suspendedPortfolios).toBe(expected);

    const overview = await asUser(await admin(), request(app).get("/api/v1/admin/overview"));
    expect(overview.status).toBe(200);
    expect(overview.body.data.actionQueue.suspendedPortfolios).toBe(expected);
  });

  it("is lifted by the admin setting LIVE, after which the user can publish again", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    await adminSuspend(publication.id);

    const lift = await asUser(
      await admin(),
      request(app).patch(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ status: "LIVE", reason: "Counter-notice accepted" });
    expect(lift.status).toBe(200);

    const publish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });
    expect(publish.status).toBe(201);
    expect((await publicationOf(user.id)).status).toBe("LIVE");
  });
});

describe("V-041 section schema", () => {
  it("saves a draft with a certifications section carrying subtitle and settings, and round-trips them", async () => {
    const user = await createUserWithSession();
    const content = {
      ...validContent("signal"),
      sections: [
        {
          id: "certs",
          type: "certifications",
          title: "Certifications",
          subtitle: "Verified credentials",
          visible: true,
          items: [{ name: "AWS SAA" }],
          settings: { layout: "grid", columns: 2 },
        },
      ],
    };

    const save = await asUser(user, request(app).put("/api/v1/portfolios/draft")).send({
      subdomain: `draft-${randomUUID().slice(0, 8)}`,
      snapshot: content,
    });
    expect(save.status).toBe(200);

    const me = await asUser(user, request(app).get("/api/v1/portfolios/me"));
    expect(me.status).toBe(200);
    const section = me.body.data.draft.content.sections[0];
    expect(section.type).toBe("certifications");
    expect(section.subtitle).toBe("Verified credentials");
    expect(section.settings).toEqual({ layout: "grid", columns: 2 });
  });
});

describe("V-042 / decision 6: a lapse moves premium templates only, to the free tier", () => {
  /**
   * A paying subscriber whose paid period has since run out: activated 40 days ago for a
   * 30-day period (the row is edited directly because an `active` event with a past period
   * grants nothing), so the next lapse event finds nothing left to honour.
   */
  async function lapsedSubscriber(templateId: "signal" | "nimbus") {
    const user = await createUserWithSession();
    const seeded = await seedPublication(user.id, templateId);
    const subscriptionId = `sub_${randomUUID()}`;
    const start = new Date(Date.now() - 40 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        status: "active",
        at: start,
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    expect((await publicationOf(user.id)).status).toBe("LIVE");
    await prisma.subscription.updateMany({
      where: { providerSubId: subscriptionId },
      data: { currentPeriodEnd: new Date(start.getTime() + 30 * DAY_MS) },
    });
    return { user, subscriptionId, ...seeded };
  }

  it("expired past the paid period: Signal is untouched, Nimbus drops to Atelier and stays LIVE", async () => {
    const signal = await lapsedSubscriber("signal");
    const nimbus = await lapsedSubscriber("nimbus");

    for (const { user, subscriptionId } of [signal, nimbus]) {
      await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId,
          status: "expired",
          at: new Date(Date.now() - 5 * DAY_MS),
          nextBillingDate: null,
        }),
      );
    }

    await settleLapsedPortfolios();

    await expectUntouchedSignal(signal.user.id);
    await expectDroppedToFree(nimbus.user.id, "atelier");
  });

  it("on_hold then grace expiry through the job: Signal is untouched, Nimbus drops to Atelier and stays LIVE", async () => {
    const signal = await lapsedSubscriber("signal");
    const nimbus = await lapsedSubscriber("nimbus");

    for (const { user, subscriptionId } of [signal, nimbus]) {
      await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId,
          status: "on_hold",
          at: new Date(Date.now() - 5 * DAY_MS),
          nextBillingDate: null,
        }),
      );
      await prisma.subscription.updateMany({
        where: { providerSubId: subscriptionId },
        data: { graceEndsAt: new Date(Date.now() - DAY_MS) },
      });
    }

    expect((await publicationOf(signal.user.id)).status).toBe("LIVE");
    expect((await publicationOf(nimbus.user.id)).status).toBe("GRACE");

    await settleLapsedPortfolios();

    await expectUntouchedSignal(signal.user.id);
    await expectDroppedToFree(nimbus.user.id, "atelier");
  });

  it("the expiry webhook itself drops the premium site to the free tier: no offline gap until the job", async () => {
    const nimbus = await lapsedSubscriber("nimbus");
    // The public read is cached while the site is premium; the drop must clear it.
    const before = await publicGet(`/api/v1/portfolios/public/${nimbus.publication.subdomain}`);
    expect(before.body.data.isPaid).toBe(true);

    await deliver(
      subscriptionEvent({
        userId: nimbus.user.id,
        subscriptionId: nimbus.subscriptionId,
        status: "expired",
        at: new Date(Date.now() - 5 * DAY_MS),
        nextBillingDate: null,
      }),
    );

    // No settleLapsedPortfolios() here: the webhook did it.
    await expectDroppedToFree(nimbus.user.id, "atelier");
  });

  it("the webhook leaves a moderated premium site down, and a grace window running", async () => {
    const moderated = await lapsedSubscriber("nimbus");
    await adminSuspend(moderated.publication.id);
    const graced = await lapsedSubscriber("nimbus");

    await deliver(
      subscriptionEvent({
        userId: moderated.user.id,
        subscriptionId: moderated.subscriptionId,
        status: "expired",
        at: new Date(Date.now() - 5 * DAY_MS),
        nextBillingDate: null,
      }),
    );
    await deliver(
      subscriptionEvent({
        userId: graced.user.id,
        subscriptionId: graced.subscriptionId,
        status: "on_hold",
        at: new Date(Date.now() - 5 * DAY_MS),
        nextBillingDate: null,
      }),
    );

    const down = await publicationOf(moderated.user.id);
    expect(down.status).toBe("SUSPENDED");
    expect(down.templateId).toBe("nimbus");
    expect(down.suspensionReason).toContain("Impersonation reported by the trademark owner");

    const grace = await publicationOf(graced.user.id);
    expect(grace.status).toBe("GRACE");
    expect(grace.templateId).toBe("nimbus");
  });
});

describe("V-044 isPremium comes from grants", () => {
  it("a MANUAL portfolio_publish grant makes the public read premium", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus");
    await prisma.entitlementGrant.create({
      data: {
        userId: user.id,
        key: "portfolio_publish",
        source: "MANUAL",
        sourceId: randomUUID(),
      },
    });

    const response = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(response.status).toBe(200);
    expect(response.body.data.isPremium).toBe(true);
  });

  it("no grant means not premium even with a stray ACTIVE subscription row", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "signal");
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_${randomUUID()}`,
        providerCustomerId: "cus_x",
        productKey: "portfolio_pro",
        interval: "MONTHLY",
        status: "ACTIVE",
        rawStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 10 * DAY_MS),
      },
    });

    const response = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(response.status).toBe(200);
    expect(response.body.data.isPremium).toBe(false);
  });
});

describe("V-075 admin billing edits reconcile access", () => {
  it("granting portfolio_publish to a billing-suspended user brings the publication LIVE without a webhook", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });

    const grant = await asUser(
      await admin(),
      request(app).post("/api/v1/admin/billing/entitlements"),
    ).send({ userId: user.id, key: "portfolio_publish", reason: "Ambassador comp for Q4" });
    expect(grant.status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("LIVE");
    expect(row.suspensionReason).toBeNull();

    const pub = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.isPremium).toBe(true);
  });

  it("revoking the only publish grant drops a premium publication to the free tier at once and leaves a free one untouched", async () => {
    const premium = await createUserWithSession();
    const free = await createUserWithSession();
    await seedPublication(premium.id, "cipher");
    await seedPublication(free.id, "atelier");

    const grants = await Promise.all(
      [premium, free].map((user) =>
        prisma.entitlementGrant.create({
          data: {
            userId: user.id,
            key: "portfolio_publish",
            source: "MANUAL",
            sourceId: randomUUID(),
          },
        }),
      ),
    );

    for (const grant of grants) {
      const revoke = await asUser(
        await admin(),
        request(app).delete(`/api/v1/admin/billing/entitlements/${grant.id}`),
      ).send({ reason: "Comp period ended" });
      expect(revoke.status).toBe(200);
    }

    // Decision 6: no offline gap until the hourly job; Cipher goes to Signal and stays LIVE.
    await expectDroppedToFree(premium.id, "signal");
    const freeRow = await publicationOf(free.id);
    expect(freeRow.status).toBe("LIVE");
    expect(freeRow.templateId).toBe("atelier");
  });

  it("admin credit adjustments record the acting admin and dedupe on an Idempotency-Key", async () => {
    const user = await createUserWithSession();
    const key = `adj-${randomUUID()}`;

    for (let i = 0; i < 2; i += 1) {
      const response = await asUser(
        await admin(),
        request(app).post("/api/v1/admin/billing/credits"),
      )
        .set("Idempotency-Key", key)
        .send({ userId: user.id, amount: 50, reason: "Support goodwill credit" });
      expect(response.status).toBe(200);
    }

    const wallet = await prisma.creditWallet.findUnique({ where: { userId: user.id } });
    expect(wallet?.balance).toBe(50);

    const tx = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: "ADJUSTMENT" },
    });
    expect((tx?.metadata as { actorId?: string } | null)?.actorId).toBe((await admin()).id);

    // The replay changed nothing, so it is audited once.
    const audits = await prisma.adminAuditEntry.count({
      where: { action: "billing.credit.adjust", targetId: user.id },
    });
    expect(audits).toBe(1);
  });

  it("an Idempotency-Key reused with a different amount is a 409; for another user it is a fresh adjustment", async () => {
    const userA = await createUserWithSession();
    const userB = await createUserWithSession();
    const key = `adj-${randomUUID()}`;

    const first = await asUser(await admin(), request(app).post("/api/v1/admin/billing/credits"))
      .set("Idempotency-Key", key)
      .send({ userId: userA.id, amount: 50, reason: "Support goodwill credit" });
    expect(first.status).toBe(200);

    const otherAmount = await asUser(
      await admin(),
      request(app).post("/api/v1/admin/billing/credits"),
    )
      .set("Idempotency-Key", key)
      .send({ userId: userA.id, amount: 75, reason: "Support goodwill credit" });
    expect(otherAmount.status).toBe(409);

    // Request ids are scoped per user: the same key against another account is that account's
    // own first request, not a collision with user A's (and never a 500).
    const otherUser = await asUser(
      await admin(),
      request(app).post("/api/v1/admin/billing/credits"),
    )
      .set("Idempotency-Key", key)
      .send({ userId: userB.id, amount: 50, reason: "Support goodwill credit" });
    expect(otherUser.status).toBe(200);

    expect((await prisma.creditWallet.findUnique({ where: { userId: userA.id } }))?.balance).toBe(
      50,
    );
    expect((await prisma.creditWallet.findUnique({ where: { userId: userB.id } }))?.balance).toBe(
      50,
    );
  });
});

describe("V-076 admin document moderation unpublishes a portfolio", () => {
  it("hiding the PORTFOLIO document suspends its publication", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    const hide = await asUser(
      await admin(),
      request(app).patch(`/api/v1/admin/documents/${document.id}`),
    ).send({ visibility: "PRIVATE", reason: "Contains copyrighted material" });
    expect(hide.status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toMatch(/^moderation:/);

    const pub = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(pub.status).toBe(404);
  });

  it("soft-deleting the PORTFOLIO document suspends its publication", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "nimbus");

    const remove = await asUser(
      await admin(),
      request(app).delete(`/api/v1/admin/documents/${document.id}`),
    ).send({ reason: "Phishing page hosted on the portfolio" });
    expect(remove.status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toMatch(/^moderation:/);
  });
});

describe("V-203 an admin unlisting a portfolio lifts a takedown and never suspends a live site", () => {
  function setDocumentVisibility(documentId: string, visibility: "PRIVATE" | "UNLISTED") {
    return admin().then((moderator) =>
      asUser(moderator, request(app).patch(`/api/v1/admin/documents/${documentId}`)).send({
        visibility,
        reason: "Reviewed the report",
      }),
    );
  }

  async function moderatorPrivate(documentId: string) {
    const detail = await asUser(
      await admin(),
      request(app).get(`/api/v1/admin/documents/${documentId}`),
    );
    expect(detail.status).toBe(200);
    return detail.body.data.document.moderatorPrivate as boolean;
  }

  it("takedown, then UNLISTED: the lock is lifted, the site stays offline, and the owner can republish", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    expect((await setDocumentVisibility(document.id, "PRIVATE")).status).toBe(200);
    expect(await moderatorPrivate(document.id)).toBe(true);

    const blocked = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });
    expect(blocked.status).toBe(403);

    const lift = await setDocumentVisibility(document.id, "UNLISTED");
    expect(lift.status, JSON.stringify(lift.body)).toBe(200);
    expect(await moderatorPrivate(document.id)).toBe(false);

    // Lifted to the owner's own unpublished state: offline until they choose to publish.
    const lifted = await publicationOf(user.id);
    expect(lifted.status).toBe("SUSPENDED");
    expect(lifted.suspensionReason).toBe("user_unpublished");
    expect((await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`)).status).toBe(
      404,
    );

    const republish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });
    expect(republish.status, JSON.stringify(republish.body)).toBe(201);
    expect((await publicationOf(user.id)).status).toBe("LIVE");

    const entries = await prisma.adminAuditEntry.findMany({
      where: { targetType: "PortfolioPublication", targetId: publication.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].metadata).toMatchObject({
      previousSuspensionReason: "moderation:document_hidden",
      suspensionReason: "user_unpublished",
      documentId: document.id,
    });
  });

  it("a force-unpublish is lifted by unlisting the document, and the owner can publish again", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    const takedown = await asUser(
      await admin(),
      request(app).delete(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ reason: "Phishing page", confirm: publication.subdomain });
    expect(takedown.status).toBe(200);

    expect((await setDocumentVisibility(document.id, "UNLISTED")).status).toBe(200);
    expect(await moderatorPrivate(document.id)).toBe(false);

    const republish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: publication.subdomain,
      revision: document.revision,
    });
    expect(republish.status, JSON.stringify(republish.body)).toBe(201);
  });

  it("unlisting a live, unmoderated portfolio keeps it live", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    expect((await setDocumentVisibility(document.id, "UNLISTED")).status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("LIVE");
    expect(row.suspensionReason).toBeNull();
    expect((await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`)).status).toBe(
      200,
    );
    expect(await moderatorPrivate(document.id)).toBe(false);
  });

  it("unlisting leaves the owner's own unpublish as it was", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "signal", {
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });

    expect((await setDocumentVisibility(document.id, "UNLISTED")).status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("user_unpublished");
  });

  it("a publication that changed after it was read is 409 and nothing commits", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");

    // The admin's read sees a takedown; the row is LIVE by the time the lift writes.
    const stale = vi.spyOn(prisma.portfolioPublication, "findUnique").mockResolvedValueOnce({
      id: publication.id,
      subdomain: publication.subdomain,
      status: "SUSPENDED",
      suspensionReason: "moderation:document_hidden",
    } as never);
    try {
      const response = await setDocumentVisibility(document.id, "UNLISTED");
      expect(response.status, JSON.stringify(response.body)).toBe(409);
    } finally {
      stale.mockRestore();
    }

    const row = await publicationOf(user.id);
    expect(row.status).toBe("LIVE");
    expect(row.suspensionReason).toBeNull();
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).visibility,
    ).toBe("PUBLIC");
    expect(await prisma.adminAuditEntry.count({ where: { targetId: document.id } })).toBe(0);
  });

  it("résumé moderation is unchanged: PRIVATE locks the owner out, UNLISTED lifts it", async () => {
    const user = await createUserWithSession();
    const resume = await prisma.document.create({
      data: {
        userId: user.id,
        title: "Resume",
        slug: `resume-${randomUUID().slice(0, 8)}`,
        content: { basics: { name: "Owner" } },
        visibility: "UNLISTED",
      },
    });

    expect((await setDocumentVisibility(resume.id, "PRIVATE")).status).toBe(200);
    expect(await moderatorPrivate(resume.id)).toBe(true);
    const share = () =>
      asUser(user, request(app).post("/api/v1/shares")).send({
        documentId: resume.id,
        snapshot: { basics: { name: "Owner" } },
        noExpiry: true,
      });
    expect((await share()).status).toBe(403);

    expect((await setDocumentVisibility(resume.id, "UNLISTED")).status).toBe(200);
    expect(await moderatorPrivate(resume.id)).toBe(false);
    const shared = await share();
    expect(shared.status, JSON.stringify(shared.body)).toBeLessThan(300);
    expect(
      await prisma.adminAuditEntry.count({
        where: {
          targetType: "PortfolioPublication",
          metadata: { path: ["documentId"], equals: resume.id },
        },
      }),
    ).toBe(0);
  });
});

describe("V-043 / V-050 public cache namespace and reserved subdomains", () => {
  it("the subdomain 'list' never returns the sitemap list, and the list is never a publication", async () => {
    const user = await createUserWithSession();
    await seedPublication(user.id, "signal");

    const list = await publicGet("/api/v1/portfolios/public");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThan(0);

    const asSite = await publicGet("/api/v1/portfolios/public/list");
    expect(asSite.status).toBe(404);

    const listAgain = await publicGet("/api/v1/portfolios/public");
    expect(listAgain.status).toBe(200);
    expect(Array.isArray(listAgain.body.data)).toBe(true);
  });

  it("reserved and invalid public subdomains with no publication are 404, not 400", async () => {
    for (const name of ["mail", "status", "xn--pple-43d", "---", "admin"]) {
      const response = await publicGet(`/api/v1/portfolios/public/${name}`);
      expect(response.status, name).toBe(404);
    }
  });

  it("a publication that predates the reserved list keeps serving and its owner keeps saving; a newcomer is refused", async () => {
    const owner = await createUserWithSession();
    const { document } = await seedPublication(owner.id, "signal", { subdomain: "dev" });

    const served = await publicGet("/api/v1/portfolios/public/dev");
    expect(served.status).toBe(200);
    expect(served.body.data.subdomain).toBe("dev");

    const ownerSave = await asUser(owner, request(app).put("/api/v1/portfolios/draft")).send({
      documentId: document.id,
      revision: document.revision,
      subdomain: "dev",
      snapshot: validContent("signal"),
    });
    expect(ownerSave.status).toBe(200);
    expect(ownerSave.body.data.slug).toBe("dev");

    const ownerCheck = await asUser(
      owner,
      request(app).get("/api/v1/portfolios/subdomains/dev/availability"),
    );
    expect(ownerCheck.status).toBe(200);
    expect(ownerCheck.body.data.available).toBe(true);

    const newcomer = await createUserWithSession();
    const newcomerSave = await asUser(newcomer, request(app).put("/api/v1/portfolios/draft")).send({
      subdomain: "dev",
      snapshot: validContent("signal"),
    });
    expect(newcomerSave.status).toBe(400);

    const newcomerCheck = await asUser(
      newcomer,
      request(app).get("/api/v1/portfolios/subdomains/help/availability"),
    );
    expect(newcomerCheck.status).toBe(400);
  });
});

describe("free templates have no grace period", () => {
  it("admin cannot move a free-template publication to GRACE", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "atelier");

    const response = await asUser(
      await admin(),
      request(app).patch(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ status: "GRACE", reason: "Trying to park a free site" });
    expect(response.status).toBe(400);
    expect((await publicationOf(user.id)).status).toBe("LIVE");
  });

  it("a free-template publication never renders as premium, grant or not", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "signal");
    await prisma.entitlementGrant.create({
      data: {
        userId: user.id,
        key: "portfolio_publish",
        source: "MANUAL",
        sourceId: randomUUID(),
      },
    });

    const response = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(response.status).toBe(200);
    expect(response.body.data.isPremium).toBe(false);
  });
});

describe("pass and comp expiry through the access job", () => {
  async function withGrant(userId: string, endsAt: Date | null) {
    await prisma.entitlementGrant.create({
      data: {
        userId,
        key: "portfolio_publish",
        source: "SYSTEM",
        sourceId: randomUUID(),
        startsAt: new Date(Date.now() - 10 * DAY_MS),
        endsAt,
        metadata: { pass: true },
      },
    });
  }

  it("V-222: an expired pass drops a premium publication straight to the free tier, with no paid grace; a live pass and a free template are untouched", async () => {
    const expired = await createUserWithSession();
    const live = await createUserWithSession();
    const free = await createUserWithSession();
    await seedPublication(expired.id, "nimbus");
    await seedPublication(live.id, "cipher");
    await seedPublication(free.id, "signal");
    await withGrant(expired.id, new Date(Date.now() - DAY_MS));
    await withGrant(live.id, new Date(Date.now() + DAY_MS));
    await withGrant(free.id, new Date(Date.now() - DAY_MS));

    await settleLapsedPortfolios();

    // One sweep: a 3-day pass buys 3 days of premium, not 3 plus a week of grace.
    await expectDroppedToFree(expired.id, "atelier");
    expect((await publicationOf(live.id)).status).toBe("LIVE");
    expect((await publicationOf(live.id)).templateId).toBe("cipher");
    await expectUntouchedSignal(free.id);

    // It never went offline, so the email says it moved, not that it is back.
    await vi.waitFor(() =>
      expect(mailMock.sendPortfolioFreeTierEmail).toHaveBeenCalledWith(
        expired.email,
        expect.objectContaining({ wasOffline: false, freeTemplateName: "Atelier" }),
      ),
    );
  });

  it("V-222: a subscriber whose renewal webhook is late keeps the premium site, untouched and unannounced", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus");
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_late_${randomUUID().slice(0, 8)}`,
        productKey: "portfolio_pro",
        status: "ACTIVE",
        rawStatus: "active",
        currentPeriodEnd: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    mailMock.sendPortfolioFreeTierEmail.mockClear();

    await settleLapsedPortfolios();

    const row = await publicationOf(user.id);
    expect(row.status).toBe("LIVE");
    expect(row.templateId).toBe("nimbus");
    expect(row.updatedAt.getTime()).toBe(publication.updatedAt.getTime());
    // Every free-tier email the settle started has been sent or failed (V-359): none was.
    await settleBillingNotifications();
    expect(mailMock.sendPortfolioFreeTierEmail).not.toHaveBeenCalled();
  });

  it("V-222: an expired pass for an owner with an old portfolio subscription is never hidden on the way to the free tier", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "cipher");
    // A Creator Pro subscription that ended long ago: no clock of its own, but it exists.
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_old_${randomUUID().slice(0, 8)}`,
        productKey: "portfolio_pro",
        status: "CANCELED",
        currentPeriodEnd: new Date(Date.now() - 60 * DAY_MS),
      },
    });
    await withGrant(user.id, new Date(Date.now() - DAY_MS));

    await settleLapsedPortfolios();

    const served = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(served.status).toBe(200);
    await expectDroppedToFree(user.id, "signal");
  });
});

describe("admin entitlement search", () => {
  it("filters by the owner's email or name, ANDed with the active filter", async () => {
    const alice = await createUserWithSession({
      name: "Alice Needle",
      email: `alice-${randomUUID().slice(0, 6)}@example.test`,
    });
    const bob = await createUserWithSession({ name: "Bob Hay" });
    for (const user of [alice, bob]) {
      await prisma.entitlementGrant.create({
        data: { userId: user.id, key: "analytics", source: "MANUAL", sourceId: randomUUID() },
      });
    }
    await prisma.entitlementGrant.create({
      data: {
        userId: alice.id,
        key: "seo_controls",
        source: "MANUAL",
        sourceId: randomUUID(),
        revokedAt: new Date(),
      },
    });

    const byName = await asUser(
      await admin(),
      request(app)
        .get("/api/v1/admin/billing/entitlements")
        .query({ query: "needle", active: "true" }),
    );
    expect(byName.status).toBe(200);
    expect(byName.body.data.items.map((item: { userId: string }) => item.userId)).toEqual([
      alice.id,
    ]);

    const byEmail = await asUser(
      await admin(),
      request(app).get("/api/v1/admin/billing/entitlements").query({ query: "ALICE-" }),
    );
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.data.total).toBe(2);

    const all = await asUser(
      await admin(),
      request(app).get("/api/v1/admin/billing/entitlements").query({ userId: bob.id }),
    );
    expect(all.body.data.total).toBe(1);
  });
});

describe("V-137 portfolio status codes", () => {
  it("POST /portfolios/unpublish with no publication is 404", async () => {
    const user = await createUserWithSession();
    const response = await asUser(user, request(app).post("/api/v1/portfolios/unpublish")).send();
    expect(response.status).toBe(404);
  });

  it("publishing a premium template without entitlement is 402", async () => {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `nimbus-${randomUUID().slice(0, 8)}`,
        templateId: "nimbus",
        content: validContent("nimbus"),
      },
    });

    const response = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: document.slug,
      revision: document.revision,
    });
    expect(response.status).toBe(402);
  });
});

async function grantPass(userId: string, endsAt: Date | null) {
  await prisma.entitlementGrant.create({
    data: {
      userId,
      key: "portfolio_publish",
      source: "SYSTEM",
      sourceId: randomUUID(),
      startsAt: new Date(Date.now() - 10 * DAY_MS),
      endsAt,
      metadata: { pass: true },
    },
  });
}

describe("V-174 / V-187 public read: isPaid and isPremiumTemplate, no status", () => {
  it("a paying owner on a free template is paid (no badge, no redirect, sub-pages) and the template is not premium", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "signal");
    await grantPass(user.id, new Date(Date.now() + DAY_MS));

    const response = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(response.status).toBe(200);
    expect(response.body.data.isPaid).toBe(true);
    expect(response.body.data.isPremiumTemplate).toBe(false);
    expect(response.body.data).not.toHaveProperty("status");
  });

  it("a free owner on a premium template row is not paid, and the template is premium", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus");

    const response = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
    expect(response.status).toBe(200);
    expect(response.body.data.isPaid).toBe(false);
    expect(response.body.data.isPremiumTemplate).toBe(true);
    expect(response.body.data.isPremium).toBe(false);
    expect(response.body.data).not.toHaveProperty("status");
  });

  it("the sitemap list holds exactly the rows the public read serves", async () => {
    const live = await createUserWithSession();
    const servedGrace = await createUserWithSession();
    const hiddenGrace = await createUserWithSession();
    const suspended = await createUserWithSession();

    const liveRow = await seedPublication(live.id, "signal");
    const servedGraceRow = await seedPublication(servedGrace.id, "nimbus", { status: "GRACE" });
    const hiddenGraceRow = await seedPublication(hiddenGrace.id, "cipher", { status: "GRACE" });
    await seedPublication(suspended.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });

    // The served GRACE row's subscription grace still runs; the hidden one's has lapsed.
    for (const [user, graceEndsAt] of [
      [servedGrace, new Date(Date.now() + 3 * DAY_MS)],
      [hiddenGrace, new Date(Date.now() - DAY_MS)],
    ] as const) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          provider: "dodo",
          providerSubId: `sub_${randomUUID()}`,
          providerCustomerId: "cus_x",
          productKey: "portfolio_pro",
          interval: "MONTHLY",
          status: "PAST_DUE",
          rawStatus: "on_hold",
          currentPeriodEnd: new Date(Date.now() - 5 * DAY_MS),
          graceEndsAt,
        },
      });
    }

    const list = await publicGet("/api/v1/portfolios/public");
    expect(list.status).toBe(200);
    const listed = (list.body.data as Array<{ subdomain: string }>).map((row) => row.subdomain);

    for (const { publication } of [liveRow, servedGraceRow, hiddenGraceRow]) {
      const read = await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`);
      expect(listed.includes(publication.subdomain)).toBe(read.status === 200);
    }

    expect(listed).toContain(liveRow.publication.subdomain);
    expect(listed).toContain(servedGraceRow.publication.subdomain);
    expect(listed).not.toContain(hiddenGraceRow.publication.subdomain);
  });
});

describe("decision 6: a lapsed premium portfolio drops to the free tier and stays online", () => {
  it("Cipher drops to Signal: publication and draft switch, the badge returns, the images stay, and it is idempotent", async () => {
    const user = await createUserWithSession();
    const { publication, document } = await seedPublication(user.id, "cipher", {
      status: "GRACE",
    });

    // The snapshot shows an avatar the draft does not: only the live page protects it.
    const avatar = await prisma.portfolioAsset.create({
      data: {
        userId: user.id,
        key: `portfolio/${user.id}/${randomUUID()}.png`,
        kind: "AVATAR",
        mimeType: "image/png",
        sizeBytes: 1024,
        status: "READY",
      },
    });
    const snapshot = {
      ...validContent("cipher"),
      identity: {
        ...validContent("cipher").identity,
        avatar: { id: avatar.id, url: "https://cdn.example.test/a.png" },
      },
      removeWatermark: true,
    };
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { snapshot },
    });
    await prisma.$executeRaw`UPDATE "PortfolioPublication" SET "updatedAt" = now() - interval '8 days' WHERE "id" = ${publication.id}`;
    await prisma.$executeRaw`UPDATE "PortfolioAsset" SET "updatedAt" = now() - interval '2 days' WHERE "id" = ${avatar.id}`;

    await settleLapsedPortfolios();

    const row = await expectDroppedToFree(user.id, "signal");
    expect((row.snapshot as typeof snapshot).identity.avatar?.id).toBe(avatar.id);
    expect(row.publishedRevision).toBe(publication.publishedRevision);

    const draft = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(draft.templateId).toBe("signal");
    expect((draft.content as { templateId: string }).templateId).toBe("signal");
    expect(draft.revision).toBe(document.revision + 1);
    expect(draft.visibility).toBe("PUBLIC");

    // The stale sweep keeps the image the live page shows (no R2 call, the row survives).
    await PortfolioAssetService.cleanupStaleAssets();
    expect(await prisma.portfolioAsset.count({ where: { id: avatar.id } })).toBe(1);

    // A second run changes nothing.
    const before = await publicationOf(user.id);
    await settleLapsedPortfolios();
    const after = await publicationOf(user.id);
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    const draftAfter = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(draftAfter.revision).toBe(draft.revision);

    // A free owner can republish the switched draft straight away.
    const republish = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: row.subdomain,
      revision: draft.revision,
    });
    expect(republish.status).toBe(201);
  });

  it("a row billing suspended (no grant, no grace) comes back on the free tier", async () => {
    const user = await createUserWithSession();
    await seedPublication(user.id, "nimbus", { status: "SUSPENDED", suspensionReason: "CANCELED" });

    await settleLapsedPortfolios();

    await expectDroppedToFree(user.id, "atelier");
  });

  it("moderation and the user's own unpublish stay down; a paying owner's premium site is untouched", async () => {
    const moderated = await createUserWithSession();
    const unpublished = await createUserWithSession();
    const paying = await createUserWithSession();
    await seedPublication(moderated.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "moderation:spam",
    });
    await seedPublication(unpublished.id, "cipher", {
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
    await seedPublication(paying.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });
    await grantPass(paying.id, new Date(Date.now() + DAY_MS));

    await settleLapsedPortfolios();

    expect(await publicationOf(moderated.id)).toMatchObject({
      status: "SUSPENDED",
      templateId: "nimbus",
    });
    expect(await publicationOf(unpublished.id)).toMatchObject({
      status: "SUSPENDED",
      templateId: "cipher",
    });
    expect((await publicationOf(paying.id)).templateId).toBe("nimbus");
  });

  it("the draft is left alone when it has moved on from the published premium template", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "grace_expired",
    });
    await prisma.document.update({
      where: { id: document.id },
      data: {
        templateId: "signal",
        content: validContent("signal"),
        revision: { increment: 1 },
      },
    });

    await settleLapsedPortfolios();

    await expectDroppedToFree(user.id, "atelier");
    const draft = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(draft.templateId).toBe("signal");
    expect(draft.revision).toBe(document.revision + 1);
  });
});

describe("final review: deleted portfolios stay down, restores are bounded and announced", () => {
  async function trash(user: TestUser, documentId: string) {
    const response = await asUser(user, request(app).delete(`/api/v1/documents/${documentId}`));
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  }

  it("a billing-suspended portfolio its owner trashed is never brought back", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });

    await trash(user, document.id);
    expect((await publicationOf(user.id)).suspensionReason).toBe("user_unpublished");

    await settleLapsedPortfolios();
    await PortfolioService.settleLapsedPortfolioFor(user.id);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.templateId).toBe("nimbus");
    expect(mailMock.sendPortfolioFreeTierEmail).not.toHaveBeenCalledWith(
      user.email,
      expect.anything(),
    );
  });

  it("never brings back a publication whose document is deleted or purged", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "cipher", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });
    // Trashed outside deleteDocument (the retention purge, an old row): only the document says so.
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });

    await settleLapsedPortfolios();
    await PortfolioService.settleLapsedPortfolioFor(user.id);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.templateId).toBe("cipher");
  });

  it("the public read and the sitemap leave out a publication whose document is deleted", async () => {
    const user = await createUserWithSession();
    const { document, publication } = await seedPublication(user.id, "signal");
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });

    expect((await publicGet(`/api/v1/portfolios/public/${publication.subdomain}`)).status).toBe(
      404,
    );
    const list = await publicGet("/api/v1/portfolios/public");
    const listed = (list.body.data as Array<{ subdomain: string }>).map((row) => row.subdomain);
    expect(listed).not.toContain(publication.subdomain);
  });

  it("restores a recent billing suspension on the free template and emails the owner once", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { suspendedAt: new Date(Date.now() - 10 * DAY_MS) },
    });

    await settleLapsedPortfolios();
    await expectDroppedToFree(user.id, "atelier");

    const sentToUser = () =>
      mailMock.sendPortfolioFreeTierEmail.mock.calls.filter(([email]) => email === user.email);
    await vi.waitFor(() => expect(sentToUser().length).toBe(1));
    expect(sentToUser()[0]![1]).toMatchObject({ freeTemplateName: "Atelier" });

    await settleLapsedPortfolios();
    await PortfolioService.settleLapsedPortfolioFor(user.id);
    // The repeat settles started no second email, once every send in flight has landed (V-359).
    await settleBillingNotifications();
    expect(sentToUser().length).toBe(1);
  });

  it("leaves a billing suspension older than 30 days offline until the owner republishes", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { suspendedAt: new Date(Date.now() - 60 * DAY_MS) },
    });

    await settleLapsedPortfolios();

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.templateId).toBe("nimbus");
    expect(mailMock.sendPortfolioFreeTierEmail).not.toHaveBeenCalledWith(
      user.email,
      expect.anything(),
    );
  });

  it("names everything that unlocks a premium template in the publish error", async () => {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `nimbus-${randomUUID().slice(0, 8)}`,
        templateId: "nimbus",
        content: validContent("nimbus"),
      },
    });

    const response = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: document.slug,
      revision: document.revision,
    });

    expect(response.status).toBe(402);
    expect(response.body.message).toContain("Creator Pro, the Job Hunter Bundle or a pass");
    expect(response.body.message).not.toMatch(/Creator Pro subscription/);
  });
});

describe("last verification: suspensions keep their date, takedowns keep their lock", () => {
  it("trashing a portfolio keeps any moderation reason, even one without the moderation prefix", async () => {
    const user = await createUserWithSession();
    const { document } = await seedPublication(user.id, "signal", {
      status: "SUSPENDED",
      suspensionReason: "dmca_takedown",
    });

    const response = await asUser(user, request(app).delete(`/api/v1/documents/${document.id}`));
    expect(response.status).toBe(200);

    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("dmca_takedown");
  });

  it("a six-month-old billing suspension stays offline after a redelivered event and admin edits", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "nimbus", {
      status: "SUSPENDED",
      suspensionReason: "CANCELED",
    });
    const suspendedAt = new Date(Date.now() - 180 * DAY_MS);
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { suspendedAt },
    });
    const subscriptionId = `sub_${randomUUID()}`;
    const eventAt = new Date(Date.now() - 180 * DAY_MS);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: subscriptionId,
        productKey: "portfolio_pro",
        interval: "MONTHLY",
        status: "CANCELED",
        rawStatus: "cancelled",
        currentPeriodEnd: eventAt,
        lastWebhookAt: eventAt,
      },
    });

    // The same cancellation, delivered again.
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        status: "cancelled",
        at: eventAt,
        nextBillingDate: eventAt,
      }),
    );
    // Admin edits that reconcile the account's access.
    const adminUser = await admin();
    const credit = await asUser(adminUser, request(app).post("/api/v1/admin/billing/credits")).send(
      { userId: user.id, amount: 10, reason: "Support goodwill" },
    );
    expect(credit.status).toBe(200);
    const grant = await asUser(
      adminUser,
      request(app).post("/api/v1/admin/billing/entitlements"),
    ).send({ userId: user.id, key: "analytics", reason: "Support goodwill" });
    expect(grant.status).toBe(200);

    expect((await publicationOf(user.id)).suspendedAt?.getTime()).toBe(suspendedAt.getTime());
    await settleLapsedPortfolios();
    const row = await publicationOf(user.id);
    expect(row.status).toBe("SUSPENDED");
    expect(row.templateId).toBe("nimbus");
  });

  it("tells a portfolio that never went offline that it moved to the free template, not that it is back", async () => {
    const user = await createUserWithSession();
    const { publication } = await seedPublication(user.id, "cipher", { status: "GRACE" });
    await prisma.$executeRaw`UPDATE "PortfolioPublication" SET "updatedAt" = now() - interval '8 days' WHERE "id" = ${publication.id}`;

    await settleLapsedPortfolios();
    await expectDroppedToFree(user.id, "signal");

    await vi.waitFor(() =>
      expect(mailMock.sendPortfolioFreeTierEmail).toHaveBeenCalledWith(
        user.email,
        expect.objectContaining({ wasOffline: false, freeTemplateName: "Signal" }),
      ),
    );
  });

  it("names the premium template by its display name in the publish error", async () => {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `nimbus-${randomUUID().slice(0, 8)}`,
        templateId: "nimbus",
        content: validContent("nimbus"),
      },
    });

    const response = await asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
      documentId: document.id,
      subdomain: document.slug,
      revision: document.revision,
    });

    expect(response.status).toBe(402);
    expect(response.body.message).toContain('"Nimbus"');
  });
});
