import { randomBytes, randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * V-081 and V-082: the fields every admin write and every destructive admin action requires.
 * - V-081: a `reason` (trimmed, 3..500 characters, `adminReasonSchema`) on every admin write that
 *   had none, recorded as the audit entry's reason. Missing or blank is a 400 that changes
 *   nothing. On a withdrawal it is separate from `payoutNote` (the note the affiliate sees), and
 *   on an ambassador review separate from `reviewNote`; neither note stands in for it.
 * - V-082: a `confirm` on the three destructive actions without one, compared exactly after
 *   trimming with the identifier the admin list shows: the portfolio's `subdomain`, the share
 *   link's `slug`, the API key's `keyPrefix`. Missing or blank is CONFIRMATION_REQUIRED, wrong is
 *   CONFIRMATION_MISMATCH; both are a 400 that changes nothing.
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

type Response = { status: number; body: { details?: unknown } };

/** The messages `adminReasonSchema` gives, as on every other required admin reason. */
function expectReasonError(response: Response, message: string) {
  expect(response.status, JSON.stringify(response.body)).toBe(400);
  expect(response.body.details).toContainEqual({ path: "reason", message });
}

const expectTooShort = (response: Response) =>
  expectReasonError(response, "String must contain at least 3 character(s)");
const expectMissing = (response: Response) => expectReasonError(response, "Required");
/** Blank after trimming: refused as too short, like any required admin reason. */
const expectBlank = expectTooShort;

function expectConfirmationRequired(response: {
  status: number;
  body: { message?: string; details?: unknown };
}) {
  expect(response.status, JSON.stringify(response.body)).toBe(400);
  expect(response.body.details).toEqual({ code: "CONFIRMATION_REQUIRED", field: "confirm" });
  expect(response.body.message).toMatch(/confirm/i);
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
  it("requires a reason, records it, and refuses a too-short one", async () => {
    const { affiliate } = await seedAffiliate();
    const path = `/admin/affiliates/${affiliate.id}`;

    expectMissing(await admin.request("patch", path).send({ tier: "TIER_2" }));
    expectBlank(await admin.request("patch", path).send({ tier: "TIER_2", reason: "   " }));
    expectTooShort(await admin.request("patch", path).send({ tier: "TIER_2", reason: " ab " }));
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(untouched.affiliateTier).toBe("TIER_1");
    expect(await auditFor("affiliate.update", affiliate.id)).toHaveLength(0);

    const withReason = await admin.request("patch", path).send({ tier: "TIER_3", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    const entries = await auditFor("affiliate.update", affiliate.id);
    expect(entries.map((entry) => entry.reason)).toEqual([TRIMMED_REASON]);
  });
});

describe("V-081 reason on commission create and update", () => {
  it("create: requires a reason, records it, and refuses a too-short one", async () => {
    const { referred } = await seedAffiliate();
    const body = (providerPaymentId: string) => ({
      referredUserId: referred.id,
      providerPaymentId,
      purchaseAmountCents: 10_000,
    });
    const create = () => admin.request("post", "/admin/affiliates/commissions");

    expectMissing(await create().send(body("p-1")));
    expectBlank(await create().send({ ...body("p-1"), reason: "  " }));
    expectTooShort(await create().send({ ...body("p-1"), reason: "ab" }));
    expect(await prisma.affiliateCommission.count({ where: { providerPaymentId: "p-1" } })).toBe(0);

    const withReason = await create().send({ ...body("p-2"), reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);

    const entries = await auditFor("affiliate.commission.create");
    expect(entries.map((entry) => entry.reason)).toEqual([TRIMMED_REASON]);
  });

  it("update: requires a reason, records it, and refuses a too-short one", async () => {
    const refused = await seedCommission();
    const reasoned = await seedCommission();
    const update = (id: string) => admin.request("patch", `/admin/affiliates/commissions/${id}`);

    expectMissing(await update(refused.id).send({ status: "AVAILABLE" }));
    expectBlank(await update(refused.id).send({ status: "AVAILABLE", reason: " " }));
    expectTooShort(await update(refused.id).send({ status: "AVAILABLE", reason: "ab" }));
    expect(
      (await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: refused.id } })).status,
    ).toBe("PENDING");
    expect(await auditFor("affiliate.commission.update", refused.id)).toHaveLength(0);

    const withReason = await update(reasoned.id).send({ status: "AVAILABLE", reason: REASON });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(200);
    expect((await auditFor("affiliate.commission.update", reasoned.id))[0]?.reason).toBe(
      TRIMMED_REASON,
    );
  });
});

