import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

// Only the transport is replaced: the decision mail is asserted on what would reach Resend/SMTP.
vi.mock("#services/mail/transporter", () => ({ sendMail }));

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

let adminPromise: Promise<TestUser> | undefined;
const admin = () => (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));

async function pendingApplication() {
  const user = await createUserWithSession({ name: "Asha Rao" });
  const application = await prisma.ambassadorApplication.create({
    data: {
      userId: user.id,
      collegeName: "Example College",
      graduationYear: "2027",
      whyJoin: "To help classmates write better resumes.",
      superpower: "Explaining things",
      funFact: "Has read every Discworld novel",
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { ambassadorStatus: "PENDING" } });
  return { user, application };
}

async function review(applicationId: string, action: "APPROVE" | "REJECT", reviewNote?: string) {
  return request(app)
    .patch(`/api/v1/admin/ambassadors/${applicationId}`)
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", (await admin()).cookie)
    .send({ action, ...(reviewNote ? { reviewNote } : {}) });
}

type SentMail = { to: string; subject: string; text: string; html: string };
const mailsTo = (email: string) =>
  sendMail.mock.calls.map(([mail]) => mail as SentMail).filter((mail) => mail.to === email);

describe("ambassador decision emails (V-181)", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
  });

  it("an approval mails the applicant once, and a repeat review is a 409 with no second mail", async () => {
    const { user, application } = await pendingApplication();

    const approved = await review(application.id, "APPROVE");
    expect(approved.status).toBe(200);

    // Sent off the request path.
    await vi.waitFor(() => expect(mailsTo(user.email)).toHaveLength(1));
    const mails = mailsTo(user.email);
    expect(mails[0]!.subject).toMatch(/approved/i);
    expect(mails[0]!.text).toContain("Asha");
    expect(mails[0]!.text).toContain("http://localhost:3001/ambassador");

    const again = await review(application.id, "APPROVE");
    expect(again.status).toBe(409);
    expect(mailsTo(user.email)).toHaveLength(1);
  });

  it("a rejection mails the applicant with the reviewer's note, escaped in the HTML", async () => {
    const { user, application } = await pendingApplication();

    const rejected = await review(application.id, "REJECT", "Apply again with <b>your campus</b>");
    expect(rejected.status).toBe(200);

    await vi.waitFor(() => expect(mailsTo(user.email)).toHaveLength(1));
    const mails = mailsTo(user.email);
    expect(mails[0]!.subject).not.toMatch(/approved/i);
    expect(mails[0]!.text).toContain("Apply again with <b>your campus</b>");
    expect(mails[0]!.html).toContain("Apply again with &lt;b&gt;your campus&lt;/b&gt;");
  });

  it("two concurrent reviews of one application decide once and mail once", async () => {
    const { user, application } = await pendingApplication();

    const results = await Promise.all([
      review(application.id, "APPROVE"),
      review(application.id, "REJECT"),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    await vi.waitFor(() => expect(mailsTo(user.email)).toHaveLength(1));

    // V-403: `waitFor(toHaveLength(1))` passes the moment the first mail lands, so it cannot see
    // a second one. The stored decision, the account status and the one mail must all be the
    // winner's, and no mail for the losing action may follow.
    const approvedWon = results[0]!.status === 200;
    const stored = await prisma.ambassadorApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.status).toBe(approvedWon ? "APPROVED" : "REJECTED");
    expect(account.ambassadorStatus).toBe(approvedWon ? "APPROVED" : "REJECTED");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mails = mailsTo(user.email);
    expect(mails).toHaveLength(1);
    if (approvedWon) expect(mails[0]!.subject).toMatch(/approved/i);
    else expect(mails[0]!.subject).not.toMatch(/approved/i);
  });

  it("commits the decision, the role change and the audit entry together (V-074)", async () => {
    const { user, application } = await pendingApplication();

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "audit_blocked_for_test" CHECK (false) NOT VALID`,
    );
    let blocked;
    try {
      blocked = await review(application.id, "APPROVE", "Strong application");
    } finally {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "AdminAuditEntry" DROP CONSTRAINT "audit_blocked_for_test"`,
      );
    }
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(
      (await prisma.ambassadorApplication.findUniqueOrThrow({ where: { id: application.id } }))
        .status,
    ).toBe("PENDING");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");
    expect(mailsTo(user.email)).toHaveLength(0);

    const approved = await review(application.id, "APPROVE", "Strong application");
    expect(approved.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe(
      "AMBASSADOR",
    );
    const audits = await prisma.adminAuditEntry.findMany({
      where: { targetId: application.id, action: "ambassador.application.approve" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.metadata).toMatchObject({ userId: user.id, status: "APPROVED" });
  });

  it("a failed send does not undo the decision", async () => {
    const { application } = await pendingApplication();
    sendMail.mockRejectedValueOnce(new Error("SMTP down"));

    const approved = await review(application.id, "APPROVE");
    expect(approved.status).toBe(200);
    const row = await prisma.ambassadorApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(row.status).toBe("APPROVED");
  });
});
