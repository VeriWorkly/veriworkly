import { randomBytes, randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * V-081 and V-082, step 1 of 3: the server accepts and checks the new fields when the studio
 * sends them, and still accepts a request without them.
 * - V-081: an optional `reason` (trimmed, 3..500 characters) on every admin write that had none,
 *   recorded as the audit entry's reason. On a withdrawal it is separate from `payoutNote` (the
 *   note the affiliate sees), and on an ambassador review separate from `reviewNote`.
 * - V-082: an optional `confirm` on the three destructive actions without one, compared exactly
 *   after trimming with the identifier the admin list shows: the portfolio's `subdomain`, the
 *   share link's `slug`, the API key's `keyPrefix`. A mismatch is a 400 that changes nothing.
 */

vi.mock("#services/mail/transporter", () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));
// The sync itself pages GitHub in the background; only the request and its audit entry matter here.
vi.mock("#services/admin/adminSyncTrigger", () => ({
  startGitHubSync: vi.fn(),
  startChangelogSync: vi
    .fn()
    .mockResolvedValue({ status: "started", statusUrl: "/api/v1/admin/changelog/sync" }),
}));

const admin = adminClient();

const REASON = "  Checked against the support ticket  ";
const TRIMMED_REASON = "Checked against the support ticket";

