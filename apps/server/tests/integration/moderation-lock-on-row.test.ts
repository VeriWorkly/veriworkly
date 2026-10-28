import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { applyRetention, readRetentionSettings, type RetentionSettings } from "#jobs/retentionJob";
import { prisma } from "#lib/prisma";
import { softDeleteDocument as adminSoftDeleteDocument } from "#services/admin/adminDocumentService";
import { updatePublicationStatus } from "#services/admin/adminPortfolioService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-207 / owner decision 11: a moderator's "Make private" (or a force-unpublish) is stored on the
 * document row, so pruning the admin audit log cannot lift it, and retention keeps general admin
 * entries 365 days, money actions 7 years and takedown records forever.
 * V-208: an admin setting a "Make private" portfolio back to LIVE lifts the document too.
 * V-226: publish, unpublish, owner delete and the admin takedown never overwrite a takedown that
 * commits after they read the row.
 */

vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

let adminPromise: Promise<TestUser> | null = null;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

function portfolioContent() {
  return {
    schemaVersion: 1,
    templateId: "signal",
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

async function seedLivePortfolio(userId: string) {
  const subdomain = `mod-${randomUUID().slice(0, 8)}`;
  const document = await prisma.document.create({
    data: {
      userId,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: subdomain,
      templateId: "signal",
      content: portfolioContent(),
      visibility: "PUBLIC",
    },
  });
  const publication = await prisma.portfolioPublication.create({
    data: {
      userId,
      documentId: document.id,
      subdomain,
      templateId: "signal",
      snapshot: portfolioContent(),
    },
  });
  return { document, publication };
}

async function makePrivate(documentId: string) {
  const response = await as(
    await admin(),
    request(app).patch(`/api/v1/admin/documents/${documentId}`),
  ).send({ visibility: "PRIVATE", reason: "Reported as impersonation" });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
}

function publish(user: TestUser, document: { id: string; revision: number }, subdomain: string) {
  return as(user, request(app).post("/api/v1/portfolios/publish")).send({
    documentId: document.id,
    subdomain,
    revision: document.revision,
  });
}

const ADMIN_SUSPENSION = { actorId: "", action: "portfolio.status.change" } as const;

async function adminSuspendDirect(publicationId: string, reason: string) {
  const moderator = await admin();
  await updatePublicationStatus(publicationId, "SUSPENDED", reason, {
    ...ADMIN_SUSPENSION,
    actorId: moderator.id,
    targetType: "PortfolioPublication",
    targetId: publicationId,
    reason,
  });
}

describe("V-207 the takedown lock lives on the document row", () => {
  it("survives the admin audit log being pruned", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    await makePrivate(document.id);
    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.moderatedPrivateAt).toBeInstanceOf(Date);

    // Everything the log held is gone (a year later, or any retention setting).
    await prisma.adminAuditEntry.deleteMany({});

    expect((await publish(owner, document, publication.subdomain)).status).toBe(403);
    const reshare = await as(owner, request(app).patch(`/api/v1/documents/${document.id}`)).send({
      revision: document.revision,
      visibility: "UNLISTED",
    });
    expect(reshare.status).toBe(403);
    const detail = await as(
      await admin(),
      request(app).get(`/api/v1/admin/documents/${document.id}`),
    );
    expect(detail.body.data.document.moderatorPrivate).toBe(true);
  });

  it("a force-unpublish sets the lock, and Make unlisted clears it", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    const takedown = await as(
      await admin(),
      request(app).delete(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ reason: "Phishing page" });
    expect(takedown.status).toBe(200);
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).moderatedPrivateAt,
    ).toBeInstanceOf(Date);

    const unlist = await as(
      await admin(),
      request(app).patch(`/api/v1/admin/documents/${document.id}`),
    ).send({ visibility: "UNLISTED", reason: "Counter-notice accepted" });
    expect(unlist.status).toBe(200);
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).moderatedPrivateAt,
    ).toBeNull();
    expect((await publish(owner, document, publication.subdomain)).status).toBe(201);
  });

  it("the migration backfills the lock from the audit entries that exist", async () => {
    const owner = await createUserWithSession();
    const moderator = await admin();
    const doc = (title: string) =>
      prisma.document.create({
        data: {
          userId: owner.id,
          title,
          slug: `${title}-${randomUUID().slice(0, 6)}`,
          content: {},
        },
      });
    const hidden = await doc("hidden");
    const lifted = await doc("lifted");
    const takenDown = await doc("taken-down");
    const untouched = await doc("untouched");
    // Made private by a moderator before the owner check existed, then made public by its owner:
    // the backfill does not lock a document that is no longer private.
    const reopened = await doc("reopened");
    await prisma.document.update({ where: { id: reopened.id }, data: { visibility: "UNLISTED" } });
    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);
    const visibilityEntry = (targetId: string, visibility: string, createdAt: Date) => ({
      actorId: moderator.id,
      action: "document.visibility.change",
      targetType: "Document",
      targetId,
      metadata: { visibility },
      createdAt,
    });
    await prisma.adminAuditEntry.createMany({
      data: [
        visibilityEntry(hidden.id, "PRIVATE", at(10)),
        visibilityEntry(reopened.id, "PRIVATE", at(10)),
        {
          id: "old-share-revoke",
          actorId: moderator.id,
          action: "share_link.revoke",
          targetType: "ShareLink",
          targetId: "gone",
          metadata: { slug: "ada-lovelace-cv" },
          createdAt: at(20),
        },
        visibilityEntry(lifted.id, "PRIVATE", at(10)),
        visibilityEntry(lifted.id, "UNLISTED", at(5)),
        {
          actorId: moderator.id,
          action: "portfolio.unpublish",
          targetType: "PortfolioPublication",
          targetId: "gone",
          metadata: { documentId: takenDown.id, subdomain: "x" },
          createdAt: at(3),
        },
      ],
    });

    const migrations = path.resolve(__dirname, "..", "..", "prisma", "migrations");
    const folder = readdirSync(migrations).find((name) =>
      name.endsWith("_document_moderation_lock"),
    );
    expect(folder).toBeDefined();
    const sql = readFileSync(path.join(migrations, folder!, "migration.sql"), "utf8");
    const backfill = sql.slice(sql.indexOf("-- Backfill"));
    await prisma.$executeRawUnsafe(backfill);

    const lock = async (id: string) =>
      (await prisma.document.findUniqueOrThrow({ where: { id } })).moderatedPrivateAt;
    expect(await lock(hidden.id)).toBeInstanceOf(Date);
    expect(await lock(lifted.id)).toBeNull();
    expect(await lock(takenDown.id)).toBeInstanceOf(Date);
    expect(await lock(untouched.id)).toBeNull();
    expect(await lock(reopened.id)).toBeNull();
    // Older share revokes named the slug (made from the title) and cannot be tied to a document.
    expect(
      (await prisma.adminAuditEntry.findUniqueOrThrow({ where: { id: "old-share-revoke" } }))
        .metadata,
    ).toEqual({});
  });
});