describe("V-081 reason on withdrawal approve, reject and paid", () => {
  it.each(["APPROVED", "REJECTED", "PAID"] as const)(
    "%s: requires a reason; a payout note does not stand in for it",
    async (status) => {
      const withdrawal = await seedWithdrawal();
      if (status === "PAID") {
        await prisma.affiliateWithdrawal.update({
          where: { id: withdrawal.id },
          data: { status: "APPROVED" },
        });
      }
      const update = () => admin.request("patch", `/admin/affiliates/withdrawals/${withdrawal.id}`);

      expectMissing(await update().send({ status, payoutNote: "Approved, paying Friday" }));
      expectBlank(
        await update().send({ status, payoutNote: "Approved, paying Friday", reason: "" }),
      );

      const row = await prisma.affiliateWithdrawal.findUniqueOrThrow({
        where: { id: withdrawal.id },
      });
      expect(row.status).toBe(status === "PAID" ? "APPROVED" : "REQUESTED");
      expect(row.payoutNote).toBeNull();
      expect(await auditFor("affiliate.withdrawal.update", withdrawal.id)).toHaveLength(0);
    },
  );

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
  it("requires a reason (a review note does not stand in) and refuses a too-short one", async () => {
    const application = await seedApplication();
    const review = () => admin.request("patch", `/admin/ambassadors/${application.id}`);

    expectMissing(await review().send({ action: "APPROVE" }));
    expectMissing(await review().send({ action: "REJECT", reviewNote: "Apply again next term" }));
    expectBlank(await review().send({ action: "APPROVE", reason: "  " }));
    expectTooShort(await review().send({ action: "APPROVE", reason: "ab" }));

    const row = await prisma.ambassadorApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(row.status).toBe("PENDING");
    expect(row.reviewNote).toBeNull();
    expect(await auditFor("ambassador.application.approve", application.id)).toHaveLength(0);
    expect(await auditFor("ambassador.application.reject", application.id)).toHaveLength(0);
  });

  it("records the reason apart from the review note, which the applicant sees", async () => {
    const rejected = await seedApplication();
    const approved = await seedApplication();

    const reject = await admin
      .request("patch", `/admin/ambassadors/${rejected.id}`)
      .send({ action: "REJECT", reviewNote: "Apply again next term", reason: REASON });
    expect(reject.status, JSON.stringify(reject.body)).toBe(200);
    expect((await auditFor("ambassador.application.reject", rejected.id))[0]?.reason).toBe(
      TRIMMED_REASON,
    );
    const row = await prisma.ambassadorApplication.findUniqueOrThrow({
      where: { id: rejected.id },
    });
    expect(row.reviewNote).toBe("Apply again next term");

    // The review note stays optional.
    const approve = await admin
      .request("patch", `/admin/ambassadors/${approved.id}`)
      .send({ action: "APPROVE", reason: REASON });
    expect(approve.status, JSON.stringify(approve.body)).toBe(200);
    expect((await auditFor("ambassador.application.approve", approved.id))[0]?.reason).toBe(
      TRIMMED_REASON,
    );
  });
});

describe("V-081 reason on roadmap writes", () => {
  it("create: requires a reason, records it, and refuses a too-short one", async () => {
    const create = () => admin.request("post", "/admin/roadmap");
    const body = { id: "rm-refused", title: "Refused", description: "Body" };

    expectMissing(await create().send(body));
    expectBlank(await create().send({ ...body, reason: "   " }));
    expectTooShort(await create().send({ ...body, reason: "ab" }));
    expect(await prisma.roadmapFeature.count({ where: { id: "rm-refused" } })).toBe(0);

    const withReason = await create().send({
      id: "rm-reason",
      title: "Reasoned",
      description: "Body",
      reason: REASON,
    });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(201);

    const entries = await auditFor("roadmap.feature.create");
    expect(entries.map((entry) => [entry.targetId, entry.reason])).toEqual([
      ["rm-reason", TRIMMED_REASON],
    ]);
  });

  it("update: requires a reason, records it (not as a field), and refuses a too-short one", async () => {
    const feature = await seedRoadmapFeature();
    const path = `/admin/roadmap/${feature.id}`;

    expectMissing(await admin.request("put", path).send({ title: "One" }));
    expectBlank(await admin.request("put", path).send({ title: "One", reason: " " }));
    expectTooShort(await admin.request("put", path).send({ title: "One", reason: "ab" }));
    const untouched = await prisma.roadmapFeature.findUniqueOrThrow({ where: { id: feature.id } });
    expect(untouched.title).toBe("Feature");

    expect((await admin.request("put", path).send({ title: "Two", reason: REASON })).status).toBe(
      200,
    );
    // A reason alone is not an edit.
    expect((await admin.request("put", path).send({ reason: REASON })).status).toBe(400);

    const row = await prisma.roadmapFeature.findUniqueOrThrow({ where: { id: feature.id } });
    expect(row.title).toBe("Two");

    const entries = await auditFor("roadmap.feature.update", feature.id);
    expect(entries.map((entry) => entry.reason)).toEqual([TRIMMED_REASON]);
    expect(entries[0]?.metadata).toEqual({ fields: ["title"] });
  });

  it("delete: requires a reason, takes it from the body or the query, and refuses a too-short one", async () => {
    const refused = await seedRoadmapFeature();
    const body = await seedRoadmapFeature();
    const query = await seedRoadmapFeature();
    const remove = (id: string) => admin.request("delete", `/admin/roadmap/${id}`);

    expectMissing(await remove(refused.id));
    expectBlank(await remove(refused.id).send({ reason: "  " }));
    expectTooShort(await remove(refused.id).send({ reason: "ab" }));
    expect(await prisma.roadmapFeature.count({ where: { id: refused.id } })).toBe(1);
    expect(await auditFor("roadmap.feature.delete", refused.id)).toHaveLength(0);

    expect((await remove(body.id).send({ reason: REASON })).status).toBe(200);
    expect((await remove(query.id).query({ reason: REASON })).status).toBe(200);

    expect((await auditFor("roadmap.feature.delete", body.id))[0]?.reason).toBe(TRIMMED_REASON);
    expect((await auditFor("roadmap.feature.delete", query.id))[0]?.reason).toBe(TRIMMED_REASON);
  });
});

