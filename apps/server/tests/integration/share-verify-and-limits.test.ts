import request from "supertest";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

// The mail transport is the one thing replaced here: the contact receipt is asserted on what would
// have been handed to Resend/SMTP, with everything above it (route, limiter, Redis) real.
vi.mock("#services/mail/transporter", () => ({ sendMail }));

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { ShareService } from "#services/shareService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

const PASSWORD = "correct horse battery staple";

/**
 * Letters only by default: the middleware folds segments that mix letters and digits into `:id`,
 * which puts every such link into one outer bucket per IP. `idLike` asks for exactly that.
 */
async function seedProtectedShare({ idLike = false } = {}) {
  const letters = Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
  const suffix = idLike ? `${letters}42` : letters;
  const user = await createUserWithSession({ username: `owner${suffix}` });
  const slug = `resume-${suffix}`;

  const document = await prisma.document.create({
    data: {
      userId: user.id,
      title: "Resume",
      slug,
      content: { basics: { name: "Owner" } },
      // Shared through the API, which unlists the document (V-171).
      visibility: "UNLISTED",
    },
  });

  const shareLink = await prisma.shareLink.create({
    data: {
      userId: user.id,
      documentId: document.id,
      slug,
      snapshot: { basics: { name: "Owner" } },
      passwordHash: await ShareService.hashPassword(PASSWORD),
    },
  });

  return { username: `owner${suffix}`, slug, shareLinkId: shareLink.id };
}

function verify(path: string, body: object) {
  return request(app).post(path).set("Origin", STUDIO_ORIGIN).send(body);
}

async function innerAttemptCount(shareLinkId: string): Promise<number | null> {
  const keys = await getRedis().keys(`share:verify-attempts:${shareLinkId}:*`);
  if (keys.length === 0) return null;
  return Number(await getRedis().get(keys[0]!));
}

// One limiter bucket per route and client (V-162): every test here verifies from 127.0.0.1, so
// each starts with the route buckets empty instead of inheriting the previous test's count.
beforeEach(async () => {
  const keys = await getRedis().keys("rate-limit:*");
  if (keys.length > 0) await getRedis().del(keys);
});

