import type { Metadata } from "next";
import Link from "next/link";
import AdminRecordGone from "@/components/admin/AdminRecordGone";

import AdminAuditList from "@/components/admin/AdminAuditList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import Panel from "@/components/admin/Panel";
import PortfolioModerationActions from "@/app/admin/portfolios/PortfolioModerationActions";

import { fetchAdminPortfolioDetail, loadAdminDetail } from "@/features/admin/services/admin-server";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatNumber,
  formatSuspensionReason,
} from "@/features/admin/utils/admin-format";
import { pluralize } from "@/lib/pluralize";

export const metadata: Metadata = {
  title: "Admin · Portfolio",
  robots: { index: false, follow: false },
};

export default async function AdminPortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await loadAdminDetail(fetchAdminPortfolioDetail(id, 30));
  if (!data) {
    return (
      <AdminRecordGone
        noun="portfolio publication"
        targetType="PortfolioPublication"
        targetId={id}
        backHref="/admin/portfolios"
        backLabel="Back to portfolios"
      />
    );
  }

  const { publication, totalViews, dailyViews, topReferrers, auditEntries } = data;

  const peakDay = dailyViews.reduce((max, point) => (point.count > max ? point.count : max), 0);

  const windowViews = dailyViews.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Portfolio"
        title={publication.subdomain}
        description={`${publication.document.title} · template ${publication.templateId} · published ${formatDate(publication.publishedAt)}`}
        actions={
          <PortfolioModerationActions
            publicationId={publication.id}
            subdomain={publication.subdomain}
            status={publication.status}
            templateId={publication.templateId}
          />
        }
      />

      {publication.status === "SUSPENDED" && publication.suspensionReason ? (
        <Panel className="border-destructive/30 bg-destructive/5 rounded-xl p-4">
          <p className="text-destructive text-sm font-medium">
            Suspended {formatDateTime(publication.suspendedAt)}
          </p>
          <p className="text-muted mt-1 text-sm">
            {formatSuspensionReason(publication.suspensionReason)}
          </p>
        </Panel>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Lifetime views" value={formatCompactNumber(totalViews)} />
        <AdminStatCard label="Views (30d)" value={formatCompactNumber(windowViews)} />
        <AdminStatCard label="Peak day" value={formatNumber(peakDay)} />
        <AdminStatCard
          label="Published revision"
          value={formatNumber(publication.publishedRevision)}
          hint={`Document is at revision ${publication.document.revision}`}
          tone={
            publication.document.revision > publication.publishedRevision ? "warning" : "default"
          }
        />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Panel className="space-y-4 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Views, last 30 days</h3>

            {dailyViews.length === 0 ? (
              <p className="text-muted text-sm">No views recorded in this window.</p>
            ) : (
              /* A bar per day. Heights are relative to the peak so a quiet portfolio still
                 shows shape rather than a flat line of 1px bars. */
              <div className="flex h-40 items-end gap-1">
                {dailyViews.map((point) => (
                  <div
                    key={point.date}
                    className="bg-accent/70 hover:bg-accent min-h-[2px] flex-1 rounded-t transition"
                    style={{ height: `${peakDay ? (point.count / peakDay) * 100 : 0}%` }}
                    title={`${point.date}: ${pluralize(point.count, "view")}`}
                  />
                ))}
              </div>
            )}

            {dailyViews.length > 0 ? (
              <div className="text-muted flex justify-between text-xs">
                <span>{dailyViews[0]?.date}</span>
                <span>{dailyViews[dailyViews.length - 1]?.date}</span>
              </div>
            ) : null}
          </Panel>

          <AdminAuditList
            title="Moderation history"
            emptyMessage="No admin actions on this portfolio."
            entries={auditEntries}
          />
        </div>

        <div className="space-y-4">
          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Owner</h3>

            <Link
              href={`/admin/users/${encodeURIComponent(publication.user.id)}`}
              className="text-accent text-sm font-medium hover:underline"
            >
              {publication.user.name || publication.user.email}
            </Link>

            <p className="text-muted text-xs">{publication.user.email}</p>

            <div className="flex items-center gap-2">
              <AdminStatusBadge status={publication.user.role} />
              <span className="text-muted text-xs">
                joined {formatDate(publication.user.createdAt)}
              </span>
            </div>
          </Panel>

          <Panel className="space-y-3 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Top referrers (30d)</h3>

            {topReferrers.length === 0 ? (
              <p className="text-muted text-sm">No referrer data.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {topReferrers.map((referrer) => (
                  <div key={referrer.host} className="flex items-center justify-between gap-3">
                    <span className="text-muted truncate">{referrer.host}</span>
                    <span className="text-foreground font-medium">
                      {formatNumber(referrer.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="space-y-2 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Source document</h3>

            <p className="text-foreground text-sm">{publication.document.title}</p>
            <AdminStatusBadge status={publication.document.visibility} />

            <Link
              href={`/admin/documents?query=${encodeURIComponent(publication.document.id)}`}
              className="text-accent block text-xs font-semibold hover:underline"
            >
              Open in documents →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
