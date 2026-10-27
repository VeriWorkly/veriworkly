import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { applyRetention, readRetentionSettings, type RetentionSettings } from "#jobs/retentionJob";
import { prisma } from "#lib/prisma";
import { PortfolioService } from "#services/portfolioService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * Phase 11 group 2, admin findings (FINDINGS.md P2):
 * V-284 an admin delete of a portfolio document takes the site down in its own transaction, with
 * a takedown record.
 */

vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

const admin = adminClient();

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
  const subdomain = `site-${randomUUID().slice(0, 8)}`;
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

/** Makes every UPDATE of PortfolioPublication fail, as a pooler blip would, for one callback. */
async function withPublicationWritesFailing(run: () => Promise<void>) {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION test_fail_publication_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'publication write failed'; END $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER test_fail_publication_update BEFORE UPDATE ON "PortfolioPublication"
    FOR EACH ROW EXECUTE FUNCTION test_fail_publication_update()`);
  try {
    await run();
  } finally {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS test_fail_publication_update ON "PortfolioPublication"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS test_fail_publication_update()`);
  }
}

describe("V-284 admin delete of a portfolio document", () => {
  it("suspends the site in the delete's transaction and writes a takedown record", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    const response = await admin
      .request("delete", `/admin/documents/${document.id}`)
      .send({ reason: "Phishing content" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("SUSPENDED");
    expect(row.suspensionReason).toBe("moderation:document_deleted");

    const takedown = await prisma.adminAuditEntry.findMany({
      where: { action: "portfolio.status.change", targetId: publication.id },
    });
    expect(takedown).toHaveLength(1);
    expect(takedown[0]).toMatchObject({
      actorId: admin.id,
      targetType: "PortfolioPublication",
      reason: "Phishing content",
    });
    expect(takedown[0].metadata).toMatchObject({
      previousStatus: "LIVE",
      status: "SUSPENDED",
      suspensionReason: "moderation:document_deleted",
      subdomain: publication.subdomain,
      documentId: document.id,
      ownerId: owner.id,
    });
  });

  it("commits nothing when the takedown write fails, so the admin can retry", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);

    await withPublicationWritesFailing(async () => {
      const failed = await admin
        .request("delete", `/admin/documents/${document.id}`)
        .send({ reason: "Phishing content" });
      expect(failed.status).toBe(500);
    });

    // The delete rolled back with the takedown: the document is still live, and no entry claims
    // a delete that did not happen.
    const after = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(after.deletedAt).toBeNull();
    expect(
      await prisma.adminAuditEntry.count({
        where: { action: "document.delete", targetId: document.id },
      }),
    ).toBe(0);

    const retry = await admin
      .request("delete", `/admin/documents/${document.id}`)
      .send({ reason: "Phishing content" });
    expect(retry.status, JSON.stringify(retry.body)).toBe(200);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("SUSPENDED");
  });

  it("keeps an earlier moderation reason and writes no second takedown record", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "moderation:spam", suspendedAt: new Date() },
    });

    const response = await admin
      .request("delete", `/admin/documents/${document.id}`)
      .send({ reason: "Cleanup" });
    expect(response.status).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.suspensionReason).toBe("moderation:spam");
    expect(
      await prisma.adminAuditEntry.count({
        where: { action: "portfolio.status.change", targetId: publication.id },
      }),
    ).toBe(0);
  });
});

