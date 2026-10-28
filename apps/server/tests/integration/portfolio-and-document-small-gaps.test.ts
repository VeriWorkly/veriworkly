import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { userProfileCacheKey } from "#lib/cacheKeys";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";
import { DocumentService } from "#services/documentService";
import { ProfileImportQuotaService } from "#services/profileImportQuotaService";
import { ProfileImportService } from "#services/profileImportService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Phase 11 documents and portfolios (P3): a draft save conditional on its revision (V-304, held
 * back, see below), a
 * free user's import quota race never calls GitHub inside the transaction (V-305), share counts
 * leave out deleted documents (V-306), the import drops the account read after it commits
 * (V-311), and a portfolio preview is the owner's alone (V-419).
 */

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

function draftContent(name = "Test Person") {
  return {
    schemaVersion: 1,
    templateId: "signal",
    identity: {
      name,
      headline: "Builds things",
      bio: "A bio long enough to publish.",
      location: "Somewhere",
      email: "person@example.test",
      availability: "Open",
      avatar: null,
    },
    seo: { title: "", description: "", socialImage: null },
    socialLinks: [],
    sections: [{ id: "projects", type: "projects", title: "Work", visible: true, items: [] }],
  };
}

function saveDraft(user: TestUser, body: Record<string, unknown>) {
  return as(user, request(app).put("/api/v1/portfolios/draft")).send(body);
}

describe("V-304 two saves of one draft revision", () => {
  // Waits on the portfolio editor saving one draft at a time: its 12 s autosave can overlap a
  // manual Save or Publish on the same revision, which this rule would answer with a false 409.
  // The server check is held back until the editor queues its saves (V-304 stays open).
  it.skip("one wins and the other gets 409, so no edit is silently overwritten", async () => {
    const owner = await createUserWithSession();
    const subdomain = `draft-${randomUUID().slice(0, 8)}`;
    const first = await saveDraft(owner, { subdomain, snapshot: draftContent() });
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    const documentId = first.body.data.id;
    const revision = first.body.data.revision as number;

    // Both saves read the draft before either writes: each waits after its read for the other's.
    const names = ["Tab A", "Tab B"];
    const findFirst = prisma.document.findFirst.bind(prisma.document);
    let arrived = 0;
    let bothRead!: () => void;
    const gate = new Promise<void>((resolve) => (bothRead = resolve));
    vi.spyOn(prisma.document, "findFirst").mockImplementation((async (args: never) => {
      const row = await findFirst(args);
      const where = (args as { where?: { id?: string; type?: string } }).where;
      if (where?.id === documentId && where?.type === "PORTFOLIO") {
        if (++arrived === names.length) bothRead();
        await gate;
      }
      return row;
    }) as unknown as typeof prisma.document.findFirst);

    const saves = await Promise.all(
      names.map((name) =>
        saveDraft(owner, { documentId, subdomain, revision, snapshot: draftContent(name) }),
      ),
    );
    expect(arrived).toBe(names.length);
    const statuses = saves.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 409]);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    expect(row.revision).toBe(revision + 1);
    // The stored draft is the winner's edit.
    const winner = names[saves.findIndex((response) => response.status === 200)];
    expect((row.content as { identity: { name: string } }).identity.name).toBe(winner);
  });
});