describe("share password verify", () => {
  /**
   * V-128: the studio treats every 401 as an expired session and signs the viewer out, so a typo
   * in a share password must not be a 401.
   */
  it("answers a wrong password with 403 and a missing password with 400", async () => {
    const { username, slug } = await seedProtectedShare();
    const path = `/api/v1/shares/public/${username}/${slug}/verify`;

    const wrong = await verify(path, { password: "nope" });
    expect(wrong.status).toBe(403);
    expect(wrong.body).toMatchObject({
      success: false,
      message: "Invalid password",
      statusCode: 403,
    });

    const missing = await verify(path, {});
    expect(missing.status).toBe(400);
  });

  /**
   * The per-link limit lives in the handler and is keyed on the link, so path spellings that
   * normalise to the same link (`slug`, `slug-`, `-slug` all resolve to one share) cannot each
   * get their own budget the way they do in the path-keyed middleware.
   */
  it("refuses the 6th wrong attempt per link and IP with 429 and Retry-After, across spellings", async () => {
    const { username, slug } = await seedProtectedShare();
    const spellings = [slug, `${slug}-`, `-${slug}`];
    const statuses: number[] = [];
    let last: request.Response | undefined;

    for (let i = 0; i < 6; i += 1) {
      const spelling = spellings[Math.floor(i / 2)]!;
      last = await verify(`/api/v1/shares/public/${username}/${spelling}/verify`, {
        password: `wrong-${i}`,
      });
      statuses.push(last.status);
    }

    expect(statuses).toEqual([403, 403, 403, 403, 403, 429]);
    expect(Number(last!.headers["retry-after"])).toBeGreaterThan(0);
    expect(Number(last!.headers["retry-after"])).toBeLessThanOrEqual(300);
  });

  /** V-087: `/SHARES/PUBLIC/…/VERIFY/` used to land in its own bucket under the 100/15 min default. */
  it("counts the upper-case, trailing-slash spelling in the same limiter bucket", async () => {
    const { username, slug, shareLinkId } = await seedProtectedShare();

    const lower = `/api/v1/shares/public/${username}/${slug}/verify`;
    const shoutedPath = `/api/v1/SHARES/PUBLIC/${username.toUpperCase()}/${slug.toUpperCase()}/VERIFY/`;

    for (const [i, path] of [lower, lower, lower, shoutedPath, shoutedPath].entries()) {
      const res = await verify(path, { password: `wrong-${i}` });
      expect(res.status).toBe(403);
    }

    // Both spellings drew on one per-link counter and one middleware bucket.
    expect(await innerAttemptCount(shareLinkId)).toBe(5);
    expect(
      await getRedis().get(
        "rate-limit:POST:/api/v1/shares/public/:username/:slug/verify:127.0.0.1",
      ),
    ).toBe("5");

    const shouted = await verify(shoutedPath, { password: "wrong-again" });
    expect(shouted.status).toBe(429);
    expect(Number(shouted.headers["retry-after"])).toBeGreaterThan(0);
  });

  /**
   * The middleware class (20 / 5 min per IP, shared across links whose segments fold to `:id`)
   * is only the outer bound: a viewer can use the full 5-attempt budget on two links.
   */
  it("gives each link its own 5 attempts under the shared outer bound", async () => {
    const a = await seedProtectedShare({ idLike: true });
    const b = await seedProtectedShare({ idLike: true });
    const pathOf = (s: { username: string; slug: string }) =>
      `/api/v1/shares/public/${s.username}/${s.slug}/verify`;

    for (const link of [a, b])
      for (let i = 0; i < 5; i += 1)
        expect((await verify(pathOf(link), { password: `wrong-${i}` })).status).toBe(403);

    // All ten landed in one outer bucket, which is still under its ceiling.
    expect(
      await getRedis().get(
        "rate-limit:POST:/api/v1/shares/public/:username/:slug/verify:127.0.0.1",
      ),
    ).toBe("10");

    for (const link of [a, b]) {
      const sixth = await verify(pathOf(link), { password: "wrong-6" });
      expect(sixth.status).toBe(429);
      expect(Number(sixth.headers["retry-after"])).toBeGreaterThan(0);
    }
  });

  it("unlocks with the correct password and resets the per-link counter", async () => {
    const { username, slug, shareLinkId } = await seedProtectedShare();
    const path = `/api/v1/shares/public/${username}/${slug}/verify`;

    expect((await verify(path, { password: "wrong-1" })).status).toBe(403);
    expect(await innerAttemptCount(shareLinkId)).toBe(1);

    const unlocked = await verify(path, { password: PASSWORD });
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.snapshot).toEqual({ basics: { name: "Owner" } });

    expect(await innerAttemptCount(shareLinkId)).toBeNull();
  });
});

describe("contact form", () => {
  const MESSAGE = "Visit https://evil.example/claim-your-prize to collect your reward now";
  const SUBJECT = "You won a prize";

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
  });

  function submit(path: string, overrides: Record<string, unknown> = {}) {
    return request(app)
      .post(path)
      .set("Origin", STUDIO_ORIGIN)
      .send({
        name: "Mallory <b>Attacker</b> With A Very Long Name That Keeps Going",
        email: "victim@example.test",
        subject: SUBJECT,
        message: MESSAGE,
        _ts: Date.now() - 5_000,
        ...overrides,
      });
  }

  it("rejects, throttles receipts per recipient, and never echoes content to the recipient", async () => {
    // 1. No `_ts`: a hard 400, not a silent success.
    const missingTs = await submit("/api/v1/contact", { _ts: undefined });
    expect(missingTs.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();

    // 2. A valid submission: the team gets the content, the submitter gets a fixed receipt.
    const ok = await submit("/api/v1/contact");
    expect(ok.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);

    const [adminMail, receipt] = sendMail.mock.calls.map(([mail]) => mail);
    expect(adminMail.to).not.toBe("victim@example.test");
    expect(adminMail.text).toContain(MESSAGE);

    expect(receipt.to).toBe("victim@example.test");
    for (const field of [receipt.subject, receipt.text, receipt.html]) {
      expect(field).not.toContain("evil.example");
      expect(field).not.toContain(SUBJECT);
      expect(field).not.toContain("<b>");
      expect(field).not.toContain("Keeps Going");
    }

    // 3. Receipts are capped at 3 per recipient per day; the team notification still goes out.
    expect((await submit("/api/v1/contact")).status).toBe(200);
    expect((await submit("/api/v1/contact")).status).toBe(200);
    const receiptsSoFar = sendMail.mock.calls.filter(([m]) => m.to === "victim@example.test");
    expect(receiptsSoFar).toHaveLength(3);

    sendMail.mockClear();
    expect((await submit("/api/v1/contact")).status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0]![0].to).not.toBe("victim@example.test");

    // 4. That was the 5th request this hour from this IP; a differently-spelled path is the same
    //    bucket and is refused.
    const sixth = await submit("/api/v1/Contact/");
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers["retry-after"])).toBeGreaterThan(0);
  });
});

