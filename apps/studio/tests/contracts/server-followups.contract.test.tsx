import { readFile } from "node:fs/promises";
import path from "node:path";

import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The studio's side of the server changes of 2026-10-28: SV-29 (V-081/V-082 admin reasons and
 * confirmations), V-421 (share downloads), V-422 (paged document list, see account-session),
 * SV-30..SV-37, S-361 and S-362. Response bodies are the server's own shapes, from the code named
 * in each test.
 */

// Read when `lib/constants` loads, so before any import of it.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

type DialogProps = {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  confirmPhrase?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  askReason?: boolean;
  confirmDisabled?: boolean;
  onConfirm: (reason: string, attemptKey: string, confirmation: string) => Promise<unknown>;
};

// Every confirmation dialog a render creates, so a test can read its props and run its action.
const dialogs = vi.hoisted(() => [] as DialogProps[]);

vi.mock("@/components/admin/AdminActionDialog", () => ({
  default: (props: DialogProps) => {
    dialogs.push(props);
    return createElement(
      "div",
      null,
      createElement("button", null, props.trigger),
      createElement("h2", null, props.title),
      createElement("p", null, props.description),
      props.children,
    );
  },
}));

const ORIGINAL_FETCH = globalThis.fetch;

type Sent = { url: string; method: string; body: Record<string, unknown> | null };

/** Answers every request with `reply` and records what was sent. */
function serve(reply: (url: string) => { status: number; body: unknown } = () => okReply({})) {
  const sent: Sent[] = [];

  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    sent.push({
      url,
      method: init.method ?? "GET",
      body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    });
    const { status, body } = reply(url);

    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return sent;
}

const okReply = (data: unknown) => ({ status: 200, body: { success: true, data } });

function render(element: ReactElement) {
  dialogs.length = 0;
  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&quot;/g, "'")
    .replace(/\s+/g, " ");
}

function dialogTitled(title: string) {
  const dialog = dialogs.find((item) => item.title === title);
  if (!dialog) throw new Error(`No dialog titled "${title}"`);
  return dialog;
}

const serverFile = (file: string) =>
  readFile(path.join(process.cwd(), "../server/src", file), "utf8");

