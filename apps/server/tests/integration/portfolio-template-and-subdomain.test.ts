import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { config } from "#config";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

type TemplateId = "signal" | "atelier" | "nimbus" | "cipher";

function asUser(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

function validContent(templateId: TemplateId) {
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

async function saveDraft(user: TestUser, subdomain: string, templateId: TemplateId) {
  return asUser(user, request(app).put("/api/v1/portfolios/draft")).send({
    subdomain,
    snapshot: validContent(templateId),
  });
}

async function publish(user: TestUser, documentId: string, subdomain: string) {
  const { revision } = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  return asUser(user, request(app).post("/api/v1/portfolios/publish")).send({
    documentId,
    subdomain,
    revision,
  });
}

function sub(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

describe("V-299: the published template is the one in the content, and premium needs a plan", () => {
  it("a templateId-only PATCH moves the content too, so a free user cannot publish Nimbus under a Signal label", async () => {
    const user = await createUserWithSession();
    const subdomain = sub("tpl");

    const draft = await saveDraft(user, subdomain, "nimbus");
    expect(draft.status, JSON.stringify(draft.body)).toBe(200);
    const documentId = draft.body.data.id as string;

    const patch = await asUser(user, request(app).patch(`/api/v1/documents/${documentId}`)).send({
      templateId: "signal",
      revision: draft.body.data.revision,
    });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    expect(row.templateId).toBe("signal");
    expect((row.content as { templateId: string }).templateId).toBe("signal");

    const published = await publish(user, documentId, subdomain);
    expect(published.status, JSON.stringify(published.body)).toBe(201);

    const publication = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(publication.templateId).toBe("signal");
    expect((publication.snapshot as { templateId: string }).templateId).toBe("signal");
  });

  it("a row whose column and content disagree is judged by the content: premium content is refused (402)", async () => {
    const user = await createUserWithSession();
    const subdomain = sub("split");
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "signal",
        content: validContent("nimbus"),
      },
    });

    const published = await publish(user, document.id, subdomain);
    expect(published.status, JSON.stringify(published.body)).toBe(402);
    expect(await prisma.portfolioPublication.count({ where: { userId: user.id } })).toBe(0);
  });

  it("a premium column over free content is refused too (402), so neither side can be used to slip past", async () => {
    const user = await createUserWithSession();
    const subdomain = sub("split2");
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "cipher",
        content: validContent("signal"),
      },
    });

    const published = await publish(user, document.id, subdomain);
    expect(published.status, JSON.stringify(published.body)).toBe(402);
  });
});

describe("V-300: reserved subdomains cannot be claimed through a document slug", () => {
  it("POST /documents never gives a PORTFOLIO document a reserved slug, explicit or from the title", async () => {
    const user = await createUserWithSession();

    const explicit = await asUser(user, request(app).post("/api/v1/documents")).send({
      type: "PORTFOLIO",
      slug: "login",
      title: "Portfolio",
      content: validContent("signal"),
    });
    expect(explicit.status, JSON.stringify(explicit.body)).toBe(201);
    expect(explicit.body.data.slug).not.toBe("login");

    const other = await createUserWithSession();
    const fromTitle = await asUser(other, request(app).post("/api/v1/documents")).send({
      type: "PORTFOLIO",
      title: "Billing",
      content: validContent("signal"),
    });
    expect(fromTitle.status, JSON.stringify(fromTitle.body)).toBe(201);
    expect(fromTitle.body.data.slug).not.toBe("billing");
  });

  it("PATCH /documents cannot rename a PORTFOLIO document's slug to a reserved name", async () => {
    const user = await createUserWithSession();
    const draft = await saveDraft(user, sub("ren"), "signal");
    expect(draft.status).toBe(200);

    const patch = await asUser(
      user,
      request(app).patch(`/api/v1/documents/${draft.body.data.id}`),
    ).send({ slug: "support", revision: draft.body.data.revision });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: draft.body.data.id } });
    expect(row.slug).not.toBe("support");
  });

  it("a draft that already carries a reserved slug (old data) cannot save or publish on it", async () => {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: "admin",
        templateId: "signal",
        content: validContent("signal"),
      },
    });

    const save = await asUser(user, request(app).put("/api/v1/portfolios/draft")).send({
      documentId: document.id,
      revision: document.revision,
      subdomain: "admin",
      snapshot: validContent("signal"),
    });
    expect(save.status, JSON.stringify(save.body)).toBe(400);

    const published = await publish(user, document.id, "admin");
    expect(published.status, JSON.stringify(published.body)).toBe(400);
    expect(await prisma.portfolioPublication.count({ where: { subdomain: "admin" } })).toBe(0);
  });

  it("a site already published on a name keeps it (the grandfather rule covers publications only)", async () => {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: "status",
        templateId: "signal",
        content: validContent("signal"),
        visibility: "PUBLIC",
      },
    });
    await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId: document.id,
        subdomain: "status",
        templateId: "signal",
        snapshot: validContent("signal"),
      },
    });

    const republished = await publish(user, document.id, "status");
    expect(republished.status, JSON.stringify(republished.body)).toBe(201);
  });
});