describe("V-284 the takedown reads the publication inside the delete's transaction", () => {
  /** Runs `between` just before the delete's transaction starts: a write landing mid-delete. */
  function beforeNextTransaction(between: () => Promise<unknown>) {
    const original = prisma.$transaction.bind(prisma) as (...args: unknown[]) => unknown;
    vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (...args: unknown[]) => {
      await between();
      return original(...args);
    }) as never);
  }

  it("leaves alone a site the owner republished from another document mid-delete", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    const other = await prisma.document.create({
      data: {
        userId: owner.id,
        type: "PORTFOLIO",
        title: "Second",
        slug: `second-${randomUUID().slice(0, 8)}`,
        content: portfolioContent(),
        visibility: "PUBLIC",
      },
    });

    beforeNextTransaction(() =>
      prisma.portfolioPublication.update({
        where: { id: publication.id },
        data: { documentId: other.id },
      }),
    );
    const response = await admin
      .request("delete", `/admin/documents/${document.id}`)
      .send({ reason: "Old draft" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }),
    ).toMatchObject({ status: "LIVE", documentId: other.id, suspensionReason: null });
  });

  it("takes down a first publish of the document that lands mid-delete", async () => {
    const owner = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: owner.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `first-${randomUUID().slice(0, 8)}`,
        content: portfolioContent(),
        visibility: "PUBLIC",
      },
    });

    beforeNextTransaction(() =>
      prisma.portfolioPublication.create({
        data: {
          userId: owner.id,
          documentId: document.id,
          subdomain: document.slug,
          templateId: "signal",
          snapshot: portfolioContent(),
        },
      }),
    );
    const response = await admin
      .request("delete", `/admin/documents/${document.id}`)
      .send({ reason: "Phishing content" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { documentId: document.id } }),
    ).toMatchObject({ status: "SUSPENDED", suspensionReason: "moderation:document_deleted" });
  });
});

