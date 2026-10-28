import type { Metadata } from "next";
import Link from "next/link";

import AdminRecordGone from "@/components/admin/AdminRecordGone";
import AdminAuditList, { AdminAuditLink } from "@/components/admin/AdminAuditList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import Panel from "@/components/admin/Panel";
import UserAdminActions from "@/app/admin/users/[id]/UserAdminActions";

import { fetchAdminUserDetail, loadAdminDetail } from "@/features/admin/services/admin-server";
import { adminAccessLabel, type AdminUserDetail } from "@/features/admin/types/admin-types";
import {
  apiKeyState,
  formatCents,
  formatDate,
  formatNumber,
  formatPeriodEnd,
  formatRelativeTime,
  formatSuspensionReason,
  humanizeKey,
  truncate,
} from "@/features/admin/utils/admin-format";
import { pluralize } from "@/lib/pluralize";

/** "Latest 10 of 34" under a list the server cut short; nothing when it holds everything. */
function ListCount({ shown, total, noun }: { shown: number; total?: number; noun: string }) {
  if (total !== undefined ? shown >= total : shown === 0) return null;

  return (
    <p className="text-muted text-xs">
      {total !== undefined
        ? `Latest ${formatNumber(shown)} of ${pluralize(total, noun)}.`
        : `The latest ${pluralize(shown, noun)}; older ones are not shown.`}
    </p>
  );
}

/**
 * The lines under the access label, all from the server's summary but the retry date, which is
 * the past-due subscription's own.
 */
function accessDetails(detail: AdminUserDetail) {
  const { access } = detail;
  if (!access) return [];

  const lines: string[] = [];

  if (access.paymentIssue) {
    const graceEndsAt = detail.subscriptions.find(
      (subscription) => subscription.status === "PAST_DUE" && subscription.graceEndsAt,
    )?.graceEndsAt;
    lines.push(
      `Payment issue: the card is being retried${graceEndsAt ? ` until ${formatDate(graceEndsAt)}` : ""}`,
    );
  }

  if (access.passEndsAt) lines.push(`Pass until ${formatDate(access.passEndsAt)}`);

  lines.push(
    `${formatNumber(access.creditBalance)} credits available, ${access.paidCredits > 0 ? `${formatNumber(access.paidCredits)} of them paid for` : "none paid for"}`,
  );

  return lines;
}

/** Whether a timestamp has gone by, for the "expired" and "expires" labels. */
const isPast = (iso: string) => Date.parse(iso) <= Date.now();

/** Rows each list on this page is cut to by the server (`getUserDetail`). */
const DETAIL_TAKE = {
  subscriptions: 10,
  entitlements: 25,
  documents: 25,
  credits: 20,
  sessions: 10,
};

