import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

/**
 * V-416: publishing is admin-only in production (owner rule: payments and publishing are
 * admin-only in production). Only the publish controller's `isProduction` is switched on, for the
 * one request; the rest of the app runs as the test environment.
 */

const gate = vi.hoisted(() => ({ production: false }));

vi.mock("#config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#config")>();
  return {
    ...actual,
    get isProduction() {
      return gate.production;
    },
  };
});
vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { PortfolioService } from "#services/portfolioService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

function content() {
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

async function draftFor(user: TestUser) {
  const subdomain = `gate-${randomUUID().slice(0, 8)}`;
  const saved = await request(app)
    .put("/api/v1/portfolios/draft")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send({ subdomain, snapshot: content() });
  expect(saved.status, JSON.stringify(saved.body)).toBe(200);
  return {
    id: saved.body.data.id as string,
    revision: saved.body.data.revision as number,
    subdomain,
  };
}

async function publishInProduction(user: TestUser, draft: Awaited<ReturnType<typeof draftFor>>) {
  gate.production = true;
  try {
    return await request(app)
      .post("/api/v1/portfolios/publish")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ documentId: draft.id, subdomain: draft.subdomain, revision: draft.revision });
  } finally {
    gate.production = false;
  }
}

describe("V-416 the production publishing gate", () => {
  it("refuses everyone but the admin with 403 and publishes nothing", async () => {
    const owner = await createUserWithSession();
    const draft = await draftFor(owner);
    const publish = vi.spyOn(PortfolioService, "publish");

    const response = await publishInProduction(owner, draft);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/Publishing is disabled in production/);
    expect(publish).not.toHaveBeenCalled();
    expect(await prisma.portfolioPublication.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("lets the configured admin publish", async () => {
    const admin = await createUserWithSession({ email: "admin@example.test" });
    const draft = await draftFor(admin);

    const response = await publishInProduction(admin, draft);

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(
      await prisma.portfolioPublication.findUnique({ where: { userId: admin.id } }),
    ).toMatchObject({ subdomain: draft.subdomain, status: "LIVE" });
  });

  it("outside production, an ordinary user publishes", async () => {
    const owner = await createUserWithSession();
    const draft = await draftFor(owner);

    const response = await request(app)
      .post("/api/v1/portfolios/publish")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", owner.cookie)
      .send({ documentId: draft.id, subdomain: draft.subdomain, revision: draft.revision });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
  });
});
