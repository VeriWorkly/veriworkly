import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { PURGED_DOCUMENT_CONTENT } from "#jobs/retentionJob";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * Phase 11 group 2, documents findings (FINDINGS.md P3):
 * V-302 a moderator's "Make private" holds every new share link on the account, so the content
 * cannot be shared again from another document.
 */

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

async function seedResume(userId: string, data: { moderated?: boolean } = {}) {
  return prisma.document.create({
    data: {
      userId,
      type: "RESUME",
      title: "Resume",
      slug: `resume-${randomUUID().slice(0, 8)}`,
      content: { basics: { name: "Owner" } },
      visibility: data.moderated ? "PRIVATE" : "UNLISTED",
      moderatedPrivateAt: data.moderated ? new Date() : null,
    },
  });
}

function share(user: TestUser, documentId: string) {
  return as(user, request(app).post("/api/v1/shares")).send({
    documentId,
    snapshot: { basics: { name: "The same content" } },
  });
}

describe("V-302 a moderator-locked document holds the account's share links", () => {
  it("refuses a new link, and a refresh of an old one, on another document", async () => {
    const owner = await createUserWithSession();
    const other = await seedResume(owner.id);
    const before = await share(owner, other.id);
    expect(before.status, JSON.stringify(before.body)).toBe(201);

    await seedResume(owner.id, { moderated: true });
    const fresh = await seedResume(owner.id);

    expect((await share(owner, fresh.id)).status).toBe(403);
    expect((await share(owner, other.id)).status).toBe(403);
    expect(await prisma.shareLink.count({ where: { documentId: fresh.id } })).toBe(0);
  });

  it("keeps the hold after the owner moves the locked document to the trash", async () => {
    const owner = await createUserWithSession();
    const locked = await seedResume(owner.id, { moderated: true });
    const trashed = await as(owner, request(app).delete(`/api/v1/documents/${locked.id}`));
    expect(trashed.status, JSON.stringify(trashed.body)).toBe(200);

    const copy = await seedResume(owner.id);
    expect((await share(owner, copy.id)).status).toBe(403);
  });

  it("lifts with the moderator's lock", async () => {
    const owner = await createUserWithSession();
    const locked = await seedResume(owner.id, { moderated: true });
    const copy = await seedResume(owner.id);
    expect((await share(owner, copy.id)).status).toBe(403);

    await prisma.document.update({
      where: { id: locked.id },
      data: { moderatedPrivateAt: null, visibility: "UNLISTED" },
    });
    const response = await share(owner, copy.id);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  });

  it("does not hold another account", async () => {
    const moderatedOwner = await createUserWithSession();
    await seedResume(moderatedOwner.id, { moderated: true });

    const someoneElse = await createUserWithSession();
    const theirs = await seedResume(someoneElse.id);
    expect((await share(someoneElse, theirs.id)).status).toBe(201);
  });

  it("is not set by a portfolio takedown", async () => {
    const owner = await createUserWithSession();
    await prisma.document.create({
      data: {
        userId: owner.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: `site-${randomUUID().slice(0, 8)}`,
        content: {},
        visibility: "PRIVATE",
        moderatedPrivateAt: new Date(),
      },
    });
    const resume = await seedResume(owner.id);
    const response = await share(owner, resume.id);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  });

  it("lapses once the locked document has been purged by retention", async () => {
    const owner = await createUserWithSession();
    const locked = await seedResume(owner.id, { moderated: true });
    await prisma.document.update({
      where: { id: locked.id },
      data: {
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        content: PURGED_DOCUMENT_CONTENT,
      },
    });

    const copy = await seedResume(owner.id);
    const response = await share(owner, copy.id);
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  });
});

describe("V-303 a document id is bounded like the paging cursor's", () => {
  function create(user: TestUser, id: string) {
    return as(user, request(app).post("/api/v1/documents")).send({
      id,
      type: "RESUME",
      title: "Resume",
    });
  }

  it("refuses an id longer than 64 characters or outside [A-Za-z0-9_-], and writes nothing", async () => {
    const user = await createUserWithSession();

    for (const id of ["a".repeat(65), "has space", "slash/id", ""]) {
      const response = await create(user, id);
      expect(response.status, `${JSON.stringify(id)} ${JSON.stringify(response.body)}`).toBe(400);
    }
    expect(await prisma.document.count({ where: { userId: user.id } })).toBe(0);
  });

  it("accepts the studio's ids and a 64-character one, and pages across them", async () => {
    const user = await createUserWithSession();
    const longest = `r${"x".repeat(63)}`;
    expect((await create(user, "resume-mh2k9x-a1b2c3")).status).toBe(201);
    await prisma.document.create({
      data: {
        id: longest,
        userId: user.id,
        type: "COVER_LETTER",
        title: "L",
        slug: "l",
        content: {},
      },
    });

    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await as(
        user,
        request(app).get(`/api/v1/documents?limit=1${cursor ? `&cursor=${cursor}` : ""}`),
      );
      expect(page.status, JSON.stringify(page.body)).toBe(200);
      seen.push(...page.body.data.map((row: { id: string }) => row.id));
      cursor = page.body.nextCursor ?? undefined;
    } while (cursor && seen.length < 10);

    expect(seen.sort()).toEqual(["resume-mh2k9x-a1b2c3", longest].sort());
  });

  it("still pages across a longer id stored before the bound", async () => {
    const user = await createUserWithSession();
    const legacy = `legacy/${"y".repeat(300)}`;
    await prisma.document.create({
      data: { userId: user.id, type: "COVER_LETTER", title: "Other", slug: "other", content: {} },
    });
    // Newest, so the first page ends on it and the cursor carries its id.
    await prisma.document.create({
      data: { id: legacy, userId: user.id, type: "RESUME", title: "Old", slug: "old", content: {} },
    });

    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await as(
        user,
        request(app).get(`/api/v1/documents?limit=1${cursor ? `&cursor=${cursor}` : ""}`),
      );
      expect(page.status, JSON.stringify(page.body)).toBe(200);
      seen.push(...page.body.data.map((row: { id: string }) => row.id));
      cursor = page.body.nextCursor ?? undefined;
    } while (cursor && seen.length < 10);

    expect(seen).toContain(legacy);
    expect(seen).toHaveLength(2);
  });
});
