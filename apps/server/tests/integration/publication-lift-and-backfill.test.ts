import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";
import { updatePublicationStatus } from "#services/admin/adminPortfolioService";

import { adminClient } from "./helpers/admin.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * Review nits on Phase 11 group 2 (#311): a lift that restores the reason under a lock takes the
 * Document row before the publication, as the owner's unpublish and delete do; a lift back to a
 * billing reason runs the billing reconcile, so a customer who paid during the lock is back
 * online; and the follow-up backfill takes each row's latest status record, not its latest
 * takedown.
 */

vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

const admin = adminClient();
const DAY_MS = 24 * 60 * 60 * 1000;

function content(templateId = "signal") {
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

/** A site under a moderator's lock that went on over `reasonBeforeModeration`. */
async function lockedOver(reasonBeforeModeration: string | null, templateId = "signal") {
  const owner = await createUserWithSession();
  const subdomain = `lift-${randomUUID().slice(0, 8)}`;
  const document = await prisma.document.create({
    data: {
      userId: owner.id,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: subdomain,
      templateId,
      content: content(templateId),
      visibility: "PRIVATE",
      moderatedPrivateAt: new Date(),
    },
  });
  const publication = await prisma.portfolioPublication.create({
    data: {
      userId: owner.id,
      documentId: document.id,
      subdomain,
      templateId,
      snapshot: content(templateId),
      status: "SUSPENDED",
      suspensionReason: "moderation:Phishing",
      suspendedAt: new Date(Date.now() - 40 * DAY_MS),
      reasonBeforeModeration,
    },
  });
  return { owner, document, publication };
}

function lift(publicationId: string) {
  return admin
    .request("patch", `/admin/portfolios/${publicationId}`)
    .send({ status: "LIVE", reason: "Reviewed, not phishing" });
}

async function waitForLockWaiter() {
  for (let i = 0; i < 100; i += 1) {
    const [{ waiting }] = await prisma.$queryRaw<Array<{ waiting: bigint }>>`
      SELECT count(*) AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'`;
    if (waiting > 0n) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The lift never waited on the held lock");
}

describe("a lift back to the reason under a lock", () => {
  it("takes the Document row before the publication, so it cannot deadlock an owner's delete", async () => {
    const { document, publication } = await lockedOver("user_unpublished");
    let liftDone: Promise<unknown> | null = null;

    // What the owner's delete does: the Document row first, then the publication.
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM "Document" WHERE "id" = ${document.id} FOR UPDATE`;

        liftDone = updatePublicationStatus(publication.id, "LIVE", "Reviewed");
        await waitForLockWaiter();

        // The lift is waiting on the Document row; the publication must still be free.
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '2s'`);
        await tx.$executeRaw`
          SELECT 1 FROM "PortfolioPublication" WHERE "id" = ${publication.id} FOR UPDATE`;
      },
      { timeout: 20_000 },
    );

    await liftDone;
    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }),
    ).toMatchObject({ status: "SUSPENDED", suspensionReason: "user_unpublished" });
  });

  it("back to a billing reason brings a customer who paid during the lock back online", async () => {
    const { owner, publication } = await lockedOver("PAST_DUE", "nimbus");
    // They paid again while the lock was on: billing's own sweep skipped the locked row.
    await prisma.entitlementGrant.create({
      data: {
        userId: owner.id,
        key: "portfolio_publish",
        source: "SUBSCRIPTION",
        sourceId: `sub_${randomUUID()}`,
        startsAt: new Date(Date.now() - DAY_MS),
        endsAt: new Date(Date.now() + 20 * DAY_MS),
      },
    });

    const response = await lift(publication.id);
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row).toMatchObject({ status: "LIVE", suspensionReason: null, templateId: "nimbus" });
    expect(response.body.data).toMatchObject({ status: "LIVE" });
  });

  it("back to a billing reason with no payment still drops the site to the free tier", async () => {
    const { publication } = await lockedOver("PAST_DUE", "nimbus");

    expect((await lift(publication.id)).status).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.status).toBe("LIVE");
    expect(row.templateId).not.toBe("nimbus");
  });

  it("through the document's Make unlisted, back to a billing reason, also reconciles", async () => {
    const { owner, document, publication } = await lockedOver("PAST_DUE", "nimbus");
    await prisma.entitlementGrant.create({
      data: {
        userId: owner.id,
        key: "portfolio_publish",
        source: "SUBSCRIPTION",
        sourceId: `sub_${randomUUID()}`,
        startsAt: new Date(Date.now() - DAY_MS),
        endsAt: new Date(Date.now() + 20 * DAY_MS),
      },
    });

    const response = await admin
      .request("patch", `/admin/documents/${document.id}`)
      .send({ visibility: "UNLISTED", reason: "Reviewed, not phishing" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }),
    ).toMatchObject({ status: "LIVE", suspensionReason: null, templateId: "nimbus" });
  });
});