describe("V-285 an admin LIVE or GRACE only lifts a moderation lock", () => {
  async function setStatus(publicationId: string, status: string) {
    return admin
      .request("patch", `/admin/portfolios/${publicationId}`)
      .send({ status, reason: "Reviewed by support" });
  }

  async function suspend(publicationId: string, suspensionReason: string) {
    await prisma.portfolioPublication.update({
      where: { id: publicationId },
      data: { status: "SUSPENDED", suspensionReason, suspendedAt: new Date() },
    });
  }

  it("refuses to put an owner-unpublished site back online", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "user_unpublished");

    const response = await setStatus(publication.id, "LIVE");
    expect(response.status).toBe(409);
    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row).toMatchObject({ status: "SUSPENDED", suspensionReason: "user_unpublished" });
    expect(await prisma.adminAuditEntry.count({ where: { targetId: publication.id } })).toBe(0);
  });

  it("refuses to lift a billing suspension", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "grace_expired");

    expect((await setStatus(publication.id, "LIVE")).status).toBe(409);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("SUSPENDED");
  });

  it("refuses to bring back a site whose document is in the trash", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "moderation:spam");
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });

    expect((await setStatus(publication.id, "LIVE")).status).toBe(409);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .suspensionReason,
    ).toBe("moderation:spam");
  });

  it("still lifts a moderator's own takedown", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "moderation:spam");

    const response = await setStatus(publication.id, "LIVE");
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }),
    ).toMatchObject({ status: "LIVE", suspensionReason: null });
  });

  // Review of group 2: a moderation lock put over an owner's or billing's suspension used to
  // replace that reason, so the next LIVE put the site back online against the owner's choice.
  // A lift now returns the row to the reason it had before the lock.
  async function row(publicationId: string) {
    return prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publicationId } });
  }

  it("owner unpublish, then admin SUSPENDED, then LIVE leaves the owner's unpublish", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "user_unpublished");

    expect((await setStatus(publication.id, "SUSPENDED")).status).toBe(200);
    expect((await row(publication.id)).suspensionReason).toBe("moderation:Reviewed by support");

    const lifted = await setStatus(publication.id, "LIVE");
    expect(lifted.status, JSON.stringify(lifted.body)).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
    expect(lifted.body.data.status).toBe("SUSPENDED");
  });

  it("owner unpublish, then admin delete and restore, then LIVE leaves the owner's unpublish", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "user_unpublished");

    expect(
      (await admin.request("delete", `/admin/documents/${document.id}`).send({ reason: "Spam" }))
        .status,
    ).toBe(200);
    expect(
      (
        await admin
          .request("post", `/admin/documents/${document.id}/restore`)
          .send({ reason: "Mistake" })
      ).status,
    ).toBe(200);

    expect((await setStatus(publication.id, "LIVE")).status).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
  });

  it("billing suspension, then a force-unpublish, then LIVE goes back to billing's suspension", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "grace_expired");

    const takenDown = await admin
      .request("delete", `/admin/portfolios/${publication.id}`)
      .send({ reason: "Phishing" });
    expect(takenDown.status, JSON.stringify(takenDown.body)).toBe(200);

    expect((await setStatus(publication.id, "LIVE")).status).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "grace_expired",
    });
  });

  it("billing suspension, then Make private, then Make unlisted goes back to billing's suspension", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await suspend(publication.id, "grace_expired");

    const hide = (visibility: string) =>
      admin
        .request("patch", `/admin/documents/${document.id}`)
        .send({ visibility, reason: "Reviewed" });
    expect((await hide("PRIVATE")).status).toBe(200);
    expect((await hide("UNLISTED")).status).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "grace_expired",
    });
  });

  // Final review: the owner's own unpublish or trash while a lock is on used to be dropped.
  function asOwner(cookie: string, req: request.Test) {
    return req.set("Origin", STUDIO_ORIGIN).set("Cookie", cookie);
  }

  it("an owner unpublish during the lock survives the lift", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    expect((await setStatus(publication.id, "SUSPENDED")).status).toBe(200);

    const unpublished = await asOwner(
      owner.cookie,
      request(app).post("/api/v1/portfolios/unpublish"),
    ).send({});
    expect(unpublished.status, JSON.stringify(unpublished.body)).toBe(200);
    expect((await row(publication.id)).suspensionReason).toBe("moderation:Reviewed by support");

    expect((await setStatus(publication.id, "LIVE")).status).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
  });

  it("an owner trash during the lock keeps the site offline after the lift", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    expect((await setStatus(publication.id, "SUSPENDED")).status).toBe(200);

    const trashed = await asOwner(
      owner.cookie,
      request(app).delete(`/api/v1/documents/${document.id}`),
    );
    expect(trashed.status, JSON.stringify(trashed.body)).toBe(200);

    const lifted = await setStatus(publication.id, "LIVE");
    expect(lifted.status, JSON.stringify(lifted.body)).toBe(200);
    expect(await row(publication.id)).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "user_unpublished",
    });
  });

  it("the migration backfills the reason a lock replaced, from takedown records that hold it", async () => {
    // One publication per user.
    const sites = [];
    for (let i = 0; i < 6; i += 1)
      sites.push((await seedLivePortfolio((await createUserWithSession()).id)).publication);
    const [owned, billed, relocked, online, unknown, known] = sites;
    const lock = (id: string, reason = "moderation:Phishing") =>
      prisma.portfolioPublication.update({
        where: { id },
        data: { status: "SUSPENDED", suspensionReason: reason, reasonBeforeModeration: null },
      });
    for (const site of [owned, billed, relocked, online, unknown]) await lock(site.id);
    await lock(known.id);
    await prisma.portfolioPublication.update({
      where: { id: known.id },
      data: { reasonBeforeModeration: "grace_expired" },
    });

    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);
    const entry = (targetId: string, action: string, metadata: object, minutesAgo: number) => ({
      actorId: admin.id,
      action,
      targetType: "PortfolioPublication",
      targetId,
      metadata,
      createdAt: at(minutesAgo),
    });
    await prisma.adminAuditEntry.createMany({
      data: [
        // Older force-unpublish of an owner-unpublished site, then the latest one: latest wins.
        entry(owned.id, "portfolio.unpublish", { previousStatus: "LIVE" }, 20),
        entry(
          owned.id,
          "portfolio.unpublish",
          { previousStatus: "SUSPENDED", previousSuspensionReason: "user_unpublished" },
          10,
        ),
        entry(
          billed.id,
          "portfolio.unpublish",
          { previousStatus: "SUSPENDED", previousSuspensionReason: "grace_expired" },
          10,
        ),
        // A second lock over a first: what the first replaced is not in this entry.
        entry(
          relocked.id,
          "portfolio.unpublish",
          { previousStatus: "SUSPENDED", previousSuspensionReason: "moderation:spam" },
          10,
        ),
        entry(
          online.id,
          "portfolio.status.change",
          { previousStatus: "LIVE", status: "SUSPENDED" },
          10,
        ),
        // Older status changes record no reason at all.
        entry(
          unknown.id,
          "portfolio.status.change",
          { previousStatus: "SUSPENDED", status: "SUSPENDED" },
          10,
        ),
        entry(
          known.id,
          "portfolio.unpublish",
          { previousStatus: "SUSPENDED", previousSuspensionReason: "user_unpublished" },
          10,
        ),
      ],
    });

    const migrations = path.resolve(__dirname, "..", "..", "prisma", "migrations");
    const folder = readdirSync(migrations).find((name) =>
      name.endsWith("_publication_reason_before_moderation"),
    );
    expect(folder).toBeDefined();
    const sql = readFileSync(path.join(migrations, folder!, "migration.sql"), "utf8");
    const backfill = sql.slice(sql.indexOf("-- Backfill"));
    expect(backfill.length).toBeGreaterThan(20);
    await prisma.$executeRawUnsafe(backfill);
    // Idempotent: a second run changes nothing.
    expect(await prisma.$executeRawUnsafe(backfill)).toBe(0);

    const before = async (id: string) => (await row(id)).reasonBeforeModeration;
    expect(await before(owned.id)).toBe("user_unpublished");
    expect(await before(billed.id)).toBe("grace_expired");
    expect(await before(relocked.id)).toBeNull();
    expect(await before(online.id)).toBeNull();
    expect(await before(unknown.id)).toBeNull();
    // A value already recorded is never overwritten.
    expect(await before(known.id)).toBe("grace_expired");
  });

  it("a billing suspension under a lock of more than 30 days still drops to the free tier on lift", async () => {
    const owner = await createUserWithSession();
    const { publication } = await seedLivePortfolio(owner.id);
    const nimbus = { ...portfolioContent(), templateId: "nimbus" };
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: {
        templateId: "nimbus",
        snapshot: nimbus,
        status: "SUSPENDED",
        suspensionReason: "grace_expired",
        suspendedAt: new Date(),
      },
    });
    expect((await setStatus(publication.id, "SUSPENDED")).status).toBe(200);
    // The lock lasted 31 days.
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { suspendedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    });

    expect((await setStatus(publication.id, "LIVE")).status).toBe(200);
    // What the hourly job does; the lift has already settled it, so this is a no-op then.
    await PortfolioService.settleLapsedPortfolios();

    const after = await row(publication.id);
    expect(after).toMatchObject({ status: "LIVE", suspensionReason: null });
    expect(after.templateId).not.toBe("nimbus");
  });
});