describe("V-081 reason on changelog writes", () => {
  it("create: requires a reason, records it, and refuses a too-short one", async () => {
    const create = () => admin.request("post", "/admin/changelog");
    const body = { id: "cl-refused", version: "8.0.0", title: "Refused" };

    expectMissing(await create().send(body));
    expectBlank(await create().send({ ...body, reason: "" }));
    expectTooShort(await create().send({ ...body, reason: "ab" }));
    expect(await prisma.changelogEntry.count({ where: { id: "cl-refused" } })).toBe(0);

    const withReason = await create().send({
      id: "cl-reason",
      version: "8.0.1",
      title: "Reasoned",
      reason: REASON,
    });
    expect(withReason.status, JSON.stringify(withReason.body)).toBe(201);

    const entries = await auditFor("changelog.entry.create");
    expect(entries.map((entry) => [entry.targetId, entry.reason])).toEqual([
      ["cl-reason", TRIMMED_REASON],
    ]);
  });

  it("update: requires a reason, records it (not as a field), and refuses a too-short one", async () => {
    const entry = await seedChangelogEntry();
    const path = `/admin/changelog/${entry.id}`;

    expectMissing(await admin.request("put", path).send({ title: "One" }));
    expectBlank(await admin.request("put", path).send({ title: "One", reason: " " }));
    expectTooShort(await admin.request("put", path).send({ title: "One", reason: "ab" }));
    const untouched = await prisma.changelogEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(untouched.title).toBe("Release");

    expect((await admin.request("put", path).send({ title: "Two", reason: REASON })).status).toBe(
      200,
    );
    // A reason alone is not an edit.
    expect((await admin.request("put", path).send({ reason: REASON })).status).toBe(400);

    const row = await prisma.changelogEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(row.title).toBe("Two");

    const entries = await auditFor("changelog.entry.update", entry.id);
    expect(entries.map((item) => item.reason)).toEqual([TRIMMED_REASON]);
    expect(entries[0]?.metadata).toEqual({ fields: ["title"] });
  });

  it("delete: requires a reason, takes it from the body or the query, and refuses a too-short one", async () => {
    const refused = await seedChangelogEntry();
    const body = await seedChangelogEntry();
    const query = await seedChangelogEntry();
    const remove = (id: string) => admin.request("delete", `/admin/changelog/${id}`);

    expectMissing(await remove(refused.id));
    expectBlank(await remove(refused.id).query({ reason: " " }));
    expectTooShort(await remove(refused.id).send({ reason: "ab" }));
    expect(await prisma.changelogEntry.count({ where: { id: refused.id } })).toBe(1);
    expect(await auditFor("changelog.entry.delete", refused.id)).toHaveLength(0);

    expect((await remove(body.id).send({ reason: REASON })).status).toBe(200);
    expect((await remove(query.id).query({ reason: REASON })).status).toBe(200);

    expect((await auditFor("changelog.entry.delete", body.id))[0]?.reason).toBe(TRIMMED_REASON);
    expect((await auditFor("changelog.entry.delete", query.id))[0]?.reason).toBe(TRIMMED_REASON);
  });

  it("sync: requires a reason before starting, records it, and refuses a too-short one", async () => {
    const { startChangelogSync } = await import("#services/admin/adminSyncTrigger");
    const sync = () => admin.request("post", "/admin/changelog/sync");

    expectMissing(await sync());
    expectBlank(await sync().send({ reason: "  " }));
    expectTooShort(await sync().send({ reason: "ab" }));
    expect(startChangelogSync).not.toHaveBeenCalled();
    expect(await auditFor("changelog.sync")).toHaveLength(0);

    expect((await sync().send({ reason: REASON })).status).toBe(202);
    expect(startChangelogSync).toHaveBeenCalledTimes(1);

    const entries = await auditFor("changelog.sync");
    expect(entries.map((entry) => entry.reason)).toEqual([TRIMMED_REASON]);
  });
});