beforeEach(() => {
  dialogs.length = 0;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("SV-29 V-081: every admin write sends its audit reason", () => {
  it("the server takes a reason of 3 to 500 trimmed characters, and so does the studio", async () => {
    expect(await serverFile("validators/admin/adminCommonValidator.ts")).toMatch(
      /adminReasonSchema = z\.string\(\)\.trim\(\)\.min\(3\)\.max\(500\)/,
    );

    const { isAdminReasonValid, ADMIN_REASON_MAX_LENGTH } =
      await import("@/components/admin/admin-reason");
    expect(ADMIN_REASON_MAX_LENGTH).toBe(500);
    expect(isAdminReasonValid("x".repeat(500), { required: true, minLength: 3 })).toBe(true);
    expect(isAdminReasonValid("x".repeat(501), { required: true, minLength: 3 })).toBe(false);
    expect(isAdminReasonValid("  ok  ", { required: true, minLength: 3 })).toBe(false);
  });

  it("no dialog for a V-081 write lets the reason be skipped", async () => {
    const affiliate = await import("@/app/admin/affiliates/AffiliateActions");
    const { default: AmbassadorReviewActions } =
      await import("@/app/admin/ambassadors/AmbassadorReviewActions");
    const { default: DeleteRoadmapButton } =
      await import("@/app/admin/roadmap/components/DeleteRoadmapButton");

    const rendered = [
      createElement(affiliate.AffiliateStandingActions, {
        userId: "u1",
        status: "ACTIVE",
        tier: "TIER_1",
        email: "ann@example.com",
      }),
      createElement(affiliate.CommissionActions, {
        id: "c1",
        status: "PENDING",
        amountCents: 500,
        currency: "USD",
        rateBps: 2000,
        referredUserId: "u9",
        providerPaymentId: "pay_1",
        subscriptionId: null,
        affiliateActive: true,
      }),
      createElement(affiliate.CommissionCreateForm),
      createElement(affiliate.WithdrawalActions, {
        id: "w1",
        status: "REQUESTED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
      createElement(affiliate.WithdrawalActions, {
        id: "w1",
        status: "APPROVED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
      createElement(AmbassadorReviewActions, {
        applicationId: "a1",
        status: "PENDING",
        applicantEmail: "ann@example.com",
      }),
      createElement(DeleteRoadmapButton, { id: "f1", title: "Dark mode" }),
    ];

    for (const element of rendered) {
      render(element);
      for (const dialog of dialogs) {
        expect(dialog.reasonRequired, dialog.title).not.toBe(false);
        expect(dialog.askReason, dialog.title).not.toBe(false);
      }
    }
  });

  it("affiliate standing, commissions and their conversion send the reason", async () => {
    const affiliate = await import("@/app/admin/affiliates/AffiliateActions");
    const sent = serve();

    render(
      createElement(affiliate.CommissionActions, {
        id: "c1",
        status: "PENDING",
        amountCents: 500,
        currency: "USD",
        rateBps: 2000,
        referredUserId: "u9",
        providerPaymentId: "pay_1",
        subscriptionId: null,
        affiliateActive: true,
      }),
    );
    await dialogTitled("Release this commission").onConfirm("Payment cleared", "k", "");
    await dialogTitled("Reverse this commission").onConfirm("Refunded in Dodo", "k", "");

    // The standing dialog sends only what changed, with the reason; a reason alone is a 400
    // ("Status or tier is required", adminAffiliateValidator.ts).
    expect(await serverFile("validators/admin/adminAffiliateValidator.ts")).toMatch(
      /\.refine\(\(value\) => value\.status \|\| value\.tier, "Status or tier is required"\)/,
    );
    const { updateAdminAffiliate } = await import("@/features/admin/services/admin-actions");
    await updateAdminAffiliate("u1", { status: "SUSPENDED", reason: "Partner deal ended" });

    expect(sent.map(({ method, body }) => [method, body])).toEqual([
      ["PATCH", { status: "AVAILABLE", reason: "Payment cleared" }],
      ["PATCH", { status: "REVERSED", reason: "Refunded in Dodo" }],
      ["PATCH", { status: "SUSPENDED", reason: "Partner deal ended" }],
    ]);
    expect(sent[0].url).toMatch(/\/admin\/affiliates\/commissions\/c1$/);
    expect(sent[2].url).toMatch(/\/admin\/affiliates\/u1$/);
  });

  it("SV-35: a withdrawal's internal reason and the note the affiliate sees are separate fields", async () => {
    const affiliate = await import("@/app/admin/affiliates/AffiliateActions");
    const sent = serve();

    const html = render(
      createElement(affiliate.WithdrawalActions, {
        id: "w1",
        status: "REQUESTED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
    );

    expect(html.match(/\(visible to the affiliate\)/g)).toHaveLength(2);
    const notes = renderToStaticMarkup(
      createElement(affiliate.WithdrawalActions, {
        id: "w1",
        status: "REQUESTED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
    ).match(/<textarea[^>]*>/g);
    // Approve's note is optional, Reject's required; both name their hint.
    expect(notes).toHaveLength(2);
    expect(notes![0]).toContain('aria-required="false"');
    expect(notes![1]).toContain('aria-required="true"');
    for (const note of notes!) {
      expect(note).toContain('aria-invalid="false"');
      expect(note).toMatch(/aria-describedby="[^"]+-hint"/);
    }
    const approve = dialogTitled("Approve this withdrawal");
    expect(approve.reasonLabel).toBe("Internal audit reason");

    // Nothing typed in the note: the reason goes alone, never as the note.
    await approve.onConfirm("Checked the referrals", "k", "");
    expect(sent[0].body).toEqual({ status: "APPROVED", reason: "Checked the referrals" });

    // A rejection and a payout reference need a note the affiliate can read.
    expect(affiliate.isPayoutNoteValid("", true)).toBe(false);
    expect(affiliate.isPayoutNoteValid("", false)).toBe(true);
    expect(affiliate.isPayoutNoteValid("ok", false)).toBe(false);
    expect(affiliate.isPayoutNoteValid("PayPal 7XK2", true)).toBe(true);
    expect(dialogTitled("Reject this withdrawal").confirmDisabled).toBe(true);
    expect(approve.confirmDisabled).toBe(false);

    const { updateAdminWithdrawal } = await import("@/features/admin/services/admin-actions");
    await updateAdminWithdrawal("w1", "PAID", "Sent by bank", "  Wise ref 3391  ");
    expect(sent[1].body).toEqual({
      status: "PAID",
      reason: "Sent by bank",
      payoutNote: "Wise ref 3391",
    });
  });

  it("an ambassador review sends the reason apart from the note the applicant reads", async () => {
    const { default: AmbassadorReviewActions } =
      await import("@/app/admin/ambassadors/AmbassadorReviewActions");
    const sent = serve();

    const html = render(
      createElement(AmbassadorReviewActions, {
        applicationId: "a1",
        status: "PENDING",
        applicantEmail: "ann@example.com",
      }),
    );

    expect(html.match(/Review note \(visible to the applicant\)/g)).toHaveLength(2);
    await dialogTitled("Approve this ambassador").onConfirm("Strong campus reach", "k", "");
    expect(sent[0].body).toEqual({ action: "APPROVE", reason: "Strong campus reach" });
    expect(dialogTitled("Reject this application").confirmDisabled).toBe(true);
  });

  it("roadmap create, update and delete send the reason; the form asks for it", async () => {
    const sent = serve(() => okReply({ id: "f1" }));
    const { createRoadmapFeature, updateRoadmapFeature, deleteRoadmapFeature } =
      await import("@/features/roadmap/services/admin-roadmap");

    await createRoadmapFeature({ title: "T", description: "D", status: "todo" }, "Planned");
    await updateRoadmapFeature("f1", { title: "T2" }, "Renamed");
    await deleteRoadmapFeature("f1", "Dropped");

    expect(sent.map(({ method, body }) => [method, body])).toEqual([
      ["POST", { title: "T", description: "D", status: "todo", reason: "Planned" }],
      // Never the reason alone: the server answers that with 400.
      ["PUT", { title: "T2", reason: "Renamed" }],
      ["DELETE", { reason: "Dropped" }],
    ]);

    const { default: RoadmapFeatureForm } =
      await import("@/app/admin/roadmap/components/RoadmapFeatureForm");
    const form = renderToStaticMarkup(createElement(RoadmapFeatureForm, { mode: "create" }));
    const input = form.match(/<input[^>]*id="auditReason"[^>]*>/)?.[0] ?? "";
    expect(input).toMatch(/maxLength="500"/i);
    expect(input).toContain('aria-required="true"');
    expect(input).toContain('aria-describedby="auditReason-hint"');
    expect(form).toMatch(/id="auditReason-hint"[^>]*>At least 3 characters/);
    // Save stays enabled, so submitting without a reason explains why instead of doing nothing.
    expect(form).not.toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
});

describe("SV-29 V-082: destructive admin deletes send the retyped identifier", () => {
  it("the server compares confirm with the subdomain, slug and key prefix", async () => {
    expect(await serverFile("services/admin/adminPortfolioService.ts")).toMatch(
      /assertConfirmation\(confirm, publication\.subdomain/,
    );
    expect(await serverFile("services/admin/adminDocumentService.ts")).toMatch(
      /assertConfirmation\(confirm, share\.slug/,
    );
    expect(await serverFile("services/admin/adminApiKeyService.ts")).toMatch(
      /assertConfirmation\(confirm, existing\.keyPrefix/,
    );
  });

  it("each revoke dialog asks for that identifier and sends what was typed", async () => {
    const { default: ShareLinkActions } = await import("@/app/admin/share-links/ShareLinkActions");
    const { default: ApiKeyActions } = await import("@/app/admin/api-keys/ApiKeyActions");
    const { default: PortfolioModerationActions } =
      await import("@/app/admin/portfolios/PortfolioModerationActions");
    const sent = serve();

    render(createElement(ShareLinkActions, { id: "s1", slug: "jane-cv" }));
    const share = dialogTitled("Revoke this share link");
    expect(share.confirmPhrase).toBe("jane-cv");
    await share.onConfirm("Reported as spam", "k", "jane-cv");

    render(
      createElement(ApiKeyActions, {
        id: "k1",
        name: "CI",
        keyPrefix: "vw_3fa9c",
        isActive: true,
        revoked: false,
      }),
    );
    const key = dialogTitled("Revoke this API key permanently");
    expect(key.confirmPhrase).toBe("vw_3fa9c");
    await key.onConfirm("Key leaked in a repo", "k", "vw_3fa9c");

    render(
      createElement(PortfolioModerationActions, {
        publicationId: "p1",
        subdomain: "jane",
        status: "LIVE",
        templateId: "signal",
      }),
    );
    const portfolio = dialogTitled("Take this portfolio down permanently");
    expect(portfolio.confirmPhrase).toBe("jane");
    await portfolio.onConfirm("Impersonation report", "k", "jane");

    expect(
      sent.map(({ url, method, body }) => [url.replace(/^.*\/admin/, ""), method, body]),
    ).toEqual([
      ["/share-links/s1", "DELETE", { reason: "Reported as spam", confirm: "jane-cv" }],
      ["/api-keys/k1", "DELETE", { reason: "Key leaked in a repo", confirm: "vw_3fa9c" }],
      ["/portfolios/p1", "DELETE", { reason: "Impersonation report", confirm: "jane" }],
    ]);
  });

  it("CONFIRMATION_MISMATCH and CONFIRMATION_REQUIRED clear the typed value and say why", async () => {
    expect(await serverFile("services/admin/adminConfirmation.ts")).toContain(
      'code: "CONFIRMATION_MISMATCH"',
    );

    const { describeAdminActionError } = await import("@/components/admin/admin-reason");
    const { revokeAdminShareLink } = await import("@/features/admin/services/admin-actions");

    const failure = async (body: unknown) => {
      serve(() => ({ status: 400, body }));
      return revokeAdminShareLink("s1", "Reported as spam", "jane-cv").catch((error) => error);
    };

    // `assertConfirmation` in adminConfirmation.ts.
    const mismatch = describeAdminActionError(
      await failure({
        success: false,
        message: "The confirmation does not match this share link's slug.",
        details: { code: "CONFIRMATION_MISMATCH", field: "confirm" },
      }),
    );
    expect(mismatch.clearConfirmation).toBe(true);
    expect(mismatch.message).toMatch(
      /^The confirmation does not match this share link's slug\. It may have changed since this page loaded/,
    );

    // The server's "require" step answers a missing confirm this way.
    const required = describeAdminActionError(
      await failure({
        success: false,
        message: "Type the share link's slug to confirm.",
        details: { code: "CONFIRMATION_REQUIRED", field: "confirm" },
      }),
    );
    expect(required.clearConfirmation).toBe(true);
    expect(required.message).toMatch(/Type the identifier shown for this record to confirm/);

    const other = describeAdminActionError(
      await failure({ success: false, message: "Share link not found." }),
    );
    expect(other).toEqual({ message: "Share link not found.", clearConfirmation: false });
  });
});

describe("SV-34: moderation answers the studio must show as they are", () => {
  it("a lift over an owner unpublish or a billing suspension says the site stays offline", async () => {
    const { liftOutcomeNotice } = await import("@/app/admin/portfolios/PortfolioModerationActions");
    // `updatePublicationStatus` restores `reasonBeforeModeration` and answers SUSPENDED.
    expect(await serverFile("services/admin/adminPortfolioService.ts")).toMatch(
      /status: "SUSPENDED" as const,\s*suspensionReason: restoredReason/,
    );

    expect(
      liftOutcomeNotice("LIVE", { status: "SUSPENDED", suspensionReason: "user_unpublished" }),
    ).toMatch(/owner had unpublished this portfolio before it, so it stays offline/);
    expect(
      liftOutcomeNotice("GRACE", { status: "SUSPENDED", suspensionReason: "PAST_DUE" }),
    ).toMatch(/billing had suspended this portfolio before it.*free tier.*within the hour/);
    expect(liftOutcomeNotice("LIVE", { status: "LIVE", suspensionReason: null })).toBeNull();
    expect(
      liftOutcomeNotice("SUSPENDED", { status: "SUSPENDED", suspensionReason: "moderation:spam" }),
    ).toBeNull();
  });

  // The notice itself is rendered in the browser suite (admin-console.test.ts, SV-34).
  it("a lift hands back the status the server answered, not the one asked for", async () => {
    const sent = serve(() =>
      okReply({ id: "p1", subdomain: "jane", status: "SUSPENDED", suspensionReason: "INACTIVE" }),
    );

    const { updateAdminPortfolioStatus } = await import("@/features/admin/services/admin-actions");
    const result = await updateAdminPortfolioStatus("p1", "LIVE", "Appeal accepted");
    expect(result.status).toBe("SUSPENDED");
    expect(sent[0].body).toEqual({ status: "LIVE", reason: "Appeal accepted" });
  });

  it("a refused unlisting and a paused new share link carry the server's own words", async () => {
    const { updateAdminDocumentVisibility } =
      await import("@/features/admin/services/admin-actions");
    serve(() => ({
      status: 409,
      body: { success: false, message: "The owner made this document private." },
    }));
    await expect(updateAdminDocumentVisibility("d1", "UNLISTED", "Appeal")).rejects.toThrow(
      "The owner made this document private.",
    );

    const paused =
      "A moderator made one of your résumés or cover letters private, so new share links are paused until a moderator lifts it.";
    serve(() => ({ status: 403, body: { success: false, message: paused } }));
    const { createShareLink } = await import("@/features/documents/services/share-service");
    await expect(
      createShareLink({
        id: "d1",
        type: "RESUME",
        title: "CV",
        templateId: "modern",
        content: {},
        updatedAt: "2026-10-28T00:00:00.000Z",
      } as never),
    ).rejects.toThrow(paused);
  });
});

describe("SV-30: the audit log reads targetDeleted", () => {
  it("a trashed document opens with deleted ones shown; a server-known target beats the action name", async () => {
    const { adminAuditTargetHref, adminAuditTargetState } =
      await import("@/components/admin/AdminAuditList");
    // `withTargetState` in adminAuditService.ts.
    expect(await serverFile("services/admin/adminAuditService.ts")).toMatch(
      /targetDeleted: !row \|\| row\.deleted/,
    );

    const trashed = {
      action: "document.delete",
      targetType: "Document",
      targetId: "d/1",
      targetExists: true,
      targetDeleted: true,
    };
    expect(adminAuditTargetHref(trashed)).toBe("/admin/documents?query=d%2F1&includeDeleted=true");
    expect(adminAuditTargetState(trashed)).toBe("In the trash");

    // Unpublished, but the publication row and its page are still there.
    expect(
      adminAuditTargetHref({
        action: "portfolio.unpublish",
        targetType: "PortfolioPublication",
        targetId: "p1",
        targetExists: true,
        targetDeleted: false,
      }),
    ).toBe("/admin/portfolios/p1");

    const gone = {
      action: "user.role.change",
      targetType: "User",
      targetId: "u1",
      targetExists: false,
      targetDeleted: true,
    };
    expect(adminAuditTargetHref(gone)).toBeNull();
    expect(adminAuditTargetState(gone)).toBe("Deleted");
  });
});

describe("V-421: a share link can hide its download buttons", () => {
  const document = {
    id: "d1",
    type: "RESUME",
    title: "CV",
    templateId: "modern",
    content: {},
    updatedAt: "2026-10-28T00:00:00.000Z",
  } as never;

  it("the save sends allowDownload only when the owner changed it", async () => {
    const { createShareLink } = await import("@/features/documents/services/share-service");
    const { shareDownloadPayload } = await import("@/components/modals/ShareDocumentModal");
    // The create response is the stored row, `allowDownload` included (shareController.create).
    const sent = serve(() => ({
      status: 201,
      body: {
        success: true,
        data: { id: "s1", slug: "cv", expiresAt: null, allowDownload: false, hasPassword: false },
      },
    }));

    expect(shareDownloadPayload(null)).toEqual({});
    expect(shareDownloadPayload(false)).toEqual({ allowDownload: false });

    const created = await createShareLink(document, shareDownloadPayload(false));
    await createShareLink(document, shareDownloadPayload(null));

    expect(created.allowDownload).toBe(false);
    expect(sent[0].body).toMatchObject({ allowDownload: false });
    expect(sent[1].body).not.toHaveProperty("allowDownload");
    expect(await serverFile("validators/shareValidator.ts")).toMatch(
      /allowDownload: z\.boolean\(\)\.optional\(\)/,
    );
  });

  it("reads the setting from the owner's list and the public page; absent means on", async () => {
    const { shareAllowsDownload } = await import("@/features/documents/services/share-service");
    expect(await serverFile("controllers/shareController.ts")).toMatch(
      /allowDownload: shareLink\.allowDownload \?\? true/,
    );

    expect(shareAllowsDownload({ allowDownload: false })).toBe(false);
    expect(shareAllowsDownload({ allowDownload: true })).toBe(true);
    expect(shareAllowsDownload({})).toBe(true);
    expect(shareAllowsDownload(undefined)).toBe(true);
  });

  it("the switch says honestly what hiding the buttons does", async () => {
    const { shareDownloadHint } = await import("@/components/modals/ShareDocumentModal");

    expect(shareDownloadHint(false)).toBe(
      "Hides the download buttons; viewers can still save or print the page.",
    );
    expect(shareDownloadHint(true)).not.toMatch(/protect|prevent|block/i);
  });
});

describe("SV-37: an expired link", () => {
  it("an unlock answered 410 is the expired state, not a wrong password", async () => {
    const { isShareLinkExpiredError, verifyShareLinkByUsernameAndSlug } =
      await import("@/features/documents/services/share-service");
    serve(() => ({ status: 410, body: { success: false, message: "Link expired" } }));

    const error = await verifyShareLinkByUsernameAndSlug("jane", "cv", "pw").catch((e) => e);
    expect(isShareLinkExpiredError(error)).toBe(true);
    // The page showing it is driven in the browser suite (share-page.test.ts, SV-37).
  });

  it("the expiry comment states the server's rule, not 'missing means never'", async () => {
    const source = await readFile(
      path.join(process.cwd(), "features/documents/services/share-expiry.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/reads a missing date as "never"/);
    expect(source).toMatch(/a new link lasts 7 days/);
  });
});

describe("SV-31: what an affiliate can withdraw", () => {
  // `buildDashboard` in services/affiliate/dashboard.ts.
  const dashboard = {
    affiliateStatus: "ACTIVE",
    affiliateTier: "TIER_1",
    affiliateCode: "ANN",
    clicks: 4,
    conversions: 2,
    wallet: { pendingCents: 0, availableCents: 9000, paidCents: 0, clawbackCents: 2500 },
    withdrawableCents: 6500,
    minimumWithdrawalCents: 5000,
    tierProgress: { currentConversions: 2, nextTierConversions: 10 },
    tiers: [
      { key: "TIER_1", name: "Starter", rateBps: 2000, requiredConversions: 0, perks: [] },
      { key: "TIER_2", name: "Pro", rateBps: 2500, requiredConversions: 10, perks: [] },
    ],
    totalReferrals: 2,
    referrals: [],
    commissions: [],
    withdrawals: [
      {
        id: "w1",
        amountCents: 5000,
        currency: "USD",
        status: "PAID",
        payoutNote: "Wise ref 3391",
        reviewedAt: "2026-10-20T00:00:00.000Z",
        paidAt: "2026-10-21T00:00:00.000Z",
        createdAt: "2026-10-19T00:00:00.000Z",
      },
    ],
  };

  it("the payout form is capped at withdrawableCents, not the available balance", async () => {
    expect(await serverFile("services/affiliate/dashboard.ts")).toMatch(
      /withdrawableCents: Math\.max/,
    );
    const { withdrawableCents } = await import("@/features/affiliate/types");

    expect(withdrawableCents(dashboard as never)).toBe(6500);
    // A dashboard cached before the field: available less the claw-back.
    expect(withdrawableCents({ ...dashboard, withdrawableCents: undefined } as never)).toBe(6500);

    const { AffiliatePayoutForm } = await import("@/features/affiliate/AffiliatePayoutForm");
    const html = renderToStaticMarkup(
      createElement(AffiliatePayoutForm, { withdrawableCents: 6500, minimumCents: 5000 }),
    );
    expect(html).toMatch(/max="65"/);

    const { AffiliatePage } = await import("@/features/affiliate/AffiliatePage");
    expect(render(createElement(AffiliatePage, { dashboard: dashboard as never }))).toMatch(
      /\$65\.00 withdrawable: the rest repays a refunded commission/,
    );
  });

  it("an approval refused for an outstanding claw-back shows the server's message", async () => {
    const message = (await serverFile("services/affiliate/wallet.ts")).match(
      /"(This affiliate owes a claw-back[^"]+)"/,
    )?.[1];
    expect(message).toBeTruthy();

    const affiliate = await import("@/app/admin/affiliates/AffiliateActions");
    serve(() => ({
      status: 409,
      body: {
        success: false,
        message,
        details: { code: "AFFILIATE_CLAWBACK_OUTSTANDING", clawbackCents: 2500 },
      },
    }));
    render(
      createElement(affiliate.WithdrawalActions, {
        id: "w1",
        status: "REQUESTED",
        amountCents: 5000,
        currency: "USD",
        email: "ann@example.com",
      }),
    );

    const failure = await dialogTitled("Approve this withdrawal")
      .onConfirm("Checked", "k", "")
      .catch((error) => error);
    const { describeAdminActionError } = await import("@/components/admin/admin-reason");
    expect(describeAdminActionError(failure).message).toBe(message);
  });
});

describe("SV-33: an AI route cut off by a server restart", () => {
  it("says when to try again, from Retry-After, and offers no credits", async () => {
    expect(await serverFile("services/ats/aiDeadline.ts")).toMatch(/code: "SERVER_RESTARTING"/);
    const { fetchApiData } = await import("@/utils/fetchApiData");
    const { describePaidActionError } = await import("@/features/credits/credit-errors");
    const { describeAtsError } = await import("@/features/ats/ats-api");

    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            message: "The server is restarting. Try again in a few seconds.",
            details: { code: "SERVER_RESTARTING", retryAfterSeconds: 5 },
          }),
          { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "7" } },
        ),
    ) as unknown as typeof fetch;

    const error = await fetchApiData("/ai/generate", { method: "POST", body: "{}" }).catch(
      (cause) => cause,
    );

    expect((error as { retryAfterSeconds?: number }).retryAfterSeconds).toBe(7);
    expect(describePaidActionError(error, "AI generation failed.")).toEqual({
      message: "The server is restarting; try again in 7 seconds. Nothing was charged.",
      buyCredits: false,
    });
    expect(describeAtsError(error, "ATS scan failed.").message).toMatch(
      /^The server is restarting; try again in 7 seconds/,
    );
  });

  it("falls back to the body's retryAfterSeconds", async () => {
    const { ApiRequestError, parseRetryAfter } = await import("@/utils/fetchApiData");
    const { serverRestartingMessage } = await import("@/features/credits/credit-errors");

    expect(parseRetryAfter("5")).toBe(5);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(
      serverRestartingMessage(
        new ApiRequestError("restarting", 503, {
          code: "SERVER_RESTARTING",
          retryAfterSeconds: 1,
        }),
      ),
    ).toBe("The server is restarting; try again in 1 second. Nothing was charged.");
    expect(serverRestartingMessage(new ApiRequestError("down", 503))).toBeNull();
  });
});

describe("SV-35 SV-36: checkout cancel and the ATS quota tier", () => {
  it("a kept credit-pack payment is reported, not dropped", async () => {
    expect(await serverFile("services/billingService.ts")).toMatch(
      /stillProcessing: packsProcessing/,
    );
    const { checkoutCancelNotice } = await import("@/features/billing/checkout-rules");

    expect(checkoutCancelNotice({ success: true, cleared: ["ai_credits"] })).toBeNull();
    expect(
      checkoutCancelNotice({
        success: true,
        cleared: [],
        stillProcessing: ["1,200 extra credits"],
      }),
    ).toMatch(/^Your payment for 1,200 extra credits is still being processed, so it was kept/);
  });

  it("a cancel refused mid 3-D Secure says what to do and that it clears within the hour", async () => {
    const service = await serverFile("services/billingService.ts");
    expect(service).toMatch(/const CUSTOMER_STEP_HOLD_MS = 60 \* 60 \* 1000/);
    const refusal =
      "A payment for AI Credits is still being processed. Wait for the confirmation before starting another checkout.";
    expect(service).toContain("is still being processed. Wait for the confirmation");

    const { cancelCheckout } = await import("@/features/billing/billing-api");
    const { describeCheckoutCancelError } = await import("@/features/billing/checkout-rules");
    const refusedWith = async (body: unknown) => {
      serve(() => ({ status: 409, body }));
      return describeCheckoutCancelError(
        await cancelCheckout().catch((error) => error),
        "Could not cancel.",
      );
    };

    // The server's step 3 names it; the message is unchanged.
    const coded = await refusedWith({
      success: false,
      message: refusal,
      details: { code: "CHECKOUT_STILL_PROCESSING" },
    });
    // A server from before the code: matched on the message.
    const uncoded = await refusedWith({ success: false, message: refusal });

    for (const message of [coded, uncoded]) {
      expect(message).toMatch(/^A payment for AI Credits is still being processed\./);
      expect(message).toMatch(/3-D Secure/);
      expect(message).toMatch(/released within an hour/);
    }

    // The code wins over the wording, and another 409 keeps the server's words.
    expect(
      await refusedWith({
        success: false,
        message: "Wait for your bank.",
        details: { code: "CHECKOUT_STILL_PROCESSING" },
      }),
    ).toMatch(/^Wait for your bank\. If your bank asked you to confirm/);
    expect(
      await refusedWith({
        success: false,
        message: "A checkout is still being prepared. Try again in a moment.",
      }),
    ).toBe("A checkout is still being prepared. Try again in a moment.");
  });

  it("the ATS quota tier lists every value the server sends", async () => {
    const union = (source: string) =>
      source
        .match(/tier: ("[a-z]+"(?: \| "[a-z]+")*);/)?.[1]
        .split(" | ")
        .sort();
    const studio = await readFile(path.join(process.cwd(), "features/ats/types.ts"), "utf8");

    expect(union(studio)).toEqual(union(await serverFile("services/ats/types.ts")));
    expect(union(studio)).toContain('"paused"');
  });
});

describe("S-361: deleting an account with an affiliate balance", () => {
  // `affiliateForfeitError` in services/userService.ts.
  const forfeitReply = {
    status: 409,
    body: {
      success: false,
      message:
        "You have 42.50 USD in unpaid affiliate commissions. Deleting your account forfeits it. Confirm to delete anyway.",
      details: {
        code: "AFFILIATE_BALANCE_FORFEIT",
        amountCents: 4250,
        currency: "USD",
        availableCents: 3000,
        pendingCents: 1250,
      },
    },
  };

  it("reads the amount from the 409 and confirms exactly that amount", async () => {
    expect(await serverFile("services/userService.ts")).toMatch(
      /code: "AFFILIATE_BALANCE_FORFEIT", \.\.\.forfeit/,
    );
    const { affiliateForfeitFrom, deleteAccount } =
      await import("@/features/profile/services/update-profile");

    const sent = serve(() => forfeitReply);
    const refusal = await deleteAccount().catch((error) => error);
    const forfeit = affiliateForfeitFrom(refusal);

    expect(sent[0]).toMatchObject({ method: "DELETE", body: null });
    expect(forfeit).toEqual({
      amountCents: 4250,
      currency: "USD",
      availableCents: 3000,
      pendingCents: 1250,
    });

    const confirmed = serve(() => okReply({ deleted: true }));
    await deleteAccount({ confirmedForfeitCents: forfeit!.amountCents });

    expect(confirmed[0]).toMatchObject({
      method: "DELETE",
      body: { confirmAffiliateForfeit: true, confirmedAffiliateForfeitCents: 4250 },
    });
    expect(await serverFile("controllers/userController.ts")).toMatch(
      /body\.confirmAffiliateForfeit === true/,
    );
  });

  it("the modal shows the forfeited amount and confirms it on the next delete", async () => {
    const source = await readFile(
      path.join(process.cwd(), "features/profile/components/DeleteAccountModal.tsx"),
      "utf8",
    );

    expect(source).toMatch(/const owed = affiliateForfeitFrom\(err\);/);
    expect(source).toMatch(
      /deleteAccount\(forfeit \? \{ confirmedForfeitCents: forfeit\.amountCents \} : \{\}\)/,
    );
    expect(source).toMatch(
      /in unpaid affiliate\s+commissions\. Deleting your account forfeits it\./,
    );
    expect(source).toMatch(
      /Forfeit \$\{formatCents\(forfeit\.amountCents, forfeit\.currency\)\} and delete/,
    );
  });
});

describe("S-362: what the username is used for", () => {
  it("names share links only; there is no public profile or portfolio link by username", async () => {
    const source = await readFile(
      path.join(process.cwd(), "features/profile/components/UsernameLockedModal.tsx"),
      "utf8",
    );
    const routes = await serverFile("routes/shares.ts");

    expect(routes).toContain('"/public/:username/:slug"');
    expect(source).not.toMatch(/portfolio links|public profile/i);
    expect(source).toMatch(/share link/);
  });
});