export const metadata: Metadata = {
  title: "Admin · User",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const detail = await loadAdminDetail(fetchAdminUserDetail(id));
  if (!detail) {
    return (
      <AdminRecordGone
        noun="account"
        targetType="User"
        targetId={id}
        backHref="/admin/users"
        backLabel="Back to users"
      />
    );
  }

  const { user } = detail;
  // `ADMIN_EMAIL`'s account: the server refuses to delete it or change its role.
  const protectedAdmin =
    user.email.trim().toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const access = { label: adminAccessLabel(detail.access), details: accessDetails(detail) };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="User"
        title={user.name || user.email}
        description={`${user.email} · joined ${formatDate(user.createdAt)} · id ${user.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge status={user.role} />
            <AdminStatusBadge status={user.emailVerified ? "ACTIVE" : "PENDING"} />
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Documents"
          value={formatNumber(user._count.resumes)}
          hint="all kinds, not counting the trash"
        />
        <AdminStatCard label="Share links" value={formatNumber(user._count.shareLinks)} />
        <AdminStatCard
          label="Credit balance"
          value={formatNumber(detail.credits.wallet?.balance ?? 0)}
          hint={`${formatNumber(detail.credits.wallet?.reserved ?? 0)} reserved`}
        />
        <AdminStatCard
          label="Affiliate earnings"
          value={formatCents(detail.affiliate.wallet?.paidCents ?? 0)}
          hint={`${formatCents(detail.affiliate.wallet?.availableCents ?? 0)} available`}
        />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Panel className="space-y-2 rounded-xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-foreground font-semibold tracking-tight">Access</h3>
              <span className="text-foreground text-sm font-semibold">{access.label}</span>
            </div>

            {access.details.length > 0 ? (
              <ul className="text-muted space-y-0.5 text-xs">
                {access.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Account</h3>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Username</dt>
                <dd className="text-foreground">{user.username || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Auto sync</dt>
                <dd className="text-foreground">{user.autoSyncEnabled ? "Enabled" : "Disabled"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Affiliate code</dt>
                <dd className="text-foreground">{user.affiliateCode || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Affiliate status</dt>
                <dd>
                  <AdminStatusBadge status={user.affiliateStatus} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Ambassador</dt>
                <dd>
                  <AdminStatusBadge status={user.ambassadorStatus} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Last GitHub import</dt>
                <dd className="text-foreground">{formatRelativeTime(user.lastGithubImportAt)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Subscriptions</h3>

            {detail.subscriptions.length === 0 ? (
              <p className="text-muted text-sm">No subscription history.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <p className="text-foreground font-medium">{subscription.productKey}</p>
                      <p className="text-muted text-xs">
                        {subscription.provider} · {subscription.interval ?? "no interval"}
                        {subscription.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-muted text-xs">{formatPeriodEnd(subscription)}</span>
                      <AdminStatusBadge status={subscription.status} />
                      <AdminAuditLink targetType="Subscription" targetId={subscription.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detail.subscriptions.length >= DETAIL_TAKE.subscriptions ? (
              <ListCount shown={detail.subscriptions.length} noun="subscription" />
            ) : null}
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Entitlements</h3>

            {detail.entitlements.length === 0 ? (
              <p className="text-muted text-sm">No active entitlements.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.entitlements.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="text-foreground font-medium">{humanizeKey(grant.key)}</span>

                    <span className="flex items-center gap-3">
                      <span className="text-muted text-xs">
                        {grant.metadata?.pass === true ? "PASS" : grant.source} ·{" "}
                        {grant.endsAt
                          ? `${isPast(grant.endsAt) ? "expired" : "expires"} ${formatDate(grant.endsAt)}`
                          : "no end date"}
                      </span>
                      <AdminAuditLink targetType="EntitlementGrant" targetId={grant.id} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {detail.entitlements.length >= DETAIL_TAKE.entitlements ? (
              <ListCount shown={detail.entitlements.length} noun="grant" />
            ) : null}
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Documents</h3>

            {detail.documents.length === 0 ? (
              <p className="text-muted text-sm">No documents.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/documents?query=${encodeURIComponent(document.id)}`}
                        className="text-foreground truncate font-medium hover:underline"
                      >
                        {document.title}
                      </Link>
                      <p className="text-muted text-xs">
                        {humanizeKey(document.type)} · updated{" "}
                        {formatRelativeTime(document.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {document.deletedAt ? <AdminStatusBadge status="DELETED" /> : null}
                      <AdminStatusBadge status={document.visibility} />
                      <AdminAuditLink targetType="Document" targetId={document.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ListCount
              shown={detail.documents.length}
              total={user._count.resumes}
              noun="document"
            />
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Credit transactions</h3>

            {detail.credits.transactions.length === 0 ? (
              <p className="text-muted text-sm">No credit activity.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.credits.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground font-medium">
                        {humanizeKey(transaction.type)}
                        {transaction.action ? ` · ${humanizeKey(transaction.action)}` : ""}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {truncate(transaction.reason, 70)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={
                          transaction.amount >= 0
                            ? "text-success font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {transaction.amount >= 0 ? "+" : ""}
                        {formatNumber(transaction.amount)}
                      </p>
                      <p className="text-muted text-xs">
                        balance {formatNumber(transaction.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detail.credits.transactions.length >= DETAIL_TAKE.credits ? (
              <ListCount shown={detail.credits.transactions.length} noun="transaction" />
            ) : null}
          </Panel>

          <AdminAuditList
            title="Admin actions on the account"
            description="Changes to the account itself (role, credits, sessions). Actions on its subscriptions, grants, documents, portfolio and keys are under each one's History link."
            emptyMessage="No admin actions against this account."
            entries={detail.auditEntries}
          />
        </div>

        <div className="space-y-4">
          <UserAdminActions detail={detail} protectedAdmin={protectedAdmin} />

          {detail.publication ? (
            <Panel className="space-y-2 rounded-xl p-4">
              <h3 className="text-foreground font-semibold tracking-tight">Portfolio</h3>

              <Link
                href={`/admin/portfolios/${encodeURIComponent(detail.publication.id)}`}
                className="text-accent text-sm font-medium hover:underline"
              >
                {detail.publication.subdomain}
              </Link>

              <div className="flex items-center gap-3">
                <AdminStatusBadge status={detail.publication.status} />
                <AdminAuditLink
                  targetType="PortfolioPublication"
                  targetId={detail.publication.id}
                />
              </div>

              {detail.publication.suspensionReason ? (
                <p className="text-muted text-xs">
                  {formatSuspensionReason(detail.publication.suspensionReason)}
                </p>
              ) : null}
            </Panel>
          ) : null}

          {detail.ambassadorApplication ? (
            <Panel className="space-y-2 rounded-xl p-4">
              <h3 className="text-foreground font-semibold tracking-tight">Ambassador</h3>

              <Link
                href={`/admin/ambassadors/${encodeURIComponent(detail.ambassadorApplication.id)}`}
                className="text-accent text-sm font-medium hover:underline"
              >
                {detail.ambassadorApplication.collegeName}
              </Link>

              <AdminStatusBadge status={detail.ambassadorApplication.status} />
            </Panel>
          ) : null}

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">API keys</h3>

            {detail.apiKeys.length === 0 ? (
              <p className="text-muted text-sm">No API keys.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.apiKeys.map((key) => (
                  <div key={key.id} className="space-y-1 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground font-medium">{key.name}</span>
                      <span className="flex items-center gap-2">
                        <AdminStatusBadge status={apiKeyState(key)} />
                        <AdminAuditLink targetType="ApiKey" targetId={key.id} />
                      </span>
                    </div>
                    <p className="text-muted font-mono text-xs">
                      {key.keyPrefix}…{key.keySuffix}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Sessions</h3>

            {detail.sessions.length === 0 ? (
              <p className="text-muted text-sm">No sessions.</p>
            ) : (
              <div className="divide-border/50 divide-y">
                {detail.sessions.map((session) => (
                  <div key={session.id} className="space-y-0.5 py-2 text-xs">
                    <p className="text-foreground">{session.ipAddress || "unknown ip"}</p>
                    <p className="text-muted">{truncate(session.userAgent, 44)}</p>
                    <p className="text-muted">
                      {isPast(session.expiresAt) ? "expired" : "expires"}{" "}
                      {formatRelativeTime(session.expiresAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <ListCount shown={detail.sessions.length} total={user._count.sessions} noun="session" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