describe("V-082 typed confirmation on portfolio hard unpublish", () => {
  const unpublish = (id: string) => admin.request("delete", `/admin/portfolios/${id}`);

  async function expectStillLive(publication: { id: string; documentId: string }) {
    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("LIVE");
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: publication.documentId },
    });
    expect(document.visibility).toBe("PUBLIC");
    expect(document.moderatedPrivateAt).toBeNull();
    expect(await auditFor("portfolio.unpublish", publication.id)).toHaveLength(0);
  }

  it("a wrong confirm is CONFIRMATION_MISMATCH and the site stays live", async () => {
    const publication = await seedPublication();

    const response = await unpublish(publication.id).send({
      reason: "Phishing content",
      confirm: `${publication.subdomain}-x`,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");
    expect(response.body.message).toMatch(/subdomain/i);

    await expectStillLive(publication);
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

  it("no confirm, or a blank one, is CONFIRMATION_REQUIRED and the site stays live", async () => {
    const publication = await seedPublication();
    const reason = "Phishing content";

    expectConfirmationRequired(await unpublish(publication.id).send({ reason }));
    expectConfirmationRequired(await unpublish(publication.id).send({ reason, confirm: "   " }));
    expectConfirmationRequired(await unpublish(publication.id).query({ reason }));

    await expectStillLive(publication);
  });
});

describe("V-082 typed confirmation on share-link revoke", () => {
  const revoke = (id: string) => admin.request("delete", `/admin/share-links/${id}`);

  async function expectSurvives(shareId: string) {
    expect(await prisma.shareLink.count({ where: { id: shareId } })).toBe(1);
    expect(await auditFor("share_link.revoke", shareId)).toHaveLength(0);
  }

  it("the admin list shows the identifier as `slug`", async () => {
    const share = await seedShareLink();
    const list = await admin.request("get", "/admin/share-links");
    expect(list.status).toBe(200);
    expect(list.body.data.items.find((item: { id: string }) => item.id === share.id)?.slug).toBe(
      share.slug,
    );
  });

  it("a wrong confirm is CONFIRMATION_MISMATCH and the link survives", async () => {
    const share = await seedShareLink();

    const response = await revoke(share.id).send({
      reason: "Reported abuse",
      confirm: share.slug.toUpperCase(),
    });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");
    await expectSurvives(share.id);
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

  it("no confirm, or a blank one, is CONFIRMATION_REQUIRED and the link survives", async () => {
    const share = await seedShareLink();
    const reason = "Reported abuse";

    expectConfirmationRequired(await revoke(share.id).send({ reason }));
    expectConfirmationRequired(await revoke(share.id).send({ reason, confirm: "" }));
    expectConfirmationRequired(await revoke(share.id).query({ reason }));

    await expectSurvives(share.id);
  });
});

describe("V-082 typed confirmation on API-key revoke", () => {
  const revoke = (id: string) => admin.request("delete", `/admin/api-keys/${id}`);

  async function expectStillLive(key: { id: string; keyHash: string }) {
    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(row.revokedAt).toBeNull();
    expect(row.isActive).toBe(true);
    expect(await auditFor("api_key.revoke", key.id)).toHaveLength(0);
    // No revoked marker either: it would refuse the live key until it expired.
    expect(await getRedis().keys(`*apikey:revoked:${key.keyHash}*`)).toEqual([]);
  }

  it("a wrong confirm (the key's name) is CONFIRMATION_MISMATCH and the key stays live", async () => {
    const key = await seedApiKey();

    const response = await revoke(key.id).send({ reason: "Leaked in a repo", confirm: key.name });
    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body.details?.code).toBe("CONFIRMATION_MISMATCH");

    await expectStillLive(key);
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
    // The marker check above is not vacuous: a real revoke writes one.
    expect(await getRedis().keys(`*apikey:revoked:${key.keyHash}*`)).toHaveLength(1);
  });

  it("no confirm, or a blank one, is CONFIRMATION_REQUIRED and the key stays live", async () => {
    const key = await seedApiKey();
    const reason = "Leaked in a repo";

    expectConfirmationRequired(await revoke(key.id).send({ reason }));
    expectConfirmationRequired(await revoke(key.id).send({ reason, confirm: " " }));
    expectConfirmationRequired(await revoke(key.id).query({ reason }));

    await expectStillLive(key);
  });
});
