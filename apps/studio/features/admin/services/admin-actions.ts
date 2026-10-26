import { fetchApiData } from "@/utils/fetchApiData";

import type {
  AffiliateTier,
  Role,
  AdminApiKeyRow,
  AdminAmbassadorRow,
  AdminCommissionRow,
  AdminDocumentRow,
  AdminEntitlementRow,
  AdminPortfolioRow,
  AdminSubscriptionRow,
  AdminUserRow,
  AdminWithdrawalRow,
} from "@/features/admin/types/admin-types";

/**
 * Client-side admin mutations.
 *
 * Most of these take a required `reason`: the server writes it to `AdminAuditEntry`, and the
 * matching validator rejects anything shorter than three characters. Keeping the parameter
 * required here means a caller cannot forget it and discover the 400 at runtime. The affiliate
 * and ambassador reviews take an optional one, which may be blank but not shorter than three.
 */

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
  const detail = await adminRequest<{ user: { email: string } }>(
    `/users/${encodeURIComponent(id)}`,
    "GET",
  );
  return detail.user.email;
}

export function updateAdminUser(id: string, payload: AdminUserUpdatePayload) {
  return adminRequest<AdminUserRow>(`/users/${id}`, "PATCH", payload);
}

export function revokeAdminUserSessions(id: string, reason: string) {
  return adminRequest<{ revoked: number }>(`/users/${id}/revoke-sessions`, "POST", { reason });
}

export function deleteAdminUser(id: string, confirmEmail: string, reason: string) {
  return adminRequest<{ id: string; email: string }>(`/users/${id}`, "DELETE", {
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
    reason?: string;
  },
) {
  return adminRequest(`/affiliates/${userId}`, "PATCH", payload);
}

export function createAdminCommission(payload: {
  referredUserId: string;
  providerPaymentId: string;
  purchaseAmountCents: number;
  subscriptionId?: string;
  status?: "PENDING" | "AVAILABLE";
  reason?: string;
}) {
  return adminRequest<AdminCommissionRow>("/affiliates/commissions", "POST", payload);
}

export function updateAdminCommission(
  id: string,
  status: "AVAILABLE" | "REVERSED",
  reason?: string,
) {
  return adminRequest<AdminCommissionRow>(`/affiliates/commissions/${id}`, "PATCH", {
    status,
    reason,
  });
}

export function updateAdminWithdrawal(
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  payoutNote?: string,
) {
  return adminRequest<AdminWithdrawalRow>(`/affiliates/withdrawals/${id}`, "PATCH", {
    status,
    payoutNote,
  });
}

/* ── Ambassadors ──────────────────────────────────────────────────────────────────── */

export function reviewAdminAmbassadorApplication(
  id: string,
  action: "APPROVE" | "REJECT",
  reviewNote?: string,
) {
  return adminRequest<AdminAmbassadorRow>(`/ambassadors/${id}`, "PATCH", { action, reviewNote });
}

/* ── Portfolios ───────────────────────────────────────────────────────────────────── */

export function updateAdminPortfolioStatus(
  id: string,
  status: "LIVE" | "GRACE" | "SUSPENDED",
  reason: string,
) {
  return adminRequest<AdminPortfolioRow>(`/portfolios/${id}`, "PATCH", { status, reason });
}

export function unpublishAdminPortfolio(id: string, reason: string) {
  return adminRequest<{ id: string; subdomain: string }>(`/portfolios/${id}`, "DELETE", { reason });
}

/* ── Documents & share links ──────────────────────────────────────────────────────── */

export function updateAdminDocumentVisibility(
  id: string,
  visibility: "PRIVATE" | "UNLISTED",
  reason: string,
) {
  return adminRequest<AdminDocumentRow>(`/documents/${id}`, "PATCH", { visibility, reason });
}

export function deleteAdminDocument(id: string, reason: string) {
  return adminRequest<AdminDocumentRow>(`/documents/${id}`, "DELETE", { reason });
}

export function restoreAdminDocument(id: string, reason: string) {
  return adminRequest<AdminDocumentRow>(`/documents/${id}/restore`, "POST", { reason });
}

export function revokeAdminShareLink(id: string, reason: string) {
  return adminRequest<{ id: string; slug: string }>(`/share-links/${id}`, "DELETE", { reason });
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
  return adminRequest<AdminSubscriptionRow>(`/billing/subscriptions/${id}`, "PATCH", payload);
}

/**
 * `idempotencyKey` makes a retried submit apply once (the same key with a different amount is a
 * 409). It goes in the body, not the `Idempotency-Key` header, because the API's CORS policy does
 * not allow that header from the browser.
 */
export function adjustAdminCredits(
  userId: string,
  amount: number,
  reason: string,
  idempotencyKey: string,
) {
  return adminRequest("/billing/credits", "POST", { userId, amount, reason, idempotencyKey });
}

/** The grantable entitlement keys, matching the server's `ENTITLEMENT_KEYS`. */
export const ADMIN_ENTITLEMENT_KEYS = [
  "portfolio_publish",
  "ai_credits",
  "seo_controls",
  "analytics",
  "watermark_removal",
] as const;

export type AdminEntitlementKey = (typeof ADMIN_ENTITLEMENT_KEYS)[number];

export function grantAdminEntitlement(payload: {
  userId: string;
  key: AdminEntitlementKey;
  endsAt?: string | null;
  reason: string;
}) {
  return adminRequest<AdminEntitlementRow>("/billing/entitlements", "POST", payload);
}

export function revokeAdminEntitlement(id: string, reason: string) {
  return adminRequest<AdminEntitlementRow>(`/billing/entitlements/${id}`, "DELETE", { reason });
}

export function replayAdminWebhook(id: string, reason: string) {
  return adminRequest<{ id: string; providerEventId: string; duplicate: boolean }>(
    `/billing/webhooks/${id}/replay`,
    "POST",
    { reason },
  );
}

/* ── API keys ─────────────────────────────────────────────────────────────────────── */

export function updateAdminApiKey(
  id: string,
  payload: { isActive?: boolean; rateLimit?: number; reason: string },
) {
  return adminRequest<AdminApiKeyRow>(`/api-keys/${id}`, "PATCH", payload);
}

export function revokeAdminApiKey(id: string, reason: string) {
  return adminRequest<AdminApiKeyRow>(`/api-keys/${id}`, "DELETE", { reason });
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

/* ── Roadmap & changelog ──────────────────────────────────────────────────────────── */
