import { randomBytes } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

// The mail transport is the one thing replaced: the auth hooks, templates and mail services above
// it are real, so a transport that never answers shows exactly what a hung SMTP/Resend call does.
vi.mock("#services/mail/transporter", () => ({ sendMail }));

import { app } from "#app";
import { APIError } from "better-auth/api";

import { auth } from "#auth/index";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { renderPortfolioUpdatedEmail, renderWelcomeEmail } from "#mail/index";
import { escapeUrlAttribute } from "#mail/shared/layout";
import { AffiliateService } from "#services/affiliate/index";
import { ShareService } from "#services/shareService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

const HOOK_BUDGET_MS = 500;

/** Resolves to "done" if `work` settles inside the budget, otherwise "timed out". */
async function settlesWithin(work: Promise<unknown>, ms = HOOK_BUDGET_MS) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<"timed out">((resolve) => {
    timer = setTimeout(() => resolve("timed out"), ms);
  });
  try {
    return await Promise.race([work.then(() => "done" as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hooks = (auth.options as any).databaseHooks;

afterEach(() => {
  sendMail.mockReset();
});

describe("welcome and login-alert mail never hold up sign-in (V-047 / V-099)", () => {
  it("user.create.after completes while the welcome mail transport hangs", async () => {
    sendMail.mockReturnValue(new Promise(() => {}));

    const outcome = await settlesWithin(
      hooks.user.create.after({ id: "u1", email: "new@example.test", name: "New User" }),
    );

    expect(outcome).toBe("done");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("session.create.after completes while the login-alert transport hangs", async () => {
    sendMail.mockReturnValue(new Promise(() => {}));
    const user = await prisma.user.create({
      data: {
        email: `old-${randomBytes(4).toString("hex")}@example.test`,
        name: "Returning",
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const outcome = await settlesWithin(
      hooks.session.create.after({
        id: "s1",
        userId: user.id,
        token: "t",
        createdAt: new Date(),
        ipAddress: "203.0.113.9",
        userAgent: "integration-suite",
      }),
    );

    expect(outcome).toBe("done");
    // The alert was still attempted (after the metric), just not awaited by the hook.
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
  });

  it("a failing welcome mail is logged at warn and never rejects the hook", async () => {
    const warn = vi.spyOn(logger, "warn");
    sendMail.mockRejectedValue(new Error("smtp down"));

    await expect(
      hooks.user.create.after({ id: "u2", email: "x@example.test", name: "X" }),
    ).resolves.toBeUndefined();

    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("welcome"),
        expect.objectContaining({ error: expect.any(Error) }),
      ),
    );
  });
});

describe("structured logger (V-159)", () => {
  it("serialises an Error nested in the meta with message, stack and cause in production", () => {
    const written: string[] = [];
    const write = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      written.push(String(chunk));
      return true;
    });

    try {
      vi.stubEnv("NODE_ENV", "production");
      const error = new Error("x", { cause: new Error("root cause") });
      logger.error("nested", { action: "AUDIT", error, plain: { a: 1 } });
    } finally {
      vi.unstubAllEnvs();
      write.mockRestore();
    }

    const line = JSON.parse(written.join(""));
    expect(line.data.action).toBe("AUDIT");
    expect(line.data.plain).toEqual({ a: 1 });
    expect(line.data.error.name).toBe("Error");
    expect(line.data.error.message).toBe("x");
    expect(line.data.error.stack).toContain("Error: x");
    expect(line.data.error.cause.message).toBe("root cause");
  });
});

describe("mail templates", () => {
  it("keeps `/` intact inside href attributes", () => {
    const welcome = renderWelcomeEmail("Jane", "https://studio.veriworkly.com/dashboard");
    expect(welcome).toContain('href="https://studio.veriworkly.com/dashboard"');

    const portfolio = renderPortfolioUpdatedEmail("https://veriworkly.com/p/jane");
    expect(portfolio).toContain('href="https://veriworkly.com/p/jane"');
  });

  it("replaces non-http(s) URLs with # and escapes attribute breakers", () => {
    expect(escapeUrlAttribute("javascript:alert(1)")).toBe("#");
    expect(escapeUrlAttribute("JavaScript:alert(1)")).toBe("#");
    expect(escapeUrlAttribute("data:text/html;base64,PHNjcmlwdD4=")).toBe("#");
    expect(escapeUrlAttribute(" https://x.test")).toBe("#");
    expect(escapeUrlAttribute('https://x.test/a?b=1&c="><script>')).toBe(
      "https://x.test/a?b=1&amp;c=&quot;&gt;&lt;script&gt;",
    );
    expect(renderWelcomeEmail("Jane", "javascript:alert(1)")).toContain('href="#"');
  });
});

describe("password-protected share before verify (V-150)", () => {
  it("returns only what the password screen needs, and the title after verify", async () => {
    const suffix = Array.from(randomBytes(6), (b) => String.fromCharCode(97 + (b % 26))).join("");
    const user = await createUserWithSession({ username: `owner${suffix}` });
    const slug = `resume-${suffix}`;
    const document = await prisma.document.create({
      // Shared documents are UNLISTED (sharing through the API unlists them, V-171).
      data: { userId: user.id, title: "Secret Title", slug, content: {}, visibility: "UNLISTED" },
    });
    await prisma.shareLink.create({
      data: {
        userId: user.id,
        documentId: document.id,
        slug,
        snapshot: { basics: { name: "Owner" } },
        passwordHash: await ShareService.hashPassword("pw-123456"),
      },
    });

    const path = `/api/v1/shares/public/owner${suffix}/${slug}`;
    const gated = await request(app).get(path).set("Origin", STUDIO_ORIGIN);

    expect(gated.status).toBe(200);
    expect(gated.body.data.passwordRequired).toBe(true);
    expect(gated.body.data).not.toHaveProperty("resumeTitle");
    expect(gated.body.data).not.toHaveProperty("documentTitle");
    expect(gated.body.data).not.toHaveProperty("snapshot");
    expect(JSON.stringify(gated.body)).not.toContain("Secret Title");

    const unlocked = await request(app)
      .post(`${path}/verify`)
      .set("Origin", STUDIO_ORIGIN)
      .send({ password: "pw-123456" });
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.documentTitle).toBe("Secret Title");
  });
});

describe("/affiliates/click (V-153 / V-015)", () => {
  async function enrolledCode() {
    const user = await createUserWithSession();
    const response = await request(app)
      .post("/api/v1/affiliates/enroll")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie)
      .send({});
    expect(response.status).toBe(200);
    return { userId: user.id, code: response.body.data.affiliateCode as string };
  }

  const click = (code: string) =>
    request(app).post("/api/v1/affiliates/click").set("Origin", STUDIO_ORIGIN).send({ code });

  it("answers an unknown code with 200 and records nothing", async () => {
    const before = await prisma.affiliateClick.count();
    const response = await click("0000000000");

    expect(response.status).toBe(200);
    expect(await prisma.affiliateClick.count()).toBe(before);
  });

  it("answers a known code with the same body as an unknown one", async () => {
    const { code } = await enrolledCode();
    const known = await click(code);
    const unknown = await click("ffffffffff");

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it("records one row for 10 clicks from one address within a minute", async () => {
    const { userId, code } = await enrolledCode();

    for (let i = 0; i < 10; i += 1) expect((await click(code)).status).toBe(200);

    expect(await prisma.affiliateClick.count({ where: { affiliateId: userId } })).toBe(1);
  });

  it("dedupes IPv6 clicks on the /64 prefix, not the full address", async () => {
    const { userId, code } = await enrolledCode();
    const count = () => prisma.affiliateClick.count({ where: { affiliateId: userId } });

    await AffiliateService.trackClick(code, undefined, { ip: "2001:db8:1:2::1" });
    await AffiliateService.trackClick(code, undefined, { ip: "2001:db8:1:2:ffff:0:0:9" });
    expect(await count()).toBe(1);

    await AffiliateService.trackClick(code, undefined, { ip: "2001:db8:1:3::1" });
    expect(await count()).toBe(2);
  });
});

describe("auth store outage during session lookup (V-093)", () => {
  function failSessionLookup() {
    return vi
      .spyOn(auth.api, "getSession")
      .mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
  }

  it("authMiddleware answers 503, not 401", async () => {
    const user = await createUserWithSession();
    failSessionLookup();

    const response = await request(app)
      .get("/api/v1/affiliates/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(503);
    expect(response.body.message).toBe("Authentication is temporarily unavailable");
  });

  it("flexibleAuth answers 503 for a whitelisted-origin request and a headerless one", async () => {
    const user = await createUserWithSession();
    failSessionLookup();

    const browser = await request(app)
      .get("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(browser.status).toBe(503);

    const serverSide = await request(app).get("/api/v1/users/me").set("Cookie", user.cookie);
    expect(serverSide.status).toBe(503);
  });

  it("adminAuth answers 503", async () => {
    const admin = await createUserWithSession({ email: "admin@example.test" });
    failSessionLookup();

    const response = await request(app)
      .get("/api/v1/admin/overview")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", admin.cookie);

    expect(response.status).toBe(503);
  });

  it("an APIError 5xx from getSession is 503", async () => {
    const user = await createUserWithSession();
    vi.spyOn(auth.api, "getSession").mockRejectedValue(new APIError("INTERNAL_SERVER_ERROR"));

    const response = await request(app)
      .get("/api/v1/affiliates/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(503);
  });

  it("an APIError UNAUTHORIZED from getSession is still 401", async () => {
    const user = await createUserWithSession();
    vi.spyOn(auth.api, "getSession").mockRejectedValue(new APIError("UNAUTHORIZED"));

    const response = await request(app)
      .get("/api/v1/affiliates/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(401);
  });

  it("a validly signed cookie for a deleted session reads a public flexibleAuth route anonymously", async () => {
    const user = await createUserWithSession();
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const response = await request(app)
      .get("/api/v1/users/someoneelse/availability")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(response.status).toBe(200);
  });

  it("a genuinely invalid session is still 401", async () => {
    const response = await request(app)
      .get("/api/v1/affiliates/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", "veriworkly-auth.session_token=nope");

    expect(response.status).toBe(401);
  });
});
