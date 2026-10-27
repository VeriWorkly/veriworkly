import { randomBytes, randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * V-232 (admin deletion takes the public portfolio down and tells the person), V-233 (admin
 * username edits follow the user rules) and V-238 (an open checkout blocks deletion). Real
 * Postgres and Redis; only the outgoing mail is replaced.
 */

const { sendAccountDeletedEmail, checkoutRetrieve } = vi.hoisted(() => ({
  sendAccountDeletedEmail: vi.fn().mockResolvedValue(undefined),
  checkoutRetrieve: vi.fn(),
}));

vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class MockedDodo extends actual.default {
    constructor(options: ConstructorParameters<typeof actual.default>[0]) {
      super(options);
      Object.assign(this, { checkoutSessions: { retrieve: checkoutRetrieve } });
    }
  }
  return { ...actual, default: MockedDodo };
});

vi.mock("#services/mail/index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#services/mail/index")>()),
  sendAccountDeletedEmail,
}));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

let adminPromise: Promise<TestUser> | null = null;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function as(user: TestUser, req: request.Test) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

function publicGet(path: string) {
  return request(app).get(path).set("Origin", STUDIO_ORIGIN);
}

async function adminDelete(target: TestUser) {
  return as(await admin(), request(app).delete(`/api/v1/admin/users/${target.id}`)).send({
    confirmEmail: target.email,
    reason: "Requested erasure",
  });
}

function adminRename(target: TestUser, username: string) {
  return admin().then((moderator) =>
    as(moderator, request(app).patch(`/api/v1/admin/users/${target.id}`)).send({
      username,
      reason: "Support ticket",
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  checkoutRetrieve.mockReset();
});

describe("V-232 admin deletion revalidates the public portfolio and sends the confirmation", () => {
  it("asks the portfolio app to drop the site and emails the deleted account", async () => {
    const target = await createUserWithSession();
    const subdomain = `gone${randomBytes(4).toString("hex")}`;
    const document = await prisma.document.create({
      data: {
        userId: target.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "signal",
        content: {},
        visibility: "PUBLIC",
      },
    });
    await prisma.portfolioPublication.create({
      data: {
        userId: target.id,
        documentId: document.id,
        subdomain,
        templateId: "signal",
        snapshot: {},
      },
    });

    const realFetch = globalThis.fetch;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) =>
        String(input).includes("/api/revalidate")
          ? new Response("{}", { status: 200 })
          : realFetch(input, init),
      );

    const removed = await adminDelete(target);
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);

    await vi.waitFor(() => {
      const revalidations = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("/api/revalidate"),
      );
      expect(revalidations.map(([, init]) => String(init?.body)).join(" ")).toContain(
        `/portfolios/${subdomain}`,
      );
    });
    await vi.waitFor(() =>
      expect(sendAccountDeletedEmail).toHaveBeenCalledWith(target.email, expect.any(String)),
    );
  });
});

