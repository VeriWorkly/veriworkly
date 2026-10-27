import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

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
