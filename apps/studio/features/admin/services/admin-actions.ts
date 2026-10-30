import { fetchApiData } from "@/utils/fetchApiData";

import type {
  AffiliateTier,
  Role,
  AdminApiKeyRow,
  AdminAmbassadorRow,
  AdminCommissionRow,
  AdminDocumentRow,
  AdminEntitlementRow,
  AdminPaginatedResponse,
  AdminPortfolioRow,
  AdminReferralRow,
  AdminSubscriptionRow,
  AdminUserRow,
  AdminWithdrawalRow,
} from "@/features/admin/types/admin-types";

/**
 * Client-side admin mutations.
 *
 * Every write takes a required `reason` (V-081): the server writes it to `AdminAuditEntry`, and
 * its validator takes 3–500 characters once trimmed. Keeping the parameter required here means
 * a caller cannot forget it and discover the 400 at runtime. On a withdrawal and an ambassador
 * review the reason is internal, kept apart from the `payoutNote`/`reviewNote` the affiliate or
 * applicant reads.
 *
 * The three irreversible deletes also send `confirm` (V-082), the identifier the admin retyped:
 * a portfolio's subdomain, a share link's slug, an API key's prefix. The server compares it,
 * exactly after trimming, with the record as it is now, and answers a mismatch with 400
 * `details.code: "CONFIRMATION_MISMATCH"`.
 */

/** A record id inside a request path; an id with `/` or `?` must not change the route. */
const segment = encodeURIComponent;