describe("V-233 admin username edits follow the user rules", () => {
  it("stores the name lowercased, so share links still resolve and availability agrees", async () => {
    const target = await createUserWithSession();
    const wanted = `Mixed${randomBytes(3).toString("hex")}`;

    const renamed = await adminRename(target, wanted);
    expect(renamed.status, JSON.stringify(renamed.body)).toBe(200);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(row.username).toBe(wanted.toLowerCase());

    const availability = await as(
      target,
      request(app).get(`/api/v1/users/${wanted.toLowerCase()}/availability`),
    );
    if (availability.status === 200) expect(availability.body.data.available).toBe(false);
  });

  it.each(["admin", "api"])("refuses the reserved name %s", async (reserved) => {
    const target = await createUserWithSession();
    const response = await adminRename(target, reserved);
    expect(response.status).toBe(400);
  });

  it("cuts a long name to the 32 characters a user may have, as the user route does", async () => {
    const target = await createUserWithSession();
    const long = `z${randomBytes(20).toString("hex")}`;
    expect((await adminRename(target, long)).status).toBe(200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(row.username).toBe(long.slice(0, 32));
  });

  it("drops the old username's cached share pages on a rename", async () => {
    const oldName = `old${randomBytes(4).toString("hex")}`;
    const target = await createUserWithSession({ username: oldName });
    const created = await as(target, request(app).post("/api/v1/documents")).send({
      type: "RESUME",
      title: "Resume",
      content: { basics: { fullName: "Old Name" } },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    const share = await as(target, request(app).post("/api/v1/shares")).send({
      documentId: created.body.data.id,
      snapshot: { a: 1 },
    });
    expect(share.status, JSON.stringify(share.body)).toBe(201);
    const slug: string = share.body.data.slug;

    expect((await publicGet(`/api/v1/shares/public/${oldName}/${slug}`)).status).toBe(200);

    const newName = `new${randomBytes(4).toString("hex")}`;
    expect((await adminRename(target, newName)).status).toBe(200);

    expect((await publicGet(`/api/v1/shares/public/${oldName}/${slug}`)).status).toBe(404);
    expect((await publicGet(`/api/v1/shares/public/${newName}/${slug}`)).status).toBe(200);
  });
});

describe("V-238 an open checkout blocks account deletion", () => {
  async function openCheckout(userId: string, state: "open" | "claimed" = "open") {
    const record =
      state === "open"
        ? {
            state,
            sessionId: `cks_${randomUUID()}`,
            url: "https://checkout.example.test/session",
            productKey: "portfolio_pro",
            interval: "monthly",
            createdAt: new Date().toISOString(),
          }
        : { state, token: randomUUID() };
    await getRedis().set(`billing:checkout:${userId}`, JSON.stringify(record), { EX: 600 });
  }

  it.each(["open", "claimed"] as const)(
    "self-deletion with a %s checkout is a 409 CHECKOUT_IN_PROGRESS and nothing is deleted",
    async (state) => {
      const user = await createUserWithSession();
      await openCheckout(user.id, state);

      const response = await as(user, request(app).delete("/api/v1/users/me"));
      expect(response.status, JSON.stringify(response.body)).toBe(409);
      expect(response.body.details?.code).toBe("CHECKOUT_IN_PROGRESS");
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    },
  );

  it("admin deletion asks the provider: a session being paid keeps the 409", async () => {
    const user = await createUserWithSession();
    await openCheckout(user.id);
    checkoutRetrieve.mockResolvedValueOnce({ payment_status: "processing" });

    const response = await adminDelete(user);
    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.details?.code).toBe("CHECKOUT_IN_PROGRESS");
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });

  it("admin deletion clears an unpaid open session at the provider's word and goes ahead", async () => {
    const user = await createUserWithSession();
    await openCheckout(user.id);
    checkoutRetrieve.mockResolvedValueOnce({ payment_status: null });

    const response = await adminDelete(user);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await getRedis().get(`billing:checkout:${user.id}`)).toBeNull();
  });

  it("admin deletion keeps the record and answers 503 when the provider cannot be asked", async () => {
    const user = await createUserWithSession();
    await openCheckout(user.id);
    checkoutRetrieve.mockRejectedValueOnce(new Error("provider down"));

    const response = await adminDelete(user);
    expect(response.status, JSON.stringify(response.body)).toBe(503);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    expect(await getRedis().get(`billing:checkout:${user.id}`)).not.toBeNull();
  });

  it("admin deletion keeps the 409 for a checkout still being created", async () => {
    const user = await createUserWithSession();
    await openCheckout(user.id, "claimed");

    const response = await adminDelete(user);
    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.details?.code).toBe("CHECKOUT_IN_PROGRESS");
    expect(checkoutRetrieve).not.toHaveBeenCalled();
  });

  it("deletion goes ahead once the checkout record is gone", async () => {
    const user = await createUserWithSession();
    const response = await as(user, request(app).delete("/api/v1/users/me"));
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  });
});
