import "server-only";

import { cache } from "react";
import { notFound, redirect, unstable_rethrow } from "next/navigation";

import { SESSION_EXPIRED_PATH } from "@/lib/auth-redirect";
import { hasSessionCookie, serverFetch } from "@/lib/server-fetch";
import { fetchCurrentUser } from "@/features/auth/services/current-user";

import type { RoadmapFeature, RoadmapStatus } from "@/features/roadmap/services/roadmap-backend";
import type { ApiSuccessResponse } from "@/utils/fetchApiData";

import type {
  AdminActionQueue,
  AdminAffiliateRow,
  AdminAffiliateSummary,
  AdminAmbassadorRosterRow,
  AdminAmbassadorRow,
  AdminAmbassadorSummary,
  AdminApiKeyRow,
  AdminApiKeySummary,
  AdminAuditEntry,
  AdminAuditFilters,
  AdminBillingSummary,
  AdminCommissionRow,
  AdminCreditWalletRow,
  AdminDocumentRow,
  AdminDocumentSummary,
  AdminEntitlementRow,
  AdminGithubStatus,
  AdminJobStatus,
  AdminOverview,
  AdminPaginatedResponse,
  AdminPortfolioDetail,
  AdminPortfolioRow,
  AdminPortfolioSummary,
  AdminRecentActivity,
  AdminReferralRow,
  AdminRequestLogPage,
  AdminShareLinkRow,
  AdminSubscriptionRow,
  AdminSystemHealth,
  AdminTimeSeries,
  AdminUsageMetrics,
  AdminUserDetail,
  AdminUserRef,
  AdminUserRow,
  AdminWebhookRow,
  AdminWithdrawalRow,
} from "@/features/admin/types/admin-types";

/**
 * Frontend defense-in-depth for `/admin/*`: fails closed (404, not a leaky 403) if the
 * signed-in user isn't the configured admin. This must never be the ONLY check — the
 * backend's `adminAuthMiddleware` remains the authoritative gate on every admin API
 * route — but without this, any authenticated user could reach the admin shell UI even
 * if every fetch call inside it then failed. `ADMIN_EMAIL` here is a server-only env
 * var (never `NEXT_PUBLIC_*`), so the admin identity never reaches the client bundle.
 *
 * Wrapped in `cache()` so the layout and every admin read in one request share a single
 * session lookup. Each read awaits it first, so a page's own fetches cannot start before the
 * gate has passed: layouts and pages render in parallel, and a client navigation inside
 * `/admin` does not re-run the layout at all.
 *
 * A session cookie the API rejected (an expired admin session) goes to sign in again, as the
 * studio does, instead of a 404 that reads as "the admin is gone". An outage throws.
 */
export const requireAdminUser = cache(async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    // Fail closed: an unconfigured admin email must never be treated as "anyone is admin".
    notFound();
  }

  const user = await fetchCurrentUser();

  // Back to the admin once signed in again; only the admin's own session can open it anyway.
  if (!user && (await hasSessionCookie())) {
    redirect(`${SESSION_EXPIRED_PATH}?callbackURL=${encodeURIComponent("/admin")}`);
  }

  if (!user?.email || user.email.toLowerCase() !== adminEmail) {
    notFound();
  }

  return user;
});

function fetchWithSession(path: string, options?: RequestInit) {
  return serverFetch(path, options);
}

/** A record id inside a request path; an id with `/` or `?` must not change the route. */
const segment = encodeURIComponent;

/** Rows per admin list page: an operator pages through about 20 at a time, never the whole table. */
export const ADMIN_PAGE_SIZE = 20;

/**
 * The overview and its daily series build cold through the server's 6-slot query limiter, which
 * can take tens of seconds; the default 5 s server-fetch timeout would turn that wait into an
 * error page.
 */
export const ADMIN_REPORT_TIMEOUT_MS = 45_000;

/** Drops empty/undefined params so `?status=` never reaches a strict enum validator. */
function buildAdminQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** A list page's query: the URL's filters and offset, at the admin page size whatever the URL asks. */
function buildAdminListQuery(params: Record<string, string | number | undefined>) {
  return buildAdminQuery({ ...params, limit: ADMIN_PAGE_SIZE });
}

/**
 * Carries the upstream HTTP status alongside the message.
 *
 * Callers need to tell "this record does not exist" (404) apart from "the API is broken"
 * (401/403/500/network), because those want opposite UI: a not-found page versus an error
 * boundary the operator can retry from.
 */
export class AdminApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

/**
 * Every admin page reads through here.
 *
 * A failed admin fetch throws rather than returning a partial shape: an ops dashboard that
 * silently renders zeros when the API is unreachable is worse than one that shows an error,
 * because the zeros look like real data.
 */