describe("V-286 an admin never moves an owner-private document away from PRIVATE", () => {
  async function seedResume(userId: string, visibility: "PRIVATE" | "PUBLIC" | "UNLISTED") {
    return prisma.document.create({
      data: {
        userId,
        type: "RESUME",
        title: "Resume",
        slug: `resume-${randomUUID().slice(0, 8)}`,
        content: {},
        visibility,
      },
    });
  }

  function setVisibility(documentId: string, visibility: string) {
    return admin
      .request("patch", `/admin/documents/${documentId}`)
      .send({ visibility, reason: "Reviewed" });
  }

  it("refuses UNLISTED on a document its owner made private", async () => {
    const owner = await createUserWithSession();
    const resume = await seedResume(owner.id, "PRIVATE");

    const response = await setVisibility(resume.id, "UNLISTED");
    expect(response.status).toBe(409);
    expect((await prisma.document.findUniqueOrThrow({ where: { id: resume.id } })).visibility).toBe(
      "PRIVATE",
    );
    expect(await prisma.adminAuditEntry.count({ where: { targetId: resume.id } })).toBe(0);
  });

  it("still lifts a moderator's Make private, and still pulls a public document to unlisted", async () => {
    const owner = await createUserWithSession();
    const moderated = await seedResume(owner.id, "PUBLIC");
    expect((await setVisibility(moderated.id, "PRIVATE")).status).toBe(200);
    const lifted = await setVisibility(moderated.id, "UNLISTED");
    expect(lifted.status, JSON.stringify(lifted.body)).toBe(200);
    expect(await prisma.document.findUniqueOrThrow({ where: { id: moderated.id } })).toMatchObject({
      visibility: "UNLISTED",
      moderatedPrivateAt: null,
    });

    const open = await seedResume(owner.id, "PUBLIC");
    expect((await setVisibility(open.id, "UNLISTED")).status).toBe(200);
  });

  it("lifting a portfolio's lock leaves a document its owner made private PRIVATE", async () => {
    const owner = await createUserWithSession();
    const { document, publication } = await seedLivePortfolio(owner.id);
    await prisma.document.update({ where: { id: document.id }, data: { visibility: "PRIVATE" } });
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "moderation:spam", suspendedAt: new Date() },
    });

    const response = await setVisibility(document.id, "UNLISTED");
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).visibility,
    ).toBe("PRIVATE");
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .suspensionReason,
    ).toBe("user_unpublished");
  });
});