describe("V-207 / decision 11 admin audit retention", () => {
  it("keeps general entries 365 days, money actions 7 years and only takedown records forever", async () => {
    const now = new Date();
    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS - 60 * 60 * 1000);
    const entry = (id: string, action: string, days: number, metadata?: object) => ({
      id,
      action,
      targetType: "x",
      metadata,
      createdAt: ago(days),
    });
    await prisma.adminAuditEntry.deleteMany({});
    await prisma.adminAuditEntry.createMany({
      data: [
        entry("general-old", "user.update", 365),
        entry("general-fresh", "user.update", 300),
        entry("money-1y", "billing.credit.adjust", 400),
        entry("money-old", "billing.credit.adjust", 7 * 365),
        entry("commission-1y", "affiliate.commission.update", 400),
        entry("withdrawal-1y", "affiliate.withdrawal.update", 400),
        entry("replay-1y", "billing.webhook.replay", 400),
        entry("visibility-10y", "document.visibility.change", 3650),
        entry("unpublish-10y", "portfolio.unpublish", 3650),
        entry("takedown-10y", "portfolio.status.change", 3650, { status: "SUSPENDED" }),
        entry("lift-10y", "portfolio.status.change", 3650, { previousStatus: "SUSPENDED" }),
        // Moderation, but neither sets nor lifts a takedown: the general year.
        entry("grace-2y", "portfolio.status.change", 730, {
          previousStatus: "LIVE",
          status: "GRACE",
        }),
        entry("status-no-metadata-2y", "portfolio.status.change", 730),
        entry("doc-delete-2y", "document.delete", 730, { ownerId: "u" }),
        entry("doc-restore-2y", "document.restore", 730),
        entry("share-revoke-2y", "share_link.revoke", 730),
      ],
    });
    const defaults = readRetentionSettings({});
    expect(defaults.adminAuditEntries).toBe(365);
    expect(defaults.adminMoneyAuditEntries).toBe(7 * 365);
    const settings = Object.fromEntries(
      Object.keys(defaults).map((key) => [key, 0]),
    ) as RetentionSettings;

    await applyRetention({
      settings: { ...settings, adminAuditEntries: 365, adminMoneyAuditEntries: 7 * 365 },
      now,
    });

    const left = (await prisma.adminAuditEntry.findMany({ select: { id: true } }))
      .map((row) => row.id)
      .sort();
    expect(left).toEqual(
      [
        "general-fresh",
        "money-1y",
        "commission-1y",
        "withdrawal-1y",
        "replay-1y",
        "visibility-10y",
        "unpublish-10y",
        "takedown-10y",
        "lift-10y",
      ].sort(),
    );
  });
});

