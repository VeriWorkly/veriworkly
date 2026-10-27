import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-199: admin document rows say whether a moderator made the document private, so the studio
 * offers "Lift takedown" only on those. V-200: the user's credit history never carries an
 * admin's identity.
 */

let adminUser: TestUser;
beforeAll(async () => {
  adminUser = await createUserWithSession({ email: "admin@example.test" });
});

function asAdmin(method: "get" | "patch" | "post", path: string) {
  return request(app)
    [method](`/api/v1${path}`)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", adminUser.cookie);
}

async function createDocument(userId: string, visibility: "PRIVATE" | "UNLISTED" = "UNLISTED") {
  return prisma.document.create({
    data: {
      userId,
      title: "Resume",
      slug: `resume-${randomUUID().slice(0, 8)}`,
      content: { basics: { name: "Owner" } },
      visibility,
    },
  });
}

describe("V-199 admin document rows expose the moderation state", () => {
  it("flags only the document a moderator made private, on the list and on the detail", async () => {
    const owner = await createUserWithSession();
    const moderated = await createDocument(owner.id);
    const ownPrivate = await createDocument(owner.id, "PRIVATE");
    const lifted = await createDocument(owner.id);

    const hide = await asAdmin("patch", `/admin/documents/${moderated.id}`).send({
      visibility: "PRIVATE",
      reason: "Reported as impersonation",
    });
    expect(hide.status).toBe(200);
    for (const visibility of ["PRIVATE", "UNLISTED"] as const) {
      const response = await asAdmin("patch", `/admin/documents/${lifted.id}`).send({
        visibility,
        reason: "Reviewed the report",
      });
      expect(response.status).toBe(200);
    }

    const list = await asAdmin("get", `/admin/documents?userId=${owner.id}&limit=50`);
    expect(list.status).toBe(200);
    const byId = new Map(
      (list.body.data.items as Array<{ id: string; moderatorPrivate: boolean }>).map((item) => [
        item.id,
        item.moderatorPrivate,
      ]),
    );
    expect(byId.get(moderated.id)).toBe(true);
    expect(byId.get(ownPrivate.id)).toBe(false);
    expect(byId.get(lifted.id)).toBe(false);

    const detail = await asAdmin("get", `/admin/documents/${moderated.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.document.moderatorPrivate).toBe(true);
    const ownDetail = await asAdmin("get", `/admin/documents/${ownPrivate.id}`);
    expect(ownDetail.body.data.document.moderatorPrivate).toBe(false);
  });
});

describe("V-200 the user's credit history carries no admin metadata", () => {
  it("strips the admin's id from an adjustment row, keeping what the user needs", async () => {
    const user = await createUserWithSession();
    const grantId = randomUUID();
    await CreditService.grant(user.id, 40, {
      requestId: `grant:${grantId}`,
      source: "integration",
      sourceId: grantId,
      reason: "Plan allowance",
    });

    const adjusted = await asAdmin("post", "/admin/billing/credits").send({
      userId: user.id,
      amount: 15,
      reason: "Ticket 41: double charge, internal note",
      customerNote: "Goodwill credit",
      idempotencyKey: "gw-1",
    });
    expect(adjusted.status).toBe(200);
    // The admin's own ledger row does record who did it.
    const stored = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, action: "admin_adjustment" },
    });
    expect(JSON.stringify(stored)).toContain(adminUser.id);

    const history = await request(app)
      .get("/api/v1/billing/credits/history")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(history.status).toBe(200);
    const rows = history.body.data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain(adminUser.id);
    // The admin's internal reason stays in the audit log (V-229).
    expect(JSON.stringify(rows)).not.toContain("internal note");
    const adjustment = rows.find((row) => row.reason === "Goodwill credit");
    expect(adjustment).toMatchObject({
      type: expect.any(String),
      amount: 15,
      balanceAfter: 55,
      action: "admin_adjustment",
      reason: "Goodwill credit",
    });
    expect(adjustment).not.toHaveProperty("requestId");
    expect(adjustment).not.toHaveProperty("walletId");
    expect(adjustment?.metadata ?? {}).not.toHaveProperty("actorId");
  });
});