async function fetchAdmin<T>(path: string, options?: RequestInit): Promise<T> {
  await requireAdminUser();

  const response = await fetchWithSession(`/admin${path}`, { method: "GET", ...options });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;

    throw new AdminApiError(
      response.status,
      `Admin request failed (${response.status}): ${body?.message ?? response.statusText}`,
    );
  }

  return ((await response.json()) as ApiSuccessResponse<T>).data;
}

/**
 * Detail-page loader: resolves to `null` only when the record genuinely does not exist, and
 * rethrows everything else so the route's `error.tsx` can explain it.
 *
 * Treating every failure as missing would turn a 500, an expired session or an unreachable API
 * into "this record does not exist" and send the operator off to check an id that is fine.
 */
export async function loadAdminDetail<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) return null;
    throw error;
  }
}

/* ── Overview ─────────────────────────────────────────────────────────────────────── */

export function fetchAdminOverview(days = 30) {
  return fetchAdmin<AdminOverview>(`/overview${buildAdminQuery({ days })}`, {
    signal: AbortSignal.timeout(ADMIN_REPORT_TIMEOUT_MS),
  });
}

export function fetchAdminRecentActivity() {
  return fetchAdmin<AdminRecentActivity>("/overview/activity");
}

export function fetchAdminTimeSeries(days = 30) {
  return fetchAdmin<AdminTimeSeries>(`/overview/series${buildAdminQuery({ days })}`, {
    signal: AbortSignal.timeout(ADMIN_REPORT_TIMEOUT_MS),
  });
}

/**
 * The shell's queue badges. The admin layout renders on a full load and when a navigation
 * enters `/admin`; client navigations inside the section reuse it, so the counts refresh with
 * `router.refresh()` (every admin action does one), not on every click. It hits the cheap
 * standalone endpoint rather than reading `actionQueue` off the full overview payload, which
 * would run every domain summary aggregate to display six counts.
 *
 * Unlike every other reader here it does not throw: the badges are an affordance, and a
 * transient counting error must not take down a page whose own data loaded fine. A failure is
 * logged and every count comes back `null` (unknown); a zero would claim the queue is empty.
 */
export async function fetchAdminActionQueue(): Promise<AdminActionQueue> {
  try {
    return await fetchAdmin<AdminActionQueue>("/overview/queue");
  } catch (error) {
    unstable_rethrow(error);
    console.error("Admin action queue unavailable", error);

    return {
      pendingAmbassadorApplications: null,
      pendingWithdrawals: null,
      pendingCommissions: null,
      failedWebhooks: null,
      suspendedPortfolios: null,
      pendingPortfolioAssets: null,
    };
  }
}

/* ── Users ────────────────────────────────────────────────────────────────────────── */

export function fetchAdminUsers(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminUserRow>>(`/users${buildAdminListQuery(params)}`);
}

export function fetchAdminUserDetail(id: string) {
  return fetchAdmin<AdminUserDetail>(`/users/${segment(id)}`);
}

/* ── Affiliates ───────────────────────────────────────────────────────────────────── */

export function fetchAdminAffiliateSummary() {
  return fetchAdmin<AdminAffiliateSummary>("/affiliates/summary");
}

