import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyRetention,
  PURGED_DOCUMENT_CONTENT,
  readRetentionSettings,
  type RetentionSettings,
} from "#jobs/retentionJob";
import { pool, prisma } from "#lib/prisma";
import { beginDrain, resetShutdownSignalForTests } from "#lib/shutdown";
import {
  ADMIN_AUDIT_ACTIONS,
  MONEY_AUDIT_ACTION_PREFIXES,
} from "#services/admin/adminAuditService";
import { restoreDocument as adminRestoreDocument } from "#services/admin/adminDocumentService";

import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-116: the retention job against a real Postgres. Every rule gets one row just past its window
 * and one just inside it (an hour either side), and only the old one may change.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const now = new Date();

/** `days` before now, nudged an hour older ("old") or younger ("fresh") than the cutoff. */
const at = (days: number, side: "old" | "fresh") =>
  new Date(now.getTime() - days * DAY_MS + (side === "old" ? -HOUR_MS : HOUR_MS));

const DEFAULTS = readRetentionSettings({});

const disabled: RetentionSettings = Object.fromEntries(
  Object.keys(DEFAULTS).map((key) => [key, 0]),
) as RetentionSettings;

const only = (setting: keyof RetentionSettings, days = DEFAULTS[setting]): RetentionSettings => ({
  ...disabled,
  [setting]: days,
});

async function setTimestamp(table: string, column: string, id: string, value: Date) {
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2`,
    value,
    id,
  );
}

async function ids(table: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "${table}" ORDER BY "id"`,
  );
  return rows.map((row) => row.id);
}

beforeEach(async () => {
  // Users cascade to sessions, documents, shares, publications, views, wallets and clicks.
  await prisma.$executeRawUnsafe(
    `TRUNCATE "User", "Verification", "BillingWebhookEvent", "AuditLog", "AdminAuditEntry",
       "ViewFlushBatch", "UsageMetricFlushBatch" CASCADE`,
  );
});

describe("retention defaults", () => {
  it("match the owner's windows, and RETENTION_AUDIT_LOG_DAYS wins over the old name", () => {
    expect(DEFAULTS).toEqual({
      expiredSessions: 1,
      expiredVerifications: 1,
      webhookPayloads: 30,
      unprocessedWebhookPayloads: 180,
      auditLogs: 90,
      adminAuditEntries: 365,
      adminMoneyAuditEntries: 2555,
      creditReservations: 90,
      creditReplays: 1,
      flushBatches: 7,
      affiliateClicks: 0,
      portfolioViews: 0,
      deletedDocuments: 30,
    });
    expect(readRetentionSettings({ RETENTION_AUDIT_LOG_DAYS: "0" }).auditLogs).toBe(0);
    expect(readRetentionSettings({ RETENTION_SESSION_DAYS_TYPO: "x" }).expiredSessions).toBe(1);
  });
});