describe("V-301: a portfolio subdomain is not one of the user's document slugs", () => {
  it("saves and publishes on a name a résumé's slug already uses", async () => {
    const user = await createUserWithSession();
    const name = sub("gautam-raj");
    const resume = await asUser(user, request(app).post("/api/v1/documents")).send({
      type: "RESUME",
      title: "Resume",
      slug: name,
    });
    expect(resume.status, JSON.stringify(resume.body)).toBe(201);
    expect(resume.body.data.slug).toBe(name);

    const availability = await asUser(
      user,
      request(app).get(`/api/v1/portfolios/subdomains/${name}/availability`),
    );
    expect(availability.body.data.available).toBe(true);

    const draft = await saveDraft(user, name, "signal");
    expect(draft.status, JSON.stringify(draft.body)).toBe(200);
    expect(draft.body.data.slug).toBe(name);

    const me = await asUser(user, request(app).get("/api/v1/portfolios/me"));
    expect(me.body.data.draft.slug).toBe(name);

    const published = await publish(user, draft.body.data.id, name);
    expect(published.status, JSON.stringify(published.body)).toBe(201);
    expect(published.body.data.subdomain).toBe(name);
  });

  it("starts again on the subdomain of a portfolio just moved to the trash", async () => {
    const user = await createUserWithSession();
    const name = sub("again");
    const first = await saveDraft(user, name, "signal");
    expect(first.status).toBe(200);

    const trashed = await asUser(
      user,
      request(app).delete(`/api/v1/documents/${first.body.data.id}`),
    );
    expect(trashed.status, JSON.stringify(trashed.body)).toBe(200);

    const second = await saveDraft(user, name, "signal");
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body.data.id).not.toBe(first.body.data.id);
    expect(second.body.data.slug).toBe(name);
  });

  it("keeps the subdomain when the portfolio document is renamed", async () => {
    const user = await createUserWithSession();
    const name = sub("keep");
    const draft = await saveDraft(user, name, "signal");

    const renamed = await asUser(
      user,
      request(app).patch(`/api/v1/documents/${draft.body.data.id}`),
    ).send({ title: "My new site", revision: draft.body.data.revision });
    expect(renamed.status, JSON.stringify(renamed.body)).toBe(200);

    const me = await asUser(user, request(app).get("/api/v1/portfolios/me"));
    expect(me.body.data.draft.slug).toBe(name);
  });

  it("a first save whose document slug is taken in the meantime still saves", async () => {
    const user = await createUserWithSession();
    const name = sub("race");
    // Another document takes the slug the save picked, between its check and its insert.
    const count = prisma.document.count.bind(prisma.document) as (
      ...a: unknown[]
    ) => Promise<number>;
    let taken: string | null = null;
    vi.spyOn(prisma.document, "count").mockImplementation((async (...args: unknown[]) => {
      const free = await count(...args);
      const slug = (args[0] as { where?: { slug?: string } } | undefined)?.where?.slug;
      if (taken === null && slug) {
        taken = slug;
        await prisma.document.create({
          data: { userId: user.id, type: "RESUME", title: "Taken", slug, content: {} },
        });
      }
      return free;
    }) as never);

    const draft = await saveDraft(user, name, "signal");
    expect(draft.status, JSON.stringify(draft.body)).toBe(200);
    expect(draft.body.data.slug).toBe(name);
    expect(taken).not.toBeNull();
    const row = await prisma.document.findUniqueOrThrow({ where: { id: draft.body.data.id } });
    expect(row.slug).not.toBe(taken);
  });
});

describe("the address a publish hands back is the one that serves the site", () => {
  it("a free template gets the portfolio path, since its subdomain only redirects there", async () => {
    const user = await createUserWithSession();
    const subdomain = sub("free-url");
    const draft = await saveDraft(user, subdomain, "signal");
    expect(draft.status, JSON.stringify(draft.body)).toBe(200);

    const response = await publish(user, draft.body.data.id, subdomain);

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.publicUrl).toBe(`${config.portfolio.url}/portfolio/${subdomain}`);
  });

  it("a paid premium template keeps its own subdomain", async () => {
    const user = await createUserWithSession();
    await prisma.entitlementGrant.create({
      data: { userId: user.id, key: "portfolio_publish", source: "MANUAL", sourceId: randomUUID() },
    });
    const subdomain = sub("paid-url");
    const draft = await saveDraft(user, subdomain, "nimbus");
    expect(draft.status, JSON.stringify(draft.body)).toBe(200);

    const response = await publish(user, draft.body.data.id, subdomain);

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.publicUrl).toBe(`https://${subdomain}.veriworkly.com`);
  });
});