async function auditFor(action: string, targetId?: string) {
  return prisma.adminAuditEntry.findMany({
    where: { action, ...(targetId ? { targetId } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

function expectTooShort(response: { status: number; body: { details?: unknown } }) {
  expect(response.status, JSON.stringify(response.body)).toBe(400);
  expect(JSON.stringify(response.body.details)).toContain("Reason must be at least 3 characters");
}

async function seedAffiliate() {
  const affiliate = await createUserWithSession();
  await prisma.user.update({
    where: { id: affiliate.id },
    data: { affiliateStatus: "ACTIVE", affiliateCode: `code${randomUUID().slice(0, 8)}` },
  });
  const referred = await createUserWithSession();
  const referral = await prisma.affiliateReferral.create({
    data: { affiliateId: affiliate.id, referredUserId: referred.id, code: "code" },
  });
  await prisma.affiliateWallet.create({
    data: { userId: affiliate.id, pendingCents: 0, availableCents: 0, paidCents: 0 },
  });
  return { affiliate, referred, referral };
}

async function seedCommission() {
  const { affiliate, referral } = await seedAffiliate();
  const commission = await prisma.affiliateCommission.create({
    data: {
      affiliateId: affiliate.id,
      referralId: referral.id,
      providerPaymentId: `pay_${randomUUID()}`,
      amountCents: 500,
      rateBps: 2_000,
      status: "PENDING",
    },
  });
  await prisma.affiliateWallet.update({
    where: { userId: affiliate.id },
    data: { pendingCents: 500 },
  });
  return commission;
}

async function seedWithdrawal() {
  const { affiliate } = await seedAffiliate();
  return prisma.affiliateWithdrawal.create({
    data: { userId: affiliate.id, amountCents: 1_000, status: "REQUESTED" },
  });
}

async function seedApplication() {
  const user = await createUserWithSession();
  await prisma.user.update({ where: { id: user.id }, data: { ambassadorStatus: "PENDING" } });
  return prisma.ambassadorApplication.create({
    data: {
      userId: user.id,
      collegeName: "Example College",
      graduationYear: "2027",
      whyJoin: "To help classmates write better resumes.",
      superpower: "Explaining things",
      funFact: "Has read every Discworld novel",
    },
  });
}

async function seedRoadmapFeature() {
  return prisma.roadmapFeature.create({
    data: { id: `rf-${randomUUID().slice(0, 8)}`, title: "Feature", description: "Body" },
  });
}

async function seedChangelogEntry() {
  return prisma.changelogEntry.create({
    data: {
      id: `cl-${randomUUID().slice(0, 8)}`,
      version: `9.${randomBytes(2).readUInt16BE()}.0`,
      title: "Release",
      publishedAt: new Date(),
    },
  });
}

async function seedPublication() {
  const owner = await createUserWithSession();
  const suffix = randomUUID().slice(0, 8);
  const document = await prisma.document.create({
    data: {
      userId: owner.id,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: `p-${suffix}`,
      content: {},
      visibility: "PUBLIC",
    },
  });
  return prisma.portfolioPublication.create({
    data: {
      userId: owner.id,
      documentId: document.id,
      subdomain: `pub-${suffix}`,
      templateId: "signal",
      snapshot: {},
      status: "LIVE",
    },
  });
}

async function seedShareLink() {
  const owner = await createUserWithSession();
  const document = await prisma.document.create({
    data: {
      userId: owner.id,
      type: "RESUME",
      title: "Resume",
      slug: `r-${randomUUID()}`,
      content: {},
    },
  });
  return prisma.shareLink.create({
    data: {
      userId: owner.id,
      documentId: document.id,
      slug: `share-${randomUUID().slice(0, 8)}`,
      snapshot: { basics: { name: "Owner" } },
    },
  });
}

async function seedApiKey() {
  const owner = await createUserWithSession();
  const raw = `vw_${randomBytes(24).toString("hex")}`;
  return prisma.apiKey.create({
    data: {
      keyHash: randomBytes(32).toString("hex"),
      keyPrefix: raw.slice(0, 8),
      keySuffix: raw.slice(-8),
      name: "integration key",
      userId: owner.id,
    },
  });
}

describe("V-081 reason on affiliate standing", () => {
  it("accepts no reason, records a given one, and refuses a too-short one", async () => {
    const { affiliate } = await seedAffiliate();
    const path = `/admin/affiliates/${affiliate.id}`;

    expect((await admin.request("patch", path).send({ tier: "TIER_2" })).status).toBe(200);

    const withReason = await admin.request("patch", path).send({ tier: "TIER_3", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    expectTooShort(await admin.request("patch", path).send({ tier: "TIER_1", reason: " ab " }));

    const entries = await auditFor("affiliate.update", affiliate.id);
    expect(entries.map((entry) => entry.reason)).toEqual([null, TRIMMED_REASON]);
  });
});

describe("V-081 reason on commission create and update", () => {
  it("create: accepts no reason, records a given one, and refuses a too-short one", async () => {
    const { referred } = await seedAffiliate();
    const body = (providerPaymentId: string) => ({
      referredUserId: referred.id,
      providerPaymentId,
      purchaseAmountCents: 10_000,
    });

    const without = await admin.request("post", "/admin/affiliates/commissions").send(body("p-1"));
    expect(without.status, JSON.stringify(without.body)).toBe(200);

    const withReason = await admin
      .request("post", "/admin/affiliates/commissions")
      .send({ ...body("p-2"), reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    expectTooShort(
      await admin
        .request("post", "/admin/affiliates/commissions")
        .send({ ...body("p-3"), reason: "ab" }),
    );
    expect(await prisma.affiliateCommission.count({ where: { providerPaymentId: "p-3" } })).toBe(0);

    const entries = await auditFor("affiliate.commission.create");
    expect(entries.map((entry) => entry.reason)).toEqual([null, TRIMMED_REASON]);
  });

  it("update: accepts no reason, records a given one, and refuses a too-short one", async () => {
    const first = await seedCommission();
    const second = await seedCommission();
    const third = await seedCommission();

    const without = await admin
      .request("patch", `/admin/affiliates/commissions/${first.id}`)
      .send({ status: "AVAILABLE" });
    expect(without.status, JSON.stringify(without.body)).toBe(200);

    const withReason = await admin
      .request("patch", `/admin/affiliates/commissions/${second.id}`)
      .send({ status: "AVAILABLE", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    expectTooShort(
      await admin
        .request("patch", `/admin/affiliates/commissions/${third.id}`)
        .send({ status: "AVAILABLE", reason: "ab" }),
    );
    expect(
      (await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: third.id } })).status,
    ).toBe("PENDING");

    expect((await auditFor("affiliate.commission.update", first.id))[0]?.reason).toBeNull();
    expect((await auditFor("affiliate.commission.update", second.id))[0]?.reason).toBe(
      TRIMMED_REASON,
    );
  });
});

describe("V-081 reason on withdrawal approve, reject and paid", () => {
  it("accepts no reason; without one the audit keeps the payout note, as before", async () => {
    const withdrawal = await seedWithdrawal();

    const response = await admin
      .request("patch", `/admin/affiliates/withdrawals/${withdrawal.id}`)
      .send({ status: "APPROVED", payoutNote: "Approved, paying Friday" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const [entry] = await auditFor("affiliate.withdrawal.update", withdrawal.id);
    expect(entry?.reason).toBe("Approved, paying Friday");
  });

  it.each(["APPROVED", "REJECTED"] as const)(
    "%s: records the internal reason and never shows it to the affiliate",
    async (status) => {
      const withdrawal = await seedWithdrawal();

      const response = await admin
        .request("patch", `/admin/affiliates/withdrawals/${withdrawal.id}`)
        .send({ status, payoutNote: "Note for the affiliate", reason: REASON });
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain(TRIMMED_REASON);

      const row = await prisma.affiliateWithdrawal.findUniqueOrThrow({
        where: { id: withdrawal.id },
      });
      expect(row.payoutNote).toBe("Note for the affiliate");
      expect(JSON.stringify(row)).not.toContain(TRIMMED_REASON);

      const [entry] = await auditFor("affiliate.withdrawal.update", withdrawal.id);
      expect(entry?.reason).toBe(TRIMMED_REASON);
    },
  );

  it("PAID: records the internal reason without a payout note", async () => {
    const withdrawal = await seedWithdrawal();
    await prisma.affiliateWithdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "APPROVED" },
    });

    const response = await admin
      .request("patch", `/admin/affiliates/withdrawals/${withdrawal.id}`)
      .send({ status: "PAID", reason: REASON });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const row = await prisma.affiliateWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(row.status).toBe("PAID");
    expect(row.payoutNote).toBeNull();
    const [entry] = await auditFor("affiliate.withdrawal.update", withdrawal.id);
    expect(entry?.reason).toBe(TRIMMED_REASON);
  });

  it("refuses a too-short reason and moves nothing", async () => {
    const withdrawal = await seedWithdrawal();

    expectTooShort(
      await admin
        .request("patch", `/admin/affiliates/withdrawals/${withdrawal.id}`)
        .send({ status: "APPROVED", payoutNote: "Fine", reason: "ab" }),
    );
    const row = await prisma.affiliateWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(row.status).toBe("REQUESTED");
    expect(await auditFor("affiliate.withdrawal.update", withdrawal.id)).toHaveLength(0);
  });
});

describe("V-081 reason on ambassador review", () => {
  it("accepts no reason, records a given one apart from the review note, and refuses a too-short one", async () => {
    const plain = await seedApplication();
    const reasoned = await seedApplication();
    const short = await seedApplication();

    const without = await admin
      .request("patch", `/admin/ambassadors/${plain.id}`)
      .send({ action: "APPROVE" });
    expect(without.status, JSON.stringify(without.body)).toBe(200);

    const withReason = await admin
      .request("patch", `/admin/ambassadors/${reasoned.id}`)
      .send({ action: "REJECT", reviewNote: "Apply again next term", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    expectTooShort(
      await admin
        .request("patch", `/admin/ambassadors/${short.id}`)
        .send({ action: "APPROVE", reason: "ab" }),
    );
    expect(
      (await prisma.ambassadorApplication.findUniqueOrThrow({ where: { id: short.id } })).status,
    ).toBe("PENDING");

    expect((await auditFor("ambassador.application.approve", plain.id))[0]?.reason).toBeNull();
    expect((await auditFor("ambassador.application.reject", reasoned.id))[0]?.reason).toBe(
      TRIMMED_REASON,
    );
    const row = await prisma.ambassadorApplication.findUniqueOrThrow({
      where: { id: reasoned.id },
    });
    expect(row.reviewNote).toBe("Apply again next term");
  });
});

describe("V-081 reason on roadmap writes", () => {
  it("create: accepts no reason, records a given one, and refuses a too-short one", async () => {
    const without = await admin
      .request("post", "/admin/roadmap")
      .send({ id: "rm-plain", title: "Plain", description: "Body" });
    expect(without.status, JSON.stringify(without.body)).toBe(201);

    const withReason = await admin
      .request("post", "/admin/roadmap")
      .send({ id: "rm-reason", title: "Reasoned", description: "Body", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(201);

    expectTooShort(
      await admin
        .request("post", "/admin/roadmap")
        .send({ id: "rm-short", title: "Short", description: "Body", reason: "ab" }),
    );
    expect(await prisma.roadmapFeature.count({ where: { id: "rm-short" } })).toBe(0);

    expect((await auditFor("roadmap.feature.create", "rm-plain"))[0]?.reason).toBeNull();
    expect((await auditFor("roadmap.feature.create", "rm-reason"))[0]?.reason).toBe(TRIMMED_REASON);
  });

  it("update: accepts no reason, records a given one (not as a field), and refuses a too-short one", async () => {
    const feature = await seedRoadmapFeature();
    const path = `/admin/roadmap/${feature.id}`;

    expect((await admin.request("put", path).send({ title: "One" })).status).toBe(200);
    expect((await admin.request("put", path).send({ title: "Two", reason: REASON })).status).toBe(
      200,
    );
    expectTooShort(await admin.request("put", path).send({ title: "Three", reason: "ab" }));
    // A reason alone is not an edit.
    expect((await admin.request("put", path).send({ reason: REASON })).status).toBe(400);

    const row = await prisma.roadmapFeature.findUniqueOrThrow({ where: { id: feature.id } });
    expect(row.title).toBe("Two");

    const entries = await auditFor("roadmap.feature.update", feature.id);
    expect(entries.map((entry) => entry.reason)).toEqual([null, TRIMMED_REASON]);
    expect(entries[1]?.metadata).toEqual({ fields: ["title"] });
  });

  it("delete: accepts no reason, records a given one from the body or the query, and refuses a too-short one", async () => {
    const plain = await seedRoadmapFeature();
    const body = await seedRoadmapFeature();
    const query = await seedRoadmapFeature();
    const short = await seedRoadmapFeature();

    expect((await admin.request("delete", `/admin/roadmap/${plain.id}`)).status).toBe(200);
    expect(
      (await admin.request("delete", `/admin/roadmap/${body.id}`).send({ reason: REASON })).status,
    ).toBe(200);
    expect(
      (await admin.request("delete", `/admin/roadmap/${query.id}`).query({ reason: REASON }))
        .status,
    ).toBe(200);
    expectTooShort(
      await admin.request("delete", `/admin/roadmap/${short.id}`).send({ reason: "ab" }),
    );
    expect(await prisma.roadmapFeature.count({ where: { id: short.id } })).toBe(1);

    expect((await auditFor("roadmap.feature.delete", plain.id))[0]?.reason).toBeNull();
    expect((await auditFor("roadmap.feature.delete", body.id))[0]?.reason).toBe(TRIMMED_REASON);
    expect((await auditFor("roadmap.feature.delete", query.id))[0]?.reason).toBe(TRIMMED_REASON);
  });
});

describe("V-081 reason on changelog writes", () => {
  it("create: accepts no reason, records a given one, and refuses a too-short one", async () => {
    const without = await admin
      .request("post", "/admin/changelog")
      .send({ id: "cl-plain", version: "8.0.0", title: "Plain" });
    expect(without.status, JSON.stringify(without.body)).toBe(201);

    const withReason = await admin
      .request("post", "/admin/changelog")
      .send({ id: "cl-reason", version: "8.0.1", title: "Reasoned", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(201);

    expectTooShort(
      await admin
        .request("post", "/admin/changelog")
        .send({ id: "cl-short", version: "8.0.2", title: "Short", reason: "ab" }),
    );
    expect(await prisma.changelogEntry.count({ where: { id: "cl-short" } })).toBe(0);

    expect((await auditFor("changelog.entry.create", "cl-plain"))[0]?.reason).toBeNull();
    expect((await auditFor("changelog.entry.create", "cl-reason"))[0]?.reason).toBe(TRIMMED_REASON);
  });

  it("update: accepts no reason, records a given one (not as a field), and refuses a too-short one", async () => {
    const entry = await seedChangelogEntry();
    const path = `/admin/changelog/${entry.id}`;

    expect((await admin.request("put", path).send({ title: "One" })).status).toBe(200);
    expect((await admin.request("put", path).send({ title: "Two", reason: REASON })).status).toBe(
      200,
    );
    expectTooShort(await admin.request("put", path).send({ title: "Three", reason: "ab" }));
    expect((await admin.request("put", path).send({ reason: REASON })).status).toBe(400);

    const row = await prisma.changelogEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(row.title).toBe("Two");

    const entries = await auditFor("changelog.entry.update", entry.id);
    expect(entries.map((item) => item.reason)).toEqual([null, TRIMMED_REASON]);
    expect(entries[1]?.metadata).toEqual({ fields: ["title"] });
  });

  it("delete: accepts no reason, records a given one, and refuses a too-short one", async () => {
    const plain = await seedChangelogEntry();
    const reasoned = await seedChangelogEntry();
    const short = await seedChangelogEntry();

    expect((await admin.request("delete", `/admin/changelog/${plain.id}`)).status).toBe(200);
    expect(
      (await admin.request("delete", `/admin/changelog/${reasoned.id}`).send({ reason: REASON }))
        .status,
    ).toBe(200);
    expectTooShort(
      await admin.request("delete", `/admin/changelog/${short.id}`).send({ reason: "ab" }),
    );
    expect(await prisma.changelogEntry.count({ where: { id: short.id } })).toBe(1);

    expect((await auditFor("changelog.entry.delete", plain.id))[0]?.reason).toBeNull();
    expect((await auditFor("changelog.entry.delete", reasoned.id))[0]?.reason).toBe(TRIMMED_REASON);
  });

  it("sync: accepts no reason, records a given one, and refuses a too-short one", async () => {
    expect((await admin.request("post", "/admin/changelog/sync")).status).toBe(202);
    expect(
      (await admin.request("post", "/admin/changelog/sync").send({ reason: REASON })).status,
    ).toBe(202);
    expectTooShort(await admin.request("post", "/admin/changelog/sync").send({ reason: "ab" }));

    const entries = await auditFor("changelog.sync");
    expect(entries.map((entry) => entry.reason)).toEqual([null, TRIMMED_REASON]);
  });
});

describe("V-082 typed confirmation on portfolio hard unpublish", () => {
  const unpublish = (id: string) => admin.request("delete", `/admin/portfolios/${id}`);

  it("a wrong confirm is a 400 and the site stays live", async () => {
    const publication = await seedPublication();

    const response = await unpublish(publication.id).send({
      reason: "Phishing content",
      confirm: `${publication.subdomain}-x`,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");
    expect(response.body.message).toMatch(/subdomain/i);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("LIVE");
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: publication.documentId },
    });
    expect(document.visibility).toBe("PUBLIC");
    expect(await auditFor("portfolio.unpublish", publication.id)).toHaveLength(0);
  });

  it("the subdomain, trimmed, takes the site down", async () => {
    const publication = await seedPublication();

    const response = await unpublish(publication.id).send({
      reason: "Phishing content",
      confirm: `  ${publication.subdomain}  `,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("SUSPENDED");
    expect(await auditFor("portfolio.unpublish", publication.id)).toHaveLength(1);
  });

  it("no confirm still takes the site down, as today", async () => {
    const publication = await seedPublication();

    const response = await unpublish(publication.id).send({ reason: "Phishing content" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("SUSPENDED");
  });
});

describe("V-082 typed confirmation on share-link revoke", () => {
  const revoke = (id: string) => admin.request("delete", `/admin/share-links/${id}`);

  it("the admin list shows the identifier as `slug`", async () => {
    const share = await seedShareLink();
    const list = await admin.request("get", "/admin/share-links");
    expect(list.status).toBe(200);
    expect(list.body.data.items.find((item: { id: string }) => item.id === share.id)?.slug).toBe(
      share.slug,
    );
  });

  it("a wrong confirm is a 400 and the link survives", async () => {
    const share = await seedShareLink();

    const response = await revoke(share.id).send({
      reason: "Reported abuse",
      confirm: share.slug.toUpperCase(),
    });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");
    expect(await prisma.shareLink.count({ where: { id: share.id } })).toBe(1);
    expect(await auditFor("share_link.revoke", share.id)).toHaveLength(0);
  });

  it("the slug revokes the link, from the body or the query", async () => {
    const fromBody = await seedShareLink();
    const fromQuery = await seedShareLink();

    const body = await revoke(fromBody.id).send({
      reason: "Reported abuse",
      confirm: fromBody.slug,
    });
    expect(body.status, JSON.stringify(body.body)).toBe(200);
    const query = await revoke(fromQuery.id).query({
      reason: "Reported abuse",
      confirm: fromQuery.slug,
    });
    expect(query.status, JSON.stringify(query.body)).toBe(200);
    expect(
      await prisma.shareLink.count({ where: { id: { in: [fromBody.id, fromQuery.id] } } }),
    ).toBe(0);
  });

  it("no confirm still revokes, as today", async () => {
    const share = await seedShareLink();
    const response = await revoke(share.id).send({ reason: "Reported abuse" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await prisma.shareLink.count({ where: { id: share.id } })).toBe(0);
  });
});

describe("V-082 typed confirmation on API-key revoke", () => {
  const revoke = (id: string) => admin.request("delete", `/admin/api-keys/${id}`);

  it("a wrong confirm (the key's name) is a 400 and the key stays live", async () => {
    const key = await seedApiKey();

    const response = await revoke(key.id).send({ reason: "Leaked in a repo", confirm: key.name });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");

    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(row.revokedAt).toBeNull();
    expect(row.isActive).toBe(true);
    expect(await auditFor("api_key.revoke", key.id)).toHaveLength(0);
  });

  it("the key prefix revokes the key", async () => {
    const key = await seedApiKey();

    const response = await revoke(key.id).send({
      reason: "Leaked in a repo",
      confirm: key.keyPrefix,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      (await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).revokedAt,
    ).not.toBeNull();
    expect(await auditFor("api_key.revoke", key.id)).toHaveLength(1);
  });

  it("no confirm still revokes, as today", async () => {
    const key = await seedApiKey();
    const response = await revoke(key.id).send({ reason: "Leaked in a repo" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      (await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).revokedAt,
    ).not.toBeNull();
  });
});