describe("retention rules (V-116)", () => {
  it("deletes expired sessions and verifications only past the 1-day grace", async () => {
    const user = await createUserWithSession();
    await prisma.session.deleteMany({});
    const [, freshSession] = await Promise.all(
      (["old", "fresh"] as const).map((side) =>
        prisma.session.create({
          data: { userId: user.id, token: randomUUID(), expiresAt: at(1, side) },
        }),
      ),
    );
    const [, freshVerification] = await Promise.all(
      (["old", "fresh"] as const).map((side) =>
        prisma.verification.create({
          data: { identifier: `id-${side}`, value: randomUUID(), expiresAt: at(1, side) },
        }),
      ),
    );

    const summary = await applyRetention({
      settings: { ...disabled, expiredSessions: 1, expiredVerifications: 1 },
      now,
    });

    expect(summary.affected).toEqual({ expiredSessions: 1, expiredVerifications: 1 });
    expect(await ids("Session")).toEqual([freshSession!.id]);
    expect(await ids("Verification")).toEqual([freshVerification!.id]);
  });

  it("redacts PROCESSED webhook payloads after 30 days, never FAILED or PROCESSING ones", async () => {
    const payload = { data: { customer: { email: "buyer@example.test" } } };
    const make = async (status: "PROCESSED" | "FAILED" | "PROCESSING", side: "old" | "fresh") => {
      const row = await prisma.billingWebhookEvent.create({
        data: {
          providerEventId: randomUUID(),
          type: "payment.succeeded",
          payload,
          status,
          error: status === "FAILED" ? "boom" : null,
        },
      });
      await setTimestamp("BillingWebhookEvent", "createdAt", row.id, at(30, side));
      return row.id;
    };
    const oldProcessed = await make("PROCESSED", "old");
    const freshProcessed = await make("PROCESSED", "fresh");
    const oldFailed = await make("FAILED", "old");
    // Still being handled, or its handler died mid-way: the payload is what a retry needs.
    const oldProcessing = await make("PROCESSING", "old");

    const first = await applyRetention({ settings: only("webhookPayloads"), now });
    const second = await applyRetention({ settings: only("webhookPayloads"), now });

    expect(first.affected).toEqual({ webhookPayloadsRedacted: 1 });
    // Already-redacted rows are not rewritten night after night.
    expect(second.affected).toEqual({ webhookPayloadsRedacted: 0 });

    const rows = await prisma.billingWebhookEvent.findMany();
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(oldProcessed)).toMatchObject({
      payload: { redacted: true, type: "payment.succeeded" },
      status: "PROCESSED",
    });
    expect(byId.get(freshProcessed)?.payload).toEqual(payload);
    expect(byId.get(oldFailed)).toMatchObject({ payload, status: "FAILED", error: "boom" });
    expect(byId.get(oldProcessing)).toMatchObject({ payload, status: "PROCESSING" });
  });

  it("V-340: redacts FAILED and stuck PROCESSING payloads after 180 days, keeping the summary columns", async () => {
    const payload = { data: { customer: { email: "buyer@example.test", name: "Buyer" } } };
    const make = async (status: "FAILED" | "PROCESSING", side: "old" | "fresh") => {
      const row = await prisma.billingWebhookEvent.create({
        data: {
          providerEventId: randomUUID(),
          type: "payment.succeeded",
          payload,
          status,
          error: status === "FAILED" ? "unknown product" : null,
          productName: "Credit pack (500)",
          amountCents: 499,
          providerPaymentId: `pay_${randomUUID()}`,
        },
      });
      await setTimestamp("BillingWebhookEvent", "createdAt", row.id, at(180, side));
      return row.id;
    };
    const oldFailed = await make("FAILED", "old");
    const oldProcessing = await make("PROCESSING", "old");
    const freshFailed = await make("FAILED", "fresh");

    const first = await applyRetention({ settings: only("unprocessedWebhookPayloads"), now });
    const second = await applyRetention({ settings: only("unprocessedWebhookPayloads"), now });

    expect(first.affected).toEqual({ unprocessedWebhookPayloadsRedacted: 2 });
    expect(second.affected).toEqual({ unprocessedWebhookPayloadsRedacted: 0 });
    const byId = new Map((await prisma.billingWebhookEvent.findMany()).map((row) => [row.id, row]));
    expect(byId.get(oldFailed)).toMatchObject({
      payload: { redacted: true, type: "payment.succeeded" },
      status: "FAILED",
      error: "unknown product",
      productName: "Credit pack (500)",
      amountCents: 499,
    });
    expect(byId.get(oldFailed)?.providerPaymentId).toMatch(/^pay_/);
    expect(byId.get(oldProcessing)?.payload).toEqual({
      redacted: true,
      type: "payment.succeeded",
    });
    expect(byId.get(freshFailed)?.payload).toEqual(payload);
  });

  it("V-342: a worker that is shutting down stops between batches and leaves the rest", async () => {
    const user = await createUserWithSession();
    await prisma.session.deleteMany({});
    for (let index = 0; index < 3; index += 1)
      await prisma.session.create({
        data: { userId: user.id, token: randomUUID(), expiresAt: at(1, "old") },
      });

    try {
      const summary = await applyRetention({
        settings: { ...disabled, expiredSessions: 1, expiredVerifications: 1 },
        batchSize: 1,
        now,
        // The drain starts while the first batch runs.
        stillOwner: async () => {
          beginDrain();
          return true;
        },
      });
      // The batch in flight finishes and the run stops there. Nothing is reported as failed; the
      // later rule is not started and is listed as incomplete with the interrupted one.
      expect(summary.affected).toEqual({ expiredSessions: 2 });
      expect(summary.incomplete).toEqual(["expiredSessions", "expiredVerifications"]);
      expect(summary.failed).toEqual([]);
      expect(summary.stoppedForShutdown).toBe(true);
    } finally {
      resetShutdownSignalForTests();
    }
    expect(await prisma.session.count()).toBe(1);
  });

  it("deletes request and admin audit rows past 90 days and 1 year", async () => {
    for (const side of ["old", "fresh"] as const) {
      await prisma.auditLog.create({
        data: {
          id: `audit-${side}`,
          method: "GET",
          path: "/x",
          status: 500,
          createdAt: at(90, side),
        },
      });
      await prisma.adminAuditEntry.create({
        data: { id: `admin-${side}`, action: "x", targetType: "user", createdAt: at(365, side) },
      });
    }

    const summary = await applyRetention({
      settings: { ...disabled, auditLogs: 90, adminAuditEntries: 365 },
      now,
    });

    expect(summary.affected).toEqual({ auditLogs: 1, adminAuditEntries: 1 });
    expect(await ids("AuditLog")).toEqual(["audit-fresh"]);
    expect(await ids("AdminAuditEntry")).toEqual(["admin-fresh"]);
  });

  /**
   * Every admin action, decided once (V-333 review): does it record money, an amount or a rate?
   * Keyed by `ADMIN_AUDIT_ACTIONS`, so a new action fails the test below until someone decides,
   * and a money action outside the 7-year class fails the retention check after it.
   */
  const RECORDS_MONEY: Record<keyof typeof ADMIN_AUDIT_ACTIONS, boolean> = {
    userUpdate: false,
    userRoleChange: false,
    userDelete: false,
    userSessionsRevoke: false,
    affiliateUpdate: true, // a tier change sets the commission rate
    affiliateCommissionCreate: true,
    affiliateCommissionUpdate: true,
    affiliateWithdrawalUpdate: true,
    affiliateBalanceForfeit: true, // the forfeited balance and its unrecovered claw-back
    ambassadorApprove: false,
    ambassadorReject: false,
    portfolioStatusChange: false,
    portfolioUnpublish: false,
    documentVisibility: false,
    documentDelete: false,
    documentRestore: false,
    shareLinkRevoke: false,
    subscriptionUpdate: true,
    creditGrant: true,
    entitlementGrant: true,
    entitlementRevoke: true,
    webhookReplay: true,
    apiKeyUpdate: false,
    apiKeyRevoke: false,
    githubSync: false,
    cacheFlush: false,
    roadmapCreate: false,
    roadmapUpdate: false,
    roadmapDelete: false,
    changelogCreate: false,
    changelogUpdate: false,
    changelogDelete: false,
    changelogSync: false,
  };

  it("classifies every admin action as money or not, and the money class matches (V-333)", () => {
    expect(Object.keys(RECORDS_MONEY).sort()).toEqual(Object.keys(ADMIN_AUDIT_ACTIONS).sort());
    for (const [key, money] of Object.entries(RECORDS_MONEY)) {
      const action = ADMIN_AUDIT_ACTIONS[key as keyof typeof ADMIN_AUDIT_ACTIONS];
      const inMoneyClass = MONEY_AUDIT_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
      expect(inMoneyClass, `${action} is ${money ? "" : "not "}a money record`).toBe(money);
    }
  });

  it("keeps every money action past 1 year and deletes it only after 7 (V-333, V-344)", async () => {
    const moneyActions = (Object.keys(RECORDS_MONEY) as Array<keyof typeof ADMIN_AUDIT_ACTIONS>)
      .filter((key) => RECORDS_MONEY[key])
      .map((key) => ADMIN_AUDIT_ACTIONS[key]);
    await prisma.adminAuditEntry.createMany({
      data: moneyActions.flatMap((action) => [
        { id: `${action}-2y`, action, targetType: "User", createdAt: at(730, "old") },
        { id: `${action}-8y`, action, targetType: "User", createdAt: at(2555, "old") },
      ]),
    });

    const yearly = await applyRetention({
      settings: { ...disabled, adminAuditEntries: 365 },
      now,
    });
    expect(yearly.affected).toEqual({ adminAuditEntries: 0 });
    expect(await prisma.adminAuditEntry.count()).toBe(moneyActions.length * 2);

    const sevenYears = await applyRetention({
      settings: { ...disabled, adminMoneyAuditEntries: 2555 },
      now,
    });
    expect(sevenYears.affected).toEqual({ adminMoneyAuditEntries: moneyActions.length });
    expect((await ids("AdminAuditEntry")).sort()).toEqual(
      moneyActions.map((action) => `${action}-2y`).sort(),
    );
  });

  it("deletes terminal credit reservations after 90 days and never touches PENDING ones", async () => {
    const days = DEFAULTS.creditReservations;
    const user = await createUserWithSession();
    const wallet = await prisma.creditWallet.create({ data: { userId: user.id } });
    const make = async (
      id: string,
      status: "PENDING" | "COMMITTED" | "RELEASED" | "EXPIRED",
      side: "old" | "fresh",
    ) => {
      await prisma.creditReservation.create({
        data: {
          id,
          walletId: wallet.id,
          userId: user.id,
          requestId: randomUUID(),
          action: "ai",
          cost: 1,
          status,
          expiresAt: at(days + 1, "old"),
        },
      });
      await setTimestamp("CreditReservation", "updatedAt", id, at(days, side));
    };
    await make("r-committed-old", "COMMITTED", "old");
    await make("r-released-old", "RELEASED", "old");
    await make("r-expired-old", "EXPIRED", "old");
    await make("r-committed-fresh", "COMMITTED", "fresh");
    await make("r-pending-old", "PENDING", "old");

    const summary = await applyRetention({ settings: only("creditReservations"), now });

    expect(summary.affected).toEqual({ creditReservations: 3 });
    expect(await ids("CreditReservation")).toEqual(["r-committed-fresh", "r-pending-old"]);
  });

  it("clears stored AI replays after a day and keeps the reservation rows (V-192)", async () => {
    const days = DEFAULTS.creditReplays;
    const user = await createUserWithSession();
    const wallet = await prisma.creditWallet.create({ data: { userId: user.id } });
    const replay = { fingerprint: "f", response: { content: "draft" } };
    for (const [id, side] of [
      ["replay-old", "old"],
      ["replay-fresh", "fresh"],
    ] as const) {
      await prisma.creditReservation.create({
        data: {
          id,
          walletId: wallet.id,
          userId: user.id,
          requestId: randomUUID(),
          action: "ai",
          cost: 1,
          status: "COMMITTED",
          expiresAt: at(days + 1, "old"),
          replay,
        },
      });
      await setTimestamp("CreditReservation", "updatedAt", id, at(days, side));
    }

    const summary = await applyRetention({ settings: only("creditReplays"), now });

    expect(summary.affected).toEqual({ creditReplays: 1 });
    const rows = await prisma.creditReservation.findMany({
      select: { id: true, replay: true },
      orderBy: { id: "asc" },
    });
    expect(rows).toEqual([
      { id: "replay-fresh", replay },
      { id: "replay-old", replay: null },
    ]);
  });

  it("deletes flush markers past 7 days, affiliate clicks and portfolio views past 180", async () => {
    const affiliate = await createUserWithSession();
    const document = await prisma.document.create({
      data: { userId: affiliate.id, type: "PORTFOLIO", title: "Site", slug: "site", content: {} },
    });
    const publication = await prisma.portfolioPublication.create({
      data: {
        userId: affiliate.id,
        documentId: document.id,
        subdomain: `site${randomUUID().slice(0, 8)}`,
        templateId: "signal",
        snapshot: {},
      },
    });

    for (const side of ["old", "fresh"] as const) {
      await prisma.viewFlushBatch.create({
        data: { id: `v-${side}`, kind: "share", createdAt: at(7, side) },
      });
      await prisma.usageMetricFlushBatch.create({
        data: { id: `u-${side}`, date: at(30, "old"), createdAt: at(7, side) },
      });
      await prisma.affiliateClick.create({
        data: { id: `c-${side}`, affiliateId: affiliate.id, code: "abc", createdAt: at(180, side) },
      });
      await prisma.portfolioViewDaily.create({
        data: { id: `p-${side}`, publicationId: publication.id, date: at(180, side), count: 3 },
      });
    }

    const summary = await applyRetention({
      settings: { ...disabled, flushBatches: 7, affiliateClicks: 180, portfolioViews: 180 },
      now,
    });

    expect(summary.affected).toEqual({
      viewFlushBatches: 1,
      usageMetricFlushBatches: 1,
      affiliateClicks: 1,
      portfolioViews: 1,
    });
    expect(await ids("ViewFlushBatch")).toEqual(["v-fresh"]);
    expect(await ids("UsageMetricFlushBatch")).toEqual(["u-fresh"]);
    expect(await ids("AffiliateClick")).toEqual(["c-fresh"]);
    expect(await ids("PortfolioViewDaily")).toEqual(["p-fresh"]);
  });

  it("replaces soft-deleted content with the purge marker after 30 days, keeping rows and shares", async () => {
    const user = await createUserWithSession();
    const content = { basics: { name: "Ada" } };
    const make = (id: string, deletedAt: Date | null, body: object = content) =>
      prisma.document.create({
        data: { id, userId: user.id, title: id, slug: id, content: body, deletedAt },
      });
    await make("d-old", at(30, "old"));
    await make("d-old-shared", at(30, "old"));
    // A document that was empty when deleted is purged too: emptiness is not the marker.
    await make("d-old-empty", at(30, "old"), {});
    await make("d-fresh", at(30, "fresh"));
    await make("d-live", null);
    await prisma.shareLink.create({
      data: { userId: user.id, documentId: "d-old-shared", slug: "shared", snapshot: content },
    });
    const before = await prisma.document.findUniqueOrThrow({ where: { id: "d-old" } });

    const summary = await applyRetention({ settings: only("deletedDocuments"), now });
    const second = await applyRetention({ settings: only("deletedDocuments"), now });

    expect(summary.affected).toEqual({
      deletedDocumentsPurged: 3,
      deletedShareSnapshotsPurged: 1,
      deletedPublicationSnapshotsPurged: 0,
      deletedDocumentAuditTitlesPurged: 0,
    });
    // Rows already carrying the marker are skipped.
    expect(second.affected).toEqual({
      deletedDocumentsPurged: 0,
      deletedShareSnapshotsPurged: 0,
      deletedPublicationSnapshotsPurged: 0,
      deletedDocumentAuditTitlesPurged: 0,
    });
    const docs = new Map((await prisma.document.findMany()).map((doc) => [doc.id, doc]));
    expect(docs.size).toBe(5);
    expect(docs.get("d-old")?.content).toEqual(PURGED_DOCUMENT_CONTENT);
    expect(docs.get("d-old")?.deletedAt).toEqual(before.deletedAt);
    // The sync cursor is updatedAt; a purge must not surface the row as an edit.
    expect(docs.get("d-old")?.updatedAt).toEqual(before.updatedAt);
    expect(docs.get("d-old-shared")?.content).toEqual(PURGED_DOCUMENT_CONTENT);
    expect(docs.get("d-old-empty")?.content).toEqual(PURGED_DOCUMENT_CONTENT);
    expect(docs.get("d-fresh")?.content).toEqual(content);
    expect(docs.get("d-live")?.content).toEqual(content);
    expect(await prisma.shareLink.count({ where: { documentId: "d-old-shared" } })).toBe(1);
  });

  it("also blanks title, slug, metadata, tags and every share and publication snapshot (V-206)", async () => {
    const user = await createUserWithSession();
    const content = { basics: { name: "Ada Lovelace", email: "ada@example.test" } };
    const make = (id: string, deletedAt: Date | null, extra: object = {}) =>
      prisma.document.create({
        data: {
          id,
          userId: user.id,
          type: "PORTFOLIO",
          title: `Ada Lovelace CV ${id}`,
          slug: `ada-lovelace-cv-${id}`,
          tags: ["engineering", "london"],
          metadata: { favourite: true, note: "for Babbage & Co" },
          content,
          deletedAt,
          ...extra,
        },
      });
    await make("old", at(30, "old"));
    await make("fresh", at(30, "fresh"));
    // Purged before this rule existed: content carries the marker, the rest survived.
    await make("legacy", at(400, "old"), { content: PURGED_DOCUMENT_CONTENT });
    for (const id of ["old", "fresh", "legacy"])
      await prisma.shareLink.create({
        data: { userId: user.id, documentId: id, slug: `ada-lovelace-cv-${id}`, snapshot: content },
      });
    await prisma.portfolioPublication.create({
      data: {
        userId: user.id,
        documentId: "old",
        subdomain: "ada",
        templateId: "signal",
        snapshot: { profile: content },
        status: "SUSPENDED",
        suspensionReason: "user_unpublished",
      },
    });

    const summary = await applyRetention({ settings: only("deletedDocuments"), now });
    const second = await applyRetention({ settings: only("deletedDocuments"), now });

    expect(summary.affected).toEqual({
      deletedDocumentsPurged: 2,
      deletedShareSnapshotsPurged: 2,
      deletedPublicationSnapshotsPurged: 1,
      deletedDocumentAuditTitlesPurged: 0,
    });
    expect(second.affected).toEqual({
      deletedDocumentsPurged: 0,
      deletedShareSnapshotsPurged: 0,
      deletedPublicationSnapshotsPurged: 0,
      deletedDocumentAuditTitlesPurged: 0,
    });

    for (const id of ["old", "legacy"]) {
      const doc = await prisma.document.findUniqueOrThrow({ where: { id } });
      expect(doc).toMatchObject({
        title: "",
        slug: id,
        tags: [],
        metadata: null,
        content: PURGED_DOCUMENT_CONTENT,
      });
      const share = await prisma.shareLink.findFirstOrThrow({ where: { documentId: id } });
      expect(share.snapshot).toEqual(PURGED_DOCUMENT_CONTENT);
      expect(share.slug).toBe(share.id);
    }
    const publication = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { documentId: "old" },
    });
    expect(publication.snapshot).toEqual(PURGED_DOCUMENT_CONTENT);

    // Inside the window nothing changes.
    const fresh = await prisma.document.findUniqueOrThrow({ where: { id: "fresh" } });
    expect(fresh.title).toBe("Ada Lovelace CV fresh");
    expect(fresh.content).toEqual(content);
    const freshShare = await prisma.shareLink.findFirstOrThrow({ where: { documentId: "fresh" } });
    expect(freshShare.snapshot).toEqual(content);
  });

  it("removes the title and slug older audit entries recorded about a purged document", async () => {
    const user = await createUserWithSession();
    const make = (id: string, deletedAt: Date) =>
      prisma.document.create({
        data: {
          id,
          userId: user.id,
          title: `Title ${id}`,
          slug: `slug-${id}`,
          content: {},
          deletedAt,
        },
      });
    await make("audit-old", at(30, "old"));
    await make("audit-fresh", at(30, "fresh"));
    await prisma.adminAuditEntry.createMany({
      data: [
        {
          id: "e-delete",
          action: "document.delete",
          targetType: "Document",
          targetId: "audit-old",
          metadata: { ownerId: user.id, title: "Title audit-old" },
        },
        {
          id: "e-revoke",
          action: "share_link.revoke",
          targetType: "ShareLink",
          targetId: "gone",
          metadata: { documentId: "audit-old", slug: "slug-audit-old" },
        },
        {
          id: "e-fresh",
          action: "document.delete",
          targetType: "Document",
          targetId: "audit-fresh",
          metadata: { ownerId: user.id, title: "Title audit-fresh" },
        },
      ],
    });

    const summary = await applyRetention({ settings: only("deletedDocuments"), now });

    expect(summary.affected.deletedDocumentAuditTitlesPurged).toBe(2);
    const metadata = async (id: string) =>
      (await prisma.adminAuditEntry.findUniqueOrThrow({ where: { id } })).metadata;
    expect(await metadata("e-delete")).toEqual({ ownerId: user.id });
    expect(await metadata("e-revoke")).toEqual({ documentId: "audit-old" });
    expect(await metadata("e-fresh")).toEqual({ ownerId: user.id, title: "Title audit-fresh" });
  });

  it("does nothing for a rule whose setting is 0", async () => {
    await prisma.auditLog.create({
      data: { method: "GET", path: "/x", status: 500, createdAt: at(1_000, "old") },
    });

    const summary = await applyRetention({ settings: disabled, now });

    expect(summary).toEqual({ affected: {}, incomplete: [], failed: [] });
    expect(await prisma.auditLog.count()).toBe(1);
  });

  it("drains a backlog larger than one batch within a run", async () => {
    await prisma.auditLog.createMany({
      data: Array.from({ length: 7 }, () => ({
        method: "GET",
        path: "/x",
        status: 500,
        createdAt: at(90, "old"),
      })),
    });

    const summary = await applyRetention({ settings: only("auditLogs"), batchSize: 2, now });

    expect(summary).toEqual({ affected: { auditLogs: 7 }, incomplete: [], failed: [] });
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("stops at the time budget after one batch per rule and the next run continues", async () => {
    await prisma.auditLog.createMany({
      data: Array.from({ length: 5 }, () => ({
        method: "GET",
        path: "/x",
        status: 500,
        createdAt: at(90, "old"),
      })),
    });
    await prisma.adminAuditEntry.create({
      data: { action: "x", targetType: "user", createdAt: at(365, "old") },
    });
    const settings = { ...disabled, auditLogs: 90, adminAuditEntries: 365 };

    const first = await applyRetention({ settings, batchSize: 2, budgetMs: 0, now });

    // The spent budget does not starve the rule after it.
    expect(first).toEqual({
      affected: { auditLogs: 2, adminAuditEntries: 1 },
      incomplete: ["auditLogs"],
      failed: [],
    });
    expect(await prisma.auditLog.count()).toBe(3);

    await applyRetention({ settings, batchSize: 2, budgetMs: 0, now });
    await applyRetention({ settings, batchSize: 2, budgetMs: 0, now });
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("stops between batches once the job lock is lost", async () => {
    await prisma.auditLog.createMany({
      data: Array.from({ length: 5 }, () => ({
        method: "GET",
        path: "/x",
        status: 500,
        createdAt: at(90, "old"),
      })),
    });

    const summary = await applyRetention({
      settings: only("auditLogs"),
      batchSize: 2,
      stillOwner: async () => false,
      now,
    });

    expect(summary).toEqual({ affected: { auditLogs: 2 }, incomplete: ["auditLogs"], failed: [] });
  });
});

describe("restoring a purged document", () => {
  it("refuses a document the retention job blanked, but restores one inside the window", async () => {
    const user = await createUserWithSession();
    const content = { basics: { name: "Ada" } };
    const make = (id: string, deletedAt: Date) =>
      prisma.document.create({
        data: { id, userId: user.id, title: id, slug: id, content, deletedAt },
      });
    await make("r-old", at(30, "old"));
    await make("r-fresh", at(30, "fresh"));
    await applyRetention({ settings: only("deletedDocuments"), now });

    await expect(adminRestoreDocument("r-old")).rejects.toMatchObject({
      statusCode: 410,
      message: expect.stringMatching(/permanently removed/),
    });
    const stillDeleted = await prisma.document.findUniqueOrThrow({ where: { id: "r-old" } });
    expect(stillDeleted.deletedAt).not.toBeNull();

    await adminRestoreDocument("r-fresh");
    const restored = await prisma.document.findUniqueOrThrow({ where: { id: "r-fresh" } });
    expect(restored.deletedAt).toBeNull();
    expect(restored.content).toEqual(content);
  });

  it("restores a document that was legitimately empty, however long ago it was deleted", async () => {
    const user = await createUserWithSession();
    await prisma.document.create({
      data: {
        id: "empty",
        userId: user.id,
        title: "e",
        slug: "e",
        content: {},
        deletedAt: at(400, "old"),
      },
    });

    await adminRestoreDocument("empty");
    const restored = await prisma.document.findUniqueOrThrow({ where: { id: "empty" } });

    expect(restored.deletedAt).toBeNull();
    expect(restored.content).toEqual({});
  });

  describe("with the window changed after the purge", () => {
    it.each(["0", "3650"])("still refuses a purged document (setting %s)", async (setting) => {
      const user = await createUserWithSession();
      await prisma.document.create({
        data: {
          id: "purged",
          userId: user.id,
          title: "p",
          slug: "p",
          content: { a: 1 },
          deletedAt: at(30, "old"),
        },
      });
      await applyRetention({ settings: only("deletedDocuments"), now });

      vi.stubEnv("RETENTION_DELETED_DOCUMENT_DAYS", setting);

      await expect(adminRestoreDocument("purged")).rejects.toMatchObject({ statusCode: 410 });
      const row = await prisma.document.findUniqueOrThrow({ where: { id: "purged" } });
      expect(row.deletedAt).not.toBeNull();
    });
  });
});

describe("purge and restore racing each other", () => {
  const makeDeleted = async (id: string) => {
    const user = await createUserWithSession();
    await prisma.document.create({
      data: {
        id,
        userId: user.id,
        title: id,
        slug: id,
        content: { basics: { name: "Ada" } },
        deletedAt: at(30, "old"),
      },
    });
    return user;
  };

  it("the purge skips a row restored after its id was selected", async () => {
    await makeDeleted("raced");
    // A restore holds the row, uncommitted: the purge's subselect still sees it deleted, and its
    // UPDATE has to wait for the row lock.
    const restorer = await pool.connect();
    try {
      await restorer.query("BEGIN");
      await restorer.query(`UPDATE "Document" SET "deletedAt" = NULL WHERE "id" = 'raced'`);

      const purge = applyRetention({ settings: only("deletedDocuments"), now });
      await vi.waitFor(
        async () => {
          const waiting = await prisma.$queryRaw<Array<{ n: number }>>`
            SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE wait_event_type = 'Lock' AND query LIKE '%UPDATE "Document" SET "content"%'`;
          expect(waiting[0].n).toBe(1);
        },
        { timeout: 5_000, interval: 25 },
      );

      await restorer.query("COMMIT");
      const summary = await purge;

      expect(summary.affected).toMatchObject({ deletedDocumentsPurged: 0 });
    } finally {
      restorer.release();
    }

    const row = await prisma.document.findUniqueOrThrow({ where: { id: "raced" } });
    expect(row.deletedAt).toBeNull();
    expect(row.content).toEqual({ basics: { name: "Ada" } });
  });

  it("an admin restore refuses (410) a document purged after it was read", async () => {
    await makeDeleted("late-purge-admin");
    const findUnique = prisma.document.findUnique.bind(prisma.document);
    vi.spyOn(prisma.document, "findUnique").mockImplementationOnce((async (args: never) => {
      const read = await findUnique(args);
      await applyRetention({ settings: only("deletedDocuments"), now });
      return read;
    }) as never);

    await expect(adminRestoreDocument("late-purge-admin")).rejects.toMatchObject({
      statusCode: 410,
    });
    const row = await prisma.document.findUniqueOrThrow({ where: { id: "late-purge-admin" } });
    expect(row.deletedAt).not.toBeNull();
  });
});