describe("V-208 an admin LIVE lift also lifts a Make private", () => {
  it("brings the document back to PUBLIC with its own audit entry, and the owner can republish", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await makePrivate(document.id);

    const lift = await as(
      await admin(),
      request(app).patch(`/api/v1/admin/portfolios/${publication.id}`),
    ).send({ status: "LIVE", reason: "Counter-notice accepted" });
    expect(lift.status, JSON.stringify(lift.body)).toBe(200);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("PUBLIC");
    expect(row.moderatedPrivateAt).toBeNull();
    const liftEntry = await prisma.adminAuditEntry.findFirst({
      where: { action: "document.visibility.change", targetId: document.id },
      orderBy: { createdAt: "desc" },
    });
    expect(liftEntry?.metadata).toMatchObject({
      previousVisibility: "PRIVATE",
      visibility: "PUBLIC",
    });

    // The owner is not locked out: unpublish, then publish again.
    expect((await as(owner, request(app).post("/api/v1/portfolios/unpublish"))).status).toBe(200);
    expect((await publish(owner, document, publication.subdomain)).status).toBe(201);
  });
});

describe("V-226 a takedown that commits after the read is never overwritten", () => {
  /**
   * Runs `between` right after the first `findUnique`/`findFirst` the code under test makes.
   * The returned check says it ran: a request that failed or answered before that read did not
   * test the race at all (V-414).
   */
  function interleave<T extends object>(
    delegate: T,
    method: keyof T & string,
    between: () => Promise<unknown>,
  ) {
    let fired = false;
    const original = (delegate[method] as (...args: unknown[]) => Promise<unknown>).bind(delegate);
    vi.spyOn(delegate, method as never).mockImplementationOnce((async (...args: unknown[]) => {
      const read = await original(...args);
      await between();
      fired = true;
      return read;
    }) as never);
    return {
      assertFired: () =>
        expect(fired, "the takedown ran between the read and the write").toBe(true),
    };
  }

  it("publish", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "user_unpublished", suspendedAt: new Date() },
    });

    const race = interleave(prisma.portfolioPublication, "findUnique", () =>
      adminSuspendDirect(publication.id, "Phishing"),
    );
    const response = await publish(owner, document, publication.subdomain);

    race.assertFired();
    // The publish write is conditional on the row it read, and the lock now on it is the answer.
    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(response.body.message).toMatch(/taken down by a moderator/);
    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("moderation:Phishing");
  });

  it("publish after a Make private committed in between", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    interleave(prisma.document, "findFirst", () => makePrivate(document.id));
    const response = await publish(owner, document, publication.subdomain);

    expect(response.status).toBe(403);
    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("PRIVATE");
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("SUSPENDED");
  });

  it("unpublish", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);

    const race = interleave(prisma.portfolioPublication, "findUnique", () =>
      adminSuspendDirect(publication.id, "Phishing"),
    );
    const response = await as(owner, request(app).post("/api/v1/portfolios/unpublish"));

    race.assertFired();
    // The owner's unpublish still succeeds, and is recorded under the lock (V-285) instead of
    // replacing it.
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("moderation:Phishing");
    expect(row.reasonBeforeModeration).toBe("user_unpublished");
  });

  it("owner delete", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    interleave(prisma.document, "findFirst", () => adminSuspendDirect(publication.id, "Phishing"));
    const response = await as(owner, request(app).delete(`/api/v1/documents/${document.id}`));
    expect(response.status).toBeLessThan(300);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.suspensionReason).toBe("moderation:Phishing");
  });

  async function privateResume(ownerId: string) {
    return prisma.document.create({
      data: {
        userId: ownerId,
        title: "Resume",
        slug: `resume-${randomUUID().slice(0, 8)}`,
        content: { basics: { name: "Owner" } },
        visibility: "PRIVATE",
      },
    });
  }

  /** Commits a "Make private" right after the moderation check read the row. */
  function makePrivateAfterRead(documentId: string) {
    const original = prisma.document.findFirst.bind(prisma.document);
    vi.spyOn(prisma.document, "findFirst").mockImplementation((async (args: never) => {
      const read = await original(args);
      const { where } = args as { where?: { id?: string } };
      if (where?.id === documentId && read) {
        vi.mocked(prisma.document.findFirst).mockRestore();
        await makePrivate(documentId);
      }
      return read;
    }) as never);
  }

  it("owner unlisting through the document PATCH", async () => {
    const owner = await createUserWithSession();
    const resume = await privateResume(owner.id);

    makePrivateAfterRead(resume.id);
    const response = await as(owner, request(app).patch(`/api/v1/documents/${resume.id}`)).send({
      visibility: "UNLISTED",
      revision: resume.revision,
    });

    expect(response.status).toBe(403);
    const row = await prisma.document.findUniqueOrThrow({ where: { id: resume.id } });
    expect(row.visibility).toBe("PRIVATE");
    expect(row.moderatedPrivateAt).toBeInstanceOf(Date);
  });

  it("owner sharing (which unlists) a private document", async () => {
    const owner = await createUserWithSession();
    const resume = await privateResume(owner.id);

    makePrivateAfterRead(resume.id);
    const response = await as(owner, request(app).post("/api/v1/shares")).send({
      documentId: resume.id,
      snapshot: { basics: { name: "Owner" } },
      noExpiry: true,
    });

    expect(response.status).toBe(403);
    const row = await prisma.document.findUniqueOrThrow({ where: { id: resume.id } });
    expect(row.visibility).toBe("PRIVATE");
    expect(await prisma.shareLink.count({ where: { documentId: resume.id } })).toBe(0);
  });

  it("admin delete keeps the earlier takedown's reason", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    // The delete reads the publication inside its transaction (review of group 2), so the
    // takedown lands after the delete has read the document and before it reads the site.
    interleave(prisma.document, "findUnique", () => adminSuspendDirect(publication.id, "Phishing"));
    await adminSoftDeleteDocument(document.id);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.suspensionReason).toBe("moderation:Phishing");
  });
});