describe("V-305 a free user's GitHub quota race", () => {
  it("answers 429 with the reset time from the row, without calling GitHub", async () => {
    const user = await createUserWithSession();
    await prisma.account.create({
      data: {
        id: `acc-${randomUUID()}`,
        userId: user.id,
        providerId: "github",
        accountId: `gh-${randomUUID()}`,
        accessToken: "gho_linked",
      },
    });
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { lastGithubImportAt: anHourAgo } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const refused = await prisma
      .$transaction((tx) => ProfileImportQuotaService.consumeFreeQuota(user.id, "github", tx))
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(refused).toMatchObject({ statusCode: 429 });
    const resetsInSeconds = (refused as { details?: { resetsInSeconds?: number } }).details
      ?.resetsInSeconds;
    expect(resetsInSeconds).toBeGreaterThan(22 * 60 * 60);
    expect(resetsInSeconds).toBeLessThanOrEqual(23 * 60 * 60);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("V-306 share counts leave out deleted documents", () => {
  it("the master profile and the account page stop counting a deleted document's link at once", async () => {
    const suffix = randomUUID().slice(0, 8).replace(/[0-9]/g, "x");
    const owner = await createUserWithSession({ username: `counts${suffix}` });
    await prisma.masterProfile.create({ data: { userId: owner.id, content: {} } });
    const document = await prisma.document.create({
      data: { userId: owner.id, title: "Resume", slug: `cv-${suffix}`, content: {} },
    });
    const shared = await as(owner, request(app).post("/api/v1/shares")).send({
      documentId: document.id,
      snapshot: {},
    });
    expect(shared.status, JSON.stringify(shared.body)).toBe(201);

    const master = () => as(owner, request(app).get("/api/v1/profiles/master"));
    const account = () => as(owner, request(app).get("/api/v1/users/me"));

    // Warm both reads.
    expect((await master()).body.data.summary.shareResumeCount).toBe(1);
    expect((await account()).body.data._count.shareLinks).toBe(1);

    const deleted = await as(owner, request(app).delete(`/api/v1/documents/${document.id}`));
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);

    expect((await master()).body.data.summary.shareResumeCount).toBe(0);
    expect((await account()).body.data._count.shareLinks).toBe(0);
  });
});

describe("V-311 an import drops the account read after it commits", () => {
  it("a stale account read cached during the import's transaction is dropped", async () => {
    const owner = await createUserWithSession();
    const key = userProfileCacheKey(owner.id);
    const createDocument = DocumentService.createDocument.bind(DocumentService);
    // A reader between createDocument's own drop and the commit re-caches the old account read.
    vi.spyOn(DocumentService, "createDocument").mockImplementation(async (...args) => {
      const created = await createDocument(...args);
      await cacheSet(key, { stale: true }, 1800);
      return created;
    });

    const commitImport = (
      ProfileImportService as unknown as {
        commitImport: (userId: string, input: Record<string, unknown>) => Promise<unknown>;
      }
    ).commitImport.bind(ProfileImportService);
    await commitImport(owner.id, {
      isPaid: true,
      provider: "linkedin",
      title: "LinkedIn Import",
      content: { basics: { name: "Owner" } },
      replaceMaster: false,
    });

    expect(await cacheGet(key)).toBeNull();
  });
});

describe("V-419 portfolio preview ownership", () => {
  it("serves the owner's draft and answers 404 to anyone else", async () => {
    const owner = await createUserWithSession();
    const stranger = await createUserWithSession();
    const saved = await saveDraft(owner, {
      subdomain: `prev-${randomUUID().slice(0, 8)}`,
      snapshot: draftContent(),
    });
    expect(saved.status).toBe(200);
    const documentId = saved.body.data.id;

    expect(
      (await as(owner, request(app).get(`/api/v1/portfolios/preview/${documentId}`))).status,
    ).toBe(200);
    const foreign = await as(
      stranger,
      request(app).get(`/api/v1/portfolios/preview/${documentId}`),
    );
    expect(foreign.status).toBe(404);
    expect(JSON.stringify(foreign.body)).not.toContain("Test Person");
  });
});

describe("V-310 the public portfolio list pages past 5,000", () => {
  it("accepts an offset up to the sitemap's 50,000 URLs and refuses one past it", async () => {
    const list = (offset: number) =>
      request(app).get(`/api/v1/portfolios/public?offset=${offset}`).set("Origin", STUDIO_ORIGIN);

    expect((await list(6_000)).status).toBe(200);
    expect((await list(49_000)).status).toBe(200);
    expect((await list(50_000)).status).toBe(400);
  });
});

describe("V-310 the sitemap pages on an order that does not move", () => {
  it("order=stable lists by id, so a site edited between pages is neither skipped nor repeated", async () => {
    await prisma.portfolioPublication.deleteMany();
    const subdomains: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const owner = await createUserWithSession();
      const subdomain = `stable${i}${randomUUID().slice(0, 6)}`;
      const document = await prisma.document.create({
        data: { userId: owner.id, type: "PORTFOLIO", title: "P", slug: subdomain, content: {} },
      });
      await prisma.portfolioPublication.create({
        data: {
          userId: owner.id,
          documentId: document.id,
          subdomain,
          templateId: "signal",
          snapshot: {},
        },
      });
      subdomains.push(subdomain);
    }
    const byId = (
      await prisma.portfolioPublication.findMany({
        orderBy: { id: "asc" },
        select: { subdomain: true },
      })
    ).map((row) => row.subdomain);

    const page = async (offset: number) => {
      const response = await request(app)
        .get(`/api/v1/portfolios/public?order=stable&limit=1&offset=${offset}`)
        .set("Origin", STUDIO_ORIGIN);
      expect(response.status).toBe(200);
      return (response.body.data as Array<{ subdomain: string }>).map((row) => row.subdomain);
    };

    const first = await page(0);
    // A billing reconcile or a republish moves updatedAt between two page reads.
    await prisma.portfolioPublication.update({
      where: { subdomain: byId[0]! },
      data: { publishedRevision: { increment: 1 } },
    });
    const rest = [...(await page(1)), ...(await page(2))];
    expect([...first, ...rest]).toEqual(byId);

    // The public list keeps its own order: most recently updated first.
    const recent = await request(app).get("/api/v1/portfolios/public").set("Origin", STUDIO_ORIGIN);
    expect(recent.body.data[0].subdomain).toBe(byId[0]);
    const unknown = await request(app)
      .get("/api/v1/portfolios/public?order=random")
      .set("Origin", STUDIO_ORIGIN);
    expect(unknown.status).toBe(400);
  });
});