describe("OTP recipient cap through better-auth", () => {
  const recipientKey = (email: string) =>
    `auth:otp:recipient:${createHash("sha256").update(email).digest("hex")}`;

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
  });

  function auth(path: string, body: object) {
    return request(app).post(`/api/v1/auth${path}`).set("Origin", STUDIO_ORIGIN).send(body);
  }

  /**
   * Reset codes only go to existing accounts, so a 429 here would say the account exists. Past the
   * cap both a registered and an unknown address get the same 200; the registered one gets no mail.
   */
  it("answers a capped password reset with a uniform 200 and sends nothing", async () => {
    const registered = await createUserWithSession({ email: "reset-owner@example.test" });
    const unknown = "nobody-here@example.test";

    for (const email of [registered.email, unknown]) await getRedis().set(recipientKey(email), "5");

    for (const [path, email] of [
      ["/email-otp/request-password-reset", registered.email],
      ["/email-otp/request-password-reset", unknown],
    ] as const) {
      const res = await auth(path, { email });
      expect(res.status, `${path} ${email}`).toBe(200);
    }

    expect(sendMail).not.toHaveBeenCalled();
    // The registered address was counted (and refused) inside sendVerificationOTP; the unknown
    // one never reached it.
    expect(await getRedis().get(recipientKey(registered.email))).toBe("6");
    expect(await getRedis().get(recipientKey(unknown))).toBe("5");
  });

  it("does not serve better-auth's deprecated /forget-password/email-otp (V-191)", async () => {
    const registered = await createUserWithSession({ email: "deprecated-reset@example.test" });

    const res = await auth("/forget-password/email-otp", { email: registered.email });
    expect(res.status).toBe(404);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("answers a capped sign-in code request with 429, since sign-in mails any address", async () => {
    const email = "signin-target@example.test";
    await getRedis().set(recipientKey(email), "5");

    const res = await auth("/email-otp/send-verification-otp", { email, type: "sign-in" });
    expect(res.status).toBe(429);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("share link list (V-030)", () => {
  const list = (cookie: string, documentId: string, query = "") =>
    request(app)
      .get(`/api/v1/shares/documents/${documentId}${query}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", cookie);

  async function seedShared() {
    const user = await createUserWithSession();
    const document = await prisma.document.create({
      data: { userId: user.id, title: "Resume", slug: "resume", content: {} },
    });
    await prisma.shareLink.create({
      data: { userId: user.id, documentId: document.id, slug: "resume", snapshot: {} },
    });
    return { user, documentId: document.id };
  }

  it("pages for real: a page past the end is empty and the total is the real count", async () => {
    const { user, documentId } = await seedShared();

    const first = await list(user.cookie, documentId, "?page=1&pageSize=20");
    expect(first.status).toBe(200);
    expect(first.body.data.items).toHaveLength(1);
    expect(first.body.data).toMatchObject({ total: 1, hasMore: false });

    const second = await list(user.cookie, documentId, "?page=2&pageSize=20");
    expect(second.status).toBe(200);
    expect(second.body.data.items).toEqual([]);
    expect(second.body.data.total).toBe(1);
  });

  it("an account without a username can open an empty list", async () => {
    const user = await createUserWithSession();
    await prisma.user.update({ where: { id: user.id }, data: { username: null } });
    const document = await prisma.document.create({
      data: { userId: user.id, title: "Resume", slug: "resume", content: {} },
    });

    const response = await list(user.cookie, document.id);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ items: [], total: 0 });
  });

  it("leaves out links on a soft-deleted document, even after the list was cached", async () => {
    const { user, documentId } = await seedShared();

    expect((await list(user.cookie, documentId)).body.data.total).toBe(1);

    const deleted = await request(app)
      .delete(`/api/v1/documents/${documentId}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(deleted.status).toBe(200);

    const after = await list(user.cookie, documentId);
    expect(after.body.data).toMatchObject({ items: [], total: 0 });
  });
});

describe("V-171 share links follow the document's visibility", () => {
  let adminPromise: Promise<Awaited<ReturnType<typeof createUserWithSession>>> | null = null;
  const admin = () => (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));

  const publicRead = (username: string, slug: string) =>
    request(app).get(`/api/v1/shares/public/${username}/${slug}`).set("Origin", STUDIO_ORIGIN);

  async function adminSetVisibility(documentId: string, visibility: "PRIVATE" | "UNLISTED") {
    const response = await request(app)
      .patch(`/api/v1/admin/documents/${documentId}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", (await admin()).cookie)
      .send({ visibility, reason: "Reported as impersonation" });
    expect(response.status).toBe(200);
  }

  async function shareThroughApi(cookie: string, documentId: string) {
    return request(app)
      .post("/api/v1/shares")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", cookie)
      .send({ documentId, snapshot: { basics: { name: "Owner" } }, noExpiry: true });
  }

  async function ownerWithDocument() {
    const letters = Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
    const user = await createUserWithSession({ username: `vis${letters}` });
    const document = await prisma.document.create({
      data: { userId: user.id, title: "Resume", slug: `cv-${letters}`, content: {} },
    });
    return { user, username: `vis${letters}`, document };
  }

  it("sharing a default (private) document makes it unlisted, so the link resolves", async () => {
    const { user, username, document } = await ownerWithDocument();
    expect(document.visibility).toBe("PRIVATE");

    const created = await shareThroughApi(user.cookie, document.id);
    expect(created.status).toBe(201);

    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("UNLISTED");
    expect((await publicRead(username, created.body.data.slug)).status).toBe(200);
  });

  it("Make private stops a cached link at once (404 like a missing link); unlisting restores it", async () => {
    const { user, username, document } = await ownerWithDocument();
    const created = await shareThroughApi(user.cookie, document.id);
    const slug = created.body.data.slug as string;

    // Warm the public cache first: the change must not wait for it to expire.
    expect((await publicRead(username, slug)).status).toBe(200);

    await adminSetVisibility(document.id, "PRIVATE");

    const hidden = await publicRead(username, slug);
    const missing = await publicRead(username, "no-such-link");
    expect(hidden.status).toBe(404);
    expect(hidden.body.message).toBe(missing.body.message);
    const verifyHidden = await verify(`/api/v1/shares/public/${username}/${slug}/verify`, {
      password: "anything",
    });
    expect(verifyHidden.status).toBe(404);

    // The owner cannot undo the moderator by sharing again.
    const reshare = await shareThroughApi(user.cookie, document.id);
    expect(reshare.status).toBe(403);
    expect((await publicRead(username, slug)).status).toBe(404);

    // The link itself was kept: making the document reachable again brings the same URL back.
    expect(await prisma.shareLink.count({ where: { documentId: document.id } })).toBe(1);
    await adminSetVisibility(document.id, "UNLISTED");
    expect((await publicRead(username, slug)).status).toBe(200);
  });

  async function ownerPatchVisibility(
    cookie: string,
    documentId: string,
    visibility: "PRIVATE" | "UNLISTED" | "PUBLIC",
  ) {
    const { revision } = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { revision: true },
    });
    return request(app)
      .patch(`/api/v1/documents/${documentId}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", cookie)
      .send({ visibility, revision });
  }

  it("the owner's own Make private stops a cached link at once, and unlisting brings it back", async () => {
    const { user, username, document } = await ownerWithDocument();
    const created = await shareThroughApi(user.cookie, document.id);
    const slug = created.body.data.slug as string;
    expect((await publicRead(username, slug)).status).toBe(200);

    expect((await ownerPatchVisibility(user.cookie, document.id, "PRIVATE")).status).toBe(200);
    expect((await publicRead(username, slug)).status).toBe(404);

    expect((await ownerPatchVisibility(user.cookie, document.id, "UNLISTED")).status).toBe(200);
    expect((await publicRead(username, slug)).status).toBe(200);
  });

  it("the owner cannot undo a moderator's Make private through the document PATCH", async () => {
    const { user, username, document } = await ownerWithDocument();
    const created = await shareThroughApi(user.cookie, document.id);
    const slug = created.body.data.slug as string;
    await adminSetVisibility(document.id, "PRIVATE");

    for (const visibility of ["UNLISTED", "PUBLIC"] as const) {
      const response = await ownerPatchVisibility(user.cookie, document.id, visibility);
      expect(response.status, visibility).toBe(403);
    }
    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("PRIVATE");
    expect((await publicRead(username, slug)).status).toBe(404);

    // Saving it as private, or editing anything else, is still the owner's to do.
    expect((await ownerPatchVisibility(user.cookie, document.id, "PRIVATE")).status).toBe(200);

    // Once the moderator lifts it, the owner's own choice applies again.
    await adminSetVisibility(document.id, "UNLISTED");
    expect((await ownerPatchVisibility(user.cookie, document.id, "PRIVATE")).status).toBe(200);
    expect((await ownerPatchVisibility(user.cookie, document.id, "UNLISTED")).status).toBe(200);
    expect((await publicRead(username, slug)).status).toBe(200);
  });

  async function portfolioOwner() {
    const owner = await ownerWithDocument();
    const document = await prisma.document.update({
      where: { id: owner.document.id },
      data: { type: "PORTFOLIO" },
    });
    return { ...owner, document };
  }

  it("refuses a share link on a portfolio document with 400 and leaves it private", async () => {
    const { user, document } = await portfolioOwner();

    const created = await shareThroughApi(user.cookie, document.id);

    expect(created.status, JSON.stringify(created.body)).toBe(400);
    expect(await prisma.shareLink.count({ where: { documentId: document.id } })).toBe(0);
    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("PRIVATE");
  });

  it("a force-unpublished portfolio cannot be made visible again by its owner", async () => {
    const { user, document } = await portfolioOwner();
    await prisma.document.update({ where: { id: document.id }, data: { visibility: "PUBLIC" } });
    const publication = await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId: document.id,
        subdomain: document.slug,
        templateId: "signal",
        snapshot: {},
      },
    });

    const takedown = await request(app)
      .delete(`/api/v1/admin/portfolios/${publication.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", (await admin()).cookie)
      .send({ reason: "Phishing page", confirm: publication.subdomain });
    expect(takedown.status, JSON.stringify(takedown.body)).toBe(200);

    for (const visibility of ["UNLISTED", "PUBLIC"] as const) {
      const response = await ownerPatchVisibility(user.cookie, document.id, visibility);
      expect(response.status, visibility).toBe(403);
    }
    expect(
      (await prisma.document.findUniqueOrThrow({ where: { id: document.id } })).visibility,
    ).toBe("PRIVATE");
  });

  it("the backfill names the document on takedowns recorded before documentId was kept", async () => {
    const { user, document } = await portfolioOwner();
    const old = await prisma.adminAuditEntry.create({
      data: {
        action: "portfolio.unpublish",
        targetType: "PortfolioPublication",
        targetId: `pub_${randomBytes(4).toString("hex")}`,
        reason: "Phishing page",
        metadata: { subdomain: document.slug },
      },
    });
    // Two portfolios with the slug of an old takedown's subdomain: which one is ambiguous.
    const twinSlug = `twin-${randomBytes(4).toString("hex")}`;
    for (let i = 0; i < 2; i += 1) {
      const owner = await portfolioOwner();
      await prisma.document.update({ where: { id: owner.document.id }, data: { slug: twinSlug } });
    }
    const ambiguous = await prisma.adminAuditEntry.create({
      data: {
        action: "portfolio.unpublish",
        targetType: "PortfolioPublication",
        targetId: `pub_${randomBytes(4).toString("hex")}`,
        reason: "Spam",
        metadata: { subdomain: twinSlug },
      },
    });

    const sql = readFileSync(
      new URL(
        "../../prisma/migrations/20261026150000_backfill_takedown_document_ids/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    for (let run = 0; run < 2; run += 1) await prisma.$executeRawUnsafe(sql);

    const metadataOf = async (id: string) =>
      (await prisma.adminAuditEntry.findUniqueOrThrow({ where: { id } })).metadata as Record<
        string,
        unknown
      >;
    expect(await metadataOf(old.id)).toEqual({ subdomain: document.slug, documentId: document.id });
    expect((await metadataOf(ambiguous.id)).documentId).toBeUndefined();

    // The lock now lives on the row (V-207); the next migration backfills it from these entries,
    // as `migrate deploy` runs them in order.
    const lockSql = readFileSync(
      new URL(
        "../../prisma/migrations/20261027100000_document_moderation_lock/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await prisma.$executeRawUnsafe(lockSql.slice(lockSql.indexOf("-- Backfill")));

    const reopen = await ownerPatchVisibility(user.cookie, document.id, "UNLISTED");
    expect(reopen.status).toBe(403);
  });

  it("Make private is not applied when its audit entry cannot be written", async () => {
    const { user, document } = await ownerWithDocument();
    const created = await shareThroughApi(user.cookie, document.id);
    expect(created.status).toBe(201);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_refuse_audit() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'audit store unavailable'; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER test_refuse_audit BEFORE INSERT ON "AdminAuditEntry" FOR EACH ROW EXECUTE FUNCTION test_refuse_audit()`,
    );
    try {
      const response = await request(app)
        .patch(`/api/v1/admin/documents/${document.id}`)
        .set("Origin", STUDIO_ORIGIN)
        .set("Cookie", (await admin()).cookie)
        .send({ visibility: "PRIVATE", reason: "Reported as impersonation" });
      expect(response.status).toBe(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS test_refuse_audit ON "AdminAuditEntry"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS test_refuse_audit()`);
    }

    // No takedown without its record: the document is as it was.
    const row = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(row.visibility).toBe("UNLISTED");
  });

  it("the migration unlists shared private documents, but not one a moderator made private", async () => {
    const shared = await ownerWithDocument();
    const moderated = await ownerWithDocument();
    const unshared = await ownerWithDocument();
    const coverLetter = await ownerWithDocument();
    await prisma.document.update({
      where: { id: coverLetter.document.id },
      data: { type: "COVER_LETTER" },
    });
    // A portfolio (shared before sharing was limited to résumés and cover letters, or forced
    // private by a takedown) is never unlisted by the migration.
    const portfolio = await portfolioOwner();

    for (const { user, document } of [shared, moderated, coverLetter, portfolio]) {
      await prisma.shareLink.create({
        data: { userId: user.id, documentId: document.id, slug: document.slug, snapshot: {} },
      });
    }
    await prisma.adminAuditEntry.create({
      data: {
        action: "document.visibility.change",
        targetType: "Document",
        targetId: moderated.document.id,
        reason: "Reported",
        metadata: { previousVisibility: "UNLISTED", visibility: "PRIVATE" },
      },
    });

    const sql = readFileSync(
      new URL(
        "../../prisma/migrations/20261026130000_shared_documents_are_unlisted/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await prisma.$executeRawUnsafe(sql);

    const visibilityOf = async (id: string) =>
      (await prisma.document.findUniqueOrThrow({ where: { id } })).visibility;
    expect(await visibilityOf(shared.document.id)).toBe("UNLISTED");
    expect(await visibilityOf(moderated.document.id)).toBe("PRIVATE");
    expect(await visibilityOf(unshared.document.id)).toBe("PRIVATE");
    expect(await visibilityOf(coverLetter.document.id)).toBe("UNLISTED");
    expect(await visibilityOf(portfolio.document.id)).toBe("PRIVATE");
  });
});

describe("V-188 owner share view counts", () => {
  it("the view flush refreshes the owner's cached share list", async () => {
    const letters = Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
    const user = await createUserWithSession({ username: `views${letters}` });
    const document = await prisma.document.create({
      data: { userId: user.id, title: "Resume", slug: "resume", content: {} },
    });
    const created = await request(app)
      .post("/api/v1/shares")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({ documentId: document.id, snapshot: {}, noExpiry: true });
    expect(created.status).toBe(201);

    const list = () =>
      request(app)
        .get(`/api/v1/shares/documents/${document.id}`)
        .set("Origin", STUDIO_ORIGIN)
        .set("Cookie", user.cookie);

    expect((await list()).body.data.items[0].viewCount).toBe(0);

    await ShareService.recordShareView(created.body.data.id, "203.0.113.9", "test-agent");
    await ShareService.flushShareViews();

    expect((await list()).body.data.items[0].viewCount).toBe(1);
  });
});
