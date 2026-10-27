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
