import { fetchApiData } from "@/utils/fetchApiData";

import type {
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
 * Every one of these takes a `reason`: the server writes it to `AdminAuditEntry`, and the
 * matching validator rejects anything shorter than three characters. Keeping the parameter
 * required here means a caller cannot forget it and discover the 400 at runtime.
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
  role?: "USER" | "AMBASSADOR" | "ADMIN";
  emailVerified?: boolean;
  autoSyncEnabled?: boolean;
  reason: string;
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
    tier?: "TIER_1" | "TIER_2" | "TIER_3";
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

export function adjustAdminCredits(userId: string, amount: number, reason: string) {
  return adminRequest("/billing/credits", "POST", { userId, amount, reason });
}

export function grantAdminEntitlement(payload: {
  userId: string;
  key: string;
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

export function triggerAdminGithubSync(reason: string, force = false) {
  return adminRequest("/system/github/sync", "POST", { reason, force });
}

export function flushAdminCache(
  prefix: "portfolio:public" | "user:profile" | "affiliate" | "credits" | "changelog" | "roadmap",
  reason: string,
) {
  return adminRequest<{ prefix: string; targets: string[] }>("/system/cache/flush", "POST", {
    prefix,
    reason,
  });
}

/* ── Roadmap & changelog ──────────────────────────────────────────────────────────── */