function adminRequest<T>(path: string, method: string, body?: unknown) {
  return fetchApiData<T>(`/admin${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/* ── Users ────────────────────────────────────────────────────────────────────────── */

export interface AdminUserUpdatePayload {
  name?: string | null;
  username?: string | null;
  role?: Role;
  emailVerified?: boolean;
  autoSyncEnabled?: boolean;
  reason: string;
}

/** The email of the account a pasted user id names, for a confirmation to show. */
export async function fetchAdminAccountEmail(id: string) {
  const detail = await adminRequest<{ user: { email: string } }>(`/users/${segment(id)}`, "GET");
  return detail.user.email;
}

export function updateAdminUser(id: string, payload: AdminUserUpdatePayload) {
  return adminRequest<AdminUserRow>(`/users/${segment(id)}`, "PATCH", payload);
}

export function revokeAdminUserSessions(id: string, reason: string) {
  return adminRequest<{ revoked: number }>(`/users/${segment(id)}/revoke-sessions`, "POST", {
    reason,
  });
}

export function deleteAdminUser(id: string, confirmEmail: string, reason: string) {
  return adminRequest<{ id: string; email: string }>(`/users/${segment(id)}`, "DELETE", {
    confirmEmail,
    reason,
  });
}

/* ── Affiliates ───────────────────────────────────────────────────────────────────── */

export function updateAdminAffiliate(
  userId: string,
  payload: {
    status?: "PENDING" | "ACTIVE" | "SUSPENDED";
    tier?: AffiliateTier;
    reason: string;
  },
) {
  return adminRequest(`/affiliates/${segment(userId)}`, "PATCH", payload);
}

/**
 * The referral behind a pasted referred-user id, so a manual commission names the affiliate it
 * pays (S-414). The referral list is searched by email, then matched on the id: a search hit on a
 * similar email, or on the affiliate side, is never taken for this account's referral.
 */
export async function fetchAdminReferrer(referredUserId: string, referredEmail: string) {
  const page = await adminRequest<AdminPaginatedResponse<AdminReferralRow>>(
    `/affiliates/referrals?query=${encodeURIComponent(referredEmail)}&limit=100`,
    "GET",
  );

  return page.items.find((item) => item.referredUser.id === referredUserId) ?? null;
}

export function createAdminCommission(payload: {
  referredUserId: string;
  providerPaymentId: string;
  purchaseAmountCents: number;
  subscriptionId?: string;
  status?: "PENDING" | "AVAILABLE";
  reason: string;
  /** ISO 4217 code of `purchaseAmountCents`; the server assumes USD. */
  currency?: string;
  /** Converting: the pending non-USD commission this USD one replaces (marked REVERSED with it). */
  convertedFromId?: string;
}) {
  return adminRequest<AdminCommissionRow>("/affiliates/commissions", "POST", payload);
}

export function updateAdminCommission(
  id: string,
  status: "AVAILABLE" | "REVERSED",
  reason: string,
) {
  return adminRequest<AdminCommissionRow>(`/affiliates/commissions/${segment(id)}`, "PATCH", {
    status,
    reason,
  });
}

/**
 * `reason` is the internal audit reason; `payoutNote` is shown to the affiliate on their payout
 * history (the payout reference, or why it was rejected). A blank note is left out.
 */
export function updateAdminWithdrawal(
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  reason: string,
  payoutNote?: string,
) {
  return adminRequest<AdminWithdrawalRow>(`/affiliates/withdrawals/${segment(id)}`, "PATCH", {
    status,
    reason,
    ...(payoutNote?.trim() ? { payoutNote: payoutNote.trim() } : {}),
  });
}

/* ── Ambassadors ──────────────────────────────────────────────────────────────────── */

/** `reason` is internal; `reviewNote` is emailed to the applicant. A blank note is left out. */
export function reviewAdminAmbassadorApplication(
  id: string,
  action: "APPROVE" | "REJECT",
  reason: string,
  reviewNote?: string,
) {
  return adminRequest<AdminAmbassadorRow>(`/ambassadors/${segment(id)}`, "PATCH", {
    action,
    reason,
    ...(reviewNote?.trim() ? { reviewNote: reviewNote.trim() } : {}),
  });
}

/* ── Portfolios ───────────────────────────────────────────────────────────────────── */

export function updateAdminPortfolioStatus(
  id: string,
  status: "LIVE" | "GRACE" | "SUSPENDED",
  reason: string,
) {
  return adminRequest<AdminPortfolioRow>(`/portfolios/${segment(id)}`, "PATCH", { status, reason });
}

/** `confirm`: the portfolio's subdomain, as the admin retyped it. */
export function unpublishAdminPortfolio(id: string, reason: string, confirm: string) {
  return adminRequest<{ id: string; subdomain: string }>(`/portfolios/${segment(id)}`, "DELETE", {
    reason,
    confirm,
  });
}

/* ── Documents & share links ──────────────────────────────────────────────────────── */

export function updateAdminDocumentVisibility(
  id: string,
  visibility: "PRIVATE" | "UNLISTED",
  reason: string,
) {
  return adminRequest<AdminDocumentRow>(`/documents/${segment(id)}`, "PATCH", {
    visibility,
    reason,
  });
}

export function deleteAdminDocument(id: string, reason: string) {
  return adminRequest<AdminDocumentRow>(`/documents/${segment(id)}`, "DELETE", { reason });
}

export function restoreAdminDocument(id: string, reason: string) {
  return adminRequest<AdminDocumentRow>(`/documents/${segment(id)}/restore`, "POST", { reason });
}

/** `confirm`: the share link's slug, as the admin retyped it. */
export function revokeAdminShareLink(id: string, reason: string, confirm: string) {
  return adminRequest<{ id: string; slug: string }>(`/share-links/${segment(id)}`, "DELETE", {
    reason,
    confirm,
  });
}

/* ── Billing ──────────────────────────────────────────────────────────────────────── */

export function updateAdminSubscription(
  id: string,
  payload: {
    status?: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
    graceEndsAt?: string | null;
    reason: string;
  },
) {
  return adminRequest<AdminSubscriptionRow>(
    `/billing/subscriptions/${segment(id)}`,
    "PATCH",
    payload,
  );
}

/**
 * `idempotencyKey` makes a retried submit apply once (the same key with a different amount is a
 * 409). Sent as the `Idempotency-Key` header, which the API's CORS policy allows (V-194), and in
 * the body, which the server also reads.
 */
export function adjustAdminCredits(
  userId: string,
  amount: number,
  reason: string,
  idempotencyKey: string,
  details: { kind?: AdminCreditKind; customerNote?: string } = {},
) {
  return fetchApiData("/admin/billing/credits", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ userId, amount, reason, idempotencyKey, ...details }),
  });
}

/**
 * What adjusted credits are (SV-22), as the server's `adminCreditAdjustmentSchema` takes them. The
 * kind decides expiry and whether they count as paid: goodwill never expires and is the only kind
 * that can remove credits; a restored pack expires in 90 days; a restored plan month expires with
 * the current credit month (no rollover) and is at most 1,000.
 */
export const ADMIN_CREDIT_KINDS = {
  goodwill: "Goodwill (never expires, not paid)",
  pack: "Lost credit pack (paid, expires in 90 days)",
  subscription_month: "Lost plan month (paid, expires with this credit month, max 1,000)",
} as const;

export type AdminCreditKind = keyof typeof ADMIN_CREDIT_KINDS;

/** The server's bound on `customerNote`, the line the customer reads in their credit history. */
export const ADMIN_CUSTOMER_NOTE_MAX_LENGTH = 200;

/** The grantable entitlement keys, matching the server's `ENTITLEMENT_KEYS`. */
export const ADMIN_ENTITLEMENT_KEYS = [
  "portfolio_publish",
  "ai_credits",
  "seo_controls",
  "analytics",
  "watermark_removal",
] as const;

export type AdminEntitlementKey = (typeof ADMIN_ENTITLEMENT_KEYS)[number];

/**
 * What each grant unlocks on the server (S-415). No key adds credits: AI features spend wallet
 * credits only, which the credit adjustment adds.
 */
export const ADMIN_ENTITLEMENT_LABELS: Record<AdminEntitlementKey, string> = {
  portfolio_publish: "Creator Pro portfolio access (premium templates; lifts free limits)",
  ai_credits: "AI Credits plan access (lifts free limits; adds no credits, use Credit adjustment)",
  seo_controls: "Portfolio SEO controls",
  analytics: "Portfolio analytics",
  watermark_removal: "No VeriWorkly badge on the portfolio",
};

export function grantAdminEntitlement(payload: {
  userId: string;
  key: AdminEntitlementKey;
  endsAt?: string | null;
  reason: string;
}) {
  return adminRequest<AdminEntitlementRow>("/billing/entitlements", "POST", payload);
}

export function revokeAdminEntitlement(id: string, reason: string) {
  return adminRequest<AdminEntitlementRow>(`/billing/entitlements/${segment(id)}`, "DELETE", {
    reason,
  });
}

export function replayAdminWebhook(id: string, reason: string) {
  return adminRequest<{ id: string; providerEventId: string; duplicate: boolean }>(
    `/billing/webhooks/${segment(id)}/replay`,
    "POST",
    { reason },
  );
}

/* ── API keys ─────────────────────────────────────────────────────────────────────── */

export function updateAdminApiKey(
  id: string,
  payload: { isActive?: boolean; rateLimit?: number; reason: string },
) {
  return adminRequest<AdminApiKeyRow>(`/api-keys/${segment(id)}`, "PATCH", payload);
}

/** `confirm`: the key's prefix, as the admin retyped it. */
export function revokeAdminApiKey(id: string, reason: string, confirm: string) {
  return adminRequest<AdminApiKeyRow>(`/api-keys/${segment(id)}`, "DELETE", { reason, confirm });
}

/* ── System ───────────────────────────────────────────────────────────────────────── */

/**
 * Starts a sync and returns at once (202): the sync runs in the background. A 409 means one is
 * already running, a 503 that syncing is unavailable; both carry the server's message.
 */
export function triggerAdminGithubSync(reason: string, force = false) {
  return adminRequest<{ status: "started"; statusUrl: string }>("/system/github/sync", "POST", {
    reason,
    force,
  });
}

/** Whether a GitHub sync is still running; poll this after starting one. */
export async function fetchAdminGithubSyncRunning() {
  const status = await adminRequest<{ running: boolean }>("/system/github", "GET");
  return status.running;
}

export type AdminCachePrefix =
  "portfolio:public" | "user:profile" | "affiliate" | "credits" | "changelog" | "roadmap";

export function flushAdminCache(prefix: AdminCachePrefix, reason: string) {
  return adminRequest<{ prefix: string; targets: string[] }>("/system/cache/flush", "POST", {
    prefix,
    reason,
  });
}