export function fetchAdminAffiliates(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminAffiliateRow>>(
    `/affiliates${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminAffiliateDetail(userId: string) {
  return fetchAdmin<{
    affiliate: AdminAffiliateRow & {
      affiliateWallet: {
        pendingCents: number;
        availableCents: number;
        paidCents: number;
      } | null;
    };
    referrals: AdminReferralRow[];
    commissions: AdminCommissionRow[];
    withdrawals: AdminWithdrawalRow[];
    topReferrerHosts: Array<{ host: string; clicks: number }>;
  }>(`/affiliates/${segment(userId)}`);
}

export function fetchAdminCommissions(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminCommissionRow> & { totalAmountCents: number }>(
    `/affiliates/commissions${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminWithdrawals(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminWithdrawalRow> & { totalAmountCents: number }>(
    `/affiliates/withdrawals${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminReferrals(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminReferralRow>>(
    `/affiliates/referrals${buildAdminListQuery(params)}`,
  );
}

/* ── Ambassadors ──────────────────────────────────────────────────────────────────── */

export function fetchAdminAmbassadorSummary() {
  return fetchAdmin<AdminAmbassadorSummary>("/ambassadors/summary");
}

export function fetchAdminAmbassadorApplications(
  params: Record<string, string | number | undefined> = {},
) {
  return fetchAdmin<AdminPaginatedResponse<AdminAmbassadorRow>>(
    `/ambassadors${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminAmbassadorRoster(
  params: Record<string, string | number | undefined> = {},
) {
  return fetchAdmin<AdminPaginatedResponse<AdminAmbassadorRosterRow>>(
    `/ambassadors/roster${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminAmbassadorApplication(id: string) {
  return fetchAdmin<{
    application: AdminAmbassadorRow;
    reviewer: AdminUserRef | null;
    auditEntries: AdminAuditEntry[];
  }>(`/ambassadors/${segment(id)}`);
}

/* ── Portfolios ───────────────────────────────────────────────────────────────────── */

export function fetchAdminPortfolios(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminPortfolioRow>>(
    `/portfolios${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminPortfolioSummary() {
  return fetchAdmin<AdminPortfolioSummary>("/portfolios/summary");
}

export function fetchAdminPortfolioDetail(id: string, days = 30) {
  return fetchAdmin<AdminPortfolioDetail>(`/portfolios/${segment(id)}${buildAdminQuery({ days })}`);
}

/* ── Documents & share links ──────────────────────────────────────────────────────── */

export function fetchAdminDocumentSummary() {
  return fetchAdmin<AdminDocumentSummary>("/documents/summary");
}

export function fetchAdminDocuments(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminDocumentRow>>(
    `/documents${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminShareLinks(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminShareLinkRow>>(
    `/share-links${buildAdminListQuery(params)}`,
  );
}

/* ── Billing ──────────────────────────────────────────────────────────────────────── */

export function fetchAdminBillingSummary() {
  return fetchAdmin<AdminBillingSummary>("/billing/summary");
}

export function fetchAdminSubscriptions(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminSubscriptionRow>>(
    `/billing/subscriptions${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminCreditWallets(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminCreditWalletRow>>(
    `/billing/credits${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminEntitlements(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminEntitlementRow>>(
    `/billing/entitlements${buildAdminListQuery(params)}`,
  );
}

/** One provider event with its stored payload, which the list leaves out for size. */
export function fetchAdminWebhookDetail(id: string) {
  return fetchAdmin<AdminWebhookRow & { payload: unknown }>(`/billing/webhooks/${segment(id)}`);
}

export function fetchAdminWebhooks(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminWebhookRow>>(
    `/billing/webhooks${buildAdminListQuery(params)}`,
  );
}

/* ── Audit ────────────────────────────────────────────────────────────────────────── */

export function fetchAdminAuditEntries(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminAuditEntry>>(
    `/audit${buildAdminListQuery(params)}`,
  );
}

export function fetchAdminAuditFilters() {
  return fetchAdmin<AdminAuditFilters>("/audit/filters");
}

/* ── API keys ─────────────────────────────────────────────────────────────────────── */

export function fetchAdminApiKeySummary() {
  return fetchAdmin<AdminApiKeySummary>("/api-keys/summary");
}

export function fetchAdminApiKeys(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminPaginatedResponse<AdminApiKeyRow>>(
    `/api-keys${buildAdminListQuery(params)}`,
  );
}

/* ── System ───────────────────────────────────────────────────────────────────────── */

export function fetchAdminSystemHealth() {
  return fetchAdmin<AdminSystemHealth>("/system/health");
}

export function fetchAdminJobStatus() {
  return fetchAdmin<AdminJobStatus>("/system/jobs");
}

export function fetchAdminUsageMetrics(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminUsageMetrics>(`/system/metrics${buildAdminQuery(params)}`);
}

export function fetchAdminGithubStatus() {
  return fetchAdmin<AdminGithubStatus>("/system/github");
}

export function fetchAdminRequestLogs(params: Record<string, string | number | undefined> = {}) {
  return fetchAdmin<AdminRequestLogPage>(`/system/request-logs${buildAdminQuery(params)}`);
}

/* ── Roadmap (reads come from the public router) ──────────────────────────────────── */

/**
 * One page of one kanban column. The public list pages (20 by default), so each column reads its
 * own status at the admin page size and pages on its own, rather than the board reading every
 * item ever written.
 */
export async function fetchAdminRoadmapColumn(status: RoadmapStatus, offset = 0) {
  await requireAdminUser();

  const query = buildAdminQuery({ status, sort: "newest", limit: ADMIN_PAGE_SIZE, offset });
  const response = await fetchWithSession(`/roadmap${query}`, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Roadmap request failed (${response.status})`);
  }

  const { data } = (await response.json()) as ApiSuccessResponse<
    AdminPaginatedResponse<RoadmapFeature>
  >;

  return { items: data.items, total: data.total, limit: data.limit, offset: data.offset };
}

export async function fetchAdminRoadmapFeatureServer(id: string) {
  await requireAdminUser();

  const response = await fetchWithSession(`/roadmap/${segment(id)}`, {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Roadmap item request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiSuccessResponse<RoadmapFeature>;
  return payload.data;
}