describe("a lift through the document's Make unlisted", () => {
  it("waits for the owner's billing lock first, as the status lift does", async () => {
    const { owner, document, publication } = await lockedOver("user_unpublished");
    let liftDone: Promise<unknown> | null = null;

    // What billing (and the status lift) hold while they work on the account.
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner.id}))`;

        liftDone = admin
          .request("patch", `/admin/documents/${document.id}`)
          .send({ visibility: "UNLISTED", reason: "Reviewed, not phishing" })
          .then((response) => response);
        await waitForLockWaiter();

        // Still waiting: nothing about the lock has moved yet.
        expect(
          (await tx.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
            .suspensionReason,
        ).toBe("moderation:Phishing");
      },
      { timeout: 20_000 },
    );

    const response = (await liftDone) as unknown as { status: number };
    expect(response.status).toBe(200);
    expect(
      await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }),
    ).toMatchObject({ status: "SUSPENDED", suspensionReason: "user_unpublished" });
  });
});

describe("the follow-up backfill of reasonBeforeModeration (20261029200000)", () => {
  function migrationSql() {
    const folder = path.resolve(
      __dirname,
      "..",
      "..",
      "prisma",
      "migrations",
      "20261029200000_reason_before_moderation_backfill_latest_entry",
    );
    return readFileSync(path.join(folder, "migration.sql"), "utf8");
  }

  it("takes each row's latest status record, and leaves rows the app wrote alone", async () => {
    const sites: Awaited<ReturnType<typeof lockedOver>>[] = [];
    for (let i = 0; i < 7; i += 1) sites.push(await lockedOver(null));
    const [
      liftedOnline,
      documentLifted,
      documentTakedownOnly,
      liftedToReason,
      appWritten,
      lockOverLock,
      liftBeforeLockOverLock,
    ] = sites.map((site) => site!);

    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);
    const onPublication = (
      site: { publication: { id: string } },
      action: string,
      metadata: object,
      minutesAgo: number,
    ) => ({
      actorId: admin.id,
      action,
      targetType: "PortfolioPublication",
      targetId: site.publication.id,
      metadata,
      createdAt: at(minutesAgo),
    });
    const onDocument = (
      site: { document: { id: string } },
      visibility: string,
      minutesAgo: number,
    ) => ({
      actorId: admin.id,
      action: "document.visibility.change",
      targetType: "Document",
      targetId: site.document.id,
      metadata: { visibility },
      createdAt: at(minutesAgo),
    });
    // A force-unpublish over the owner's own unpublish: the takedown the first backfill read.
    const lockOverOwner = (site: { publication: { id: string } }, minutesAgo: number) =>
      onPublication(
        site,
        "portfolio.unpublish",
        { previousStatus: "SUSPENDED", previousSuspensionReason: "user_unpublished" },
        minutesAgo,
      );
    const liftOnline = (site: { publication: { id: string } }, minutesAgo: number) =>
      onPublication(
        site,
        "portfolio.status.change",
        { previousStatus: "SUSPENDED", status: "LIVE", suspensionReason: null },
        minutesAgo,
      );

    await prisma.adminAuditEntry.createMany({
      data: [
        // Lifted online since, and locked again through the document: nothing was under it.
        lockOverOwner(liftedOnline, 30),
        liftOnline(liftedOnline, 20),
        onDocument(liftedOnline, "PRIVATE", 10),
        // Lifted through the document since, then locked again through it.
        lockOverOwner(documentLifted, 30),
        onDocument(documentLifted, "UNLISTED", 20),
        onDocument(documentLifted, "PRIVATE", 10),
        // A document takedown over the standing lock changes nothing: the reason stays.
        lockOverOwner(documentTakedownOnly, 30),
        onDocument(documentTakedownOnly, "PRIVATE", 10),
        // Lifted back to the owner's reason, then locked again through the document.
        lockOverOwner(liftedToReason, 30),
        onPublication(
          liftedToReason,
          "portfolio.status.change",
          {
            previousStatus: "SUSPENDED",
            status: "SUSPENDED",
            previousSuspensionReason: "moderation:Phishing",
            suspensionReason: "user_unpublished",
          },
          20,
        ),
        onDocument(liftedToReason, "PRIVATE", 10),
        // The same history as liftedOnline, but the application wrote the row since.
        lockOverOwner(appWritten, 30),
        liftOnline(appWritten, 20),
        // A second suspension over the lock records the lock as its previous reason: walked past,
        // to the owner's reason under both.
        lockOverOwner(lockOverLock, 30),
        onPublication(
          lockOverLock,
          "portfolio.status.change",
          {
            previousStatus: "SUSPENDED",
            status: "SUSPENDED",
            previousSuspensionReason: "moderation:Phishing",
            suspensionReason: "moderation:Second report",
          },
          20,
        ),
        // A lock over a lock that went on after a lift online: never walked past the lift.
        lockOverOwner(liftBeforeLockOverLock, 40),
        liftOnline(liftBeforeLockOverLock, 30),
        onPublication(
          liftBeforeLockOverLock,
          "portfolio.status.change",
          { previousStatus: "LIVE", status: "SUSPENDED", previousSuspensionReason: null },
          20,
        ),
        onPublication(
          liftBeforeLockOverLock,
          "portfolio.unpublish",
          { previousStatus: "SUSPENDED", previousSuspensionReason: "moderation:Spam" },
          10,
        ),
      ],
    });

    // What the first backfill left: the owner's reason from the older takedown.
    await prisma.portfolioPublication.updateMany({
      where: {
        id: {
          in: [liftedOnline, documentLifted, documentTakedownOnly, appWritten].map(
            (site) => site.publication.id,
          ),
        },
      },
      data: { reasonBeforeModeration: "user_unpublished" },
    });
    // Untouched by the application since the first backfill ran, except appWritten.
    for (const site of [
      liftedOnline,
      documentLifted,
      documentTakedownOnly,
      liftedToReason,
      lockOverLock,
      liftBeforeLockOverLock,
    ])
      await prisma.$executeRaw`
        UPDATE "PortfolioPublication" SET "updatedAt" = '2000-01-01' WHERE "id" = ${site.publication.id}`;

    const sql = migrationSql();
    const snapshot = async () =>
      prisma.portfolioPublication.findMany({
        where: { id: { in: sites.map((site) => site.publication.id) } },
        select: { id: true, reasonBeforeModeration: true },
        orderBy: { id: "asc" },
      });
    await prisma.$executeRawUnsafe(sql);
    const afterFirst = await snapshot();
    // Idempotent: a second run leaves every row as the first left it.
    await prisma.$executeRawUnsafe(sql);
    expect(await snapshot()).toEqual(afterFirst);

    const reason = async (site: { publication: { id: string } }) =>
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: site.publication.id } }))
        .reasonBeforeModeration;
    expect(await reason(liftedOnline)).toBeNull();
    expect(await reason(documentLifted)).toBeNull();
    expect(await reason(documentTakedownOnly)).toBe("user_unpublished");
    expect(await reason(liftedToReason)).toBe("user_unpublished");
    expect(await reason(appWritten)).toBe("user_unpublished");
    expect(await reason(lockOverLock)).toBe("user_unpublished");
    expect(await reason(liftBeforeLockOverLock)).toBeNull();
  });
});