describe("V-287 a forfeited affiliate balance is a money record", () => {
  it("is kept 7 years by retention, not 365 days", async () => {
    const now = new Date();
    const ago = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000 - 3600_000);
    await prisma.adminAuditEntry.deleteMany({});
    await prisma.adminAuditEntry.createMany({
      data: [
        {
          id: "forfeit-1y",
          action: "affiliate.balance.forfeit",
          targetType: "x",
          createdAt: ago(400),
        },
        {
          id: "forfeit-8y",
          action: "affiliate.balance.forfeit",
          targetType: "x",
          createdAt: ago(8 * 365),
        },
        { id: "general-1y", action: "user.update", targetType: "x", createdAt: ago(400) },
      ],
    });
    const settings = Object.fromEntries(
      Object.keys(readRetentionSettings({})).map((key) => [key, 0]),
    ) as RetentionSettings;

    await applyRetention({
      settings: { ...settings, adminAuditEntries: 365, adminMoneyAuditEntries: 7 * 365 },
      now,
    });

    const left = (await prisma.adminAuditEntry.findMany({ select: { id: true } })).map(
      (row) => row.id,
    );
    expect(left).toEqual(["forfeit-1y"]);
  });
});

describe("V-288 the publications chart and 30-day count follow a site's first publish", () => {
  /** Moves every timestamp on the publication `days` into the past: "it was published then". */
  async function ageEveryTimestamp(publicationId: string, days: number) {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'PortfolioPublication' AND data_type LIKE 'timestamp%'`;
    const sets = columns
      .map(({ column_name }) => `"${column_name}" = "${column_name}" - interval '${days} days'`)
      .join(", ");
    await prisma.$executeRawUnsafe(
      `UPDATE "PortfolioPublication" SET ${sets} WHERE "id" = $1`,
      publicationId,
    );
  }

  async function republish(userId: string, cookie: string, documentId: string, subdomain: string) {
    const { revision } = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const response = await request(app)
      .post("/api/v1/portfolios/publish")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", cookie)
      .send({ documentId, subdomain, revision });
    expect(response.status, `${userId} ${JSON.stringify(response.body)}`).toBe(201);
  }

  it("does not move a site to the day it was republished", async () => {
    await prisma.portfolioPublication.deleteMany({});
    const recent = await createUserWithSession();
    const old = await createUserWithSession();
    const recentSite = await seedLivePortfolio(recent.id);
    const oldSite = await seedLivePortfolio(old.id);
    await ageEveryTimestamp(recentSite.publication.id, 3);
    await ageEveryTimestamp(oldSite.publication.id, 40);

    await republish(
      recent.id,
      recent.cookie,
      recentSite.document.id,
      recentSite.publication.subdomain,
    );
    await republish(old.id, old.cookie, oldSite.document.id, oldSite.publication.subdomain);

    const series = await admin.request("get", "/admin/overview/series?days=7");
    expect(series.status).toBe(200);
    // Oldest first, ending today: the recent site stays on its day, nothing lands on today.
    expect(series.body.data.series.publications).toEqual([0, 0, 0, 1, 0, 0, 0]);

    const summary = await admin.request("get", "/admin/portfolios/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.data.publishedLast30Days).toBe(1);
  });
});
