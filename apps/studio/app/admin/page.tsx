import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import AdminActionButtons from "@/app/admin/components/AdminActionButtons";
import AdminWindowSelector, { parseWindowDays } from "@/app/admin/components/AdminWindowSelector";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import MetricCard from "@/components/admin/MetricCard";
import Panel, { PanelBody, PanelHeader, PanelRow } from "@/components/admin/Panel";
import BarList from "@/components/admin/charts/BarList";
import StackedBar from "@/components/admin/charts/StackedBar";
import TrendChart from "@/components/admin/charts/TrendChart";
import { trendFromSeries } from "@/components/admin/charts/geometry";
import type { ChartSeries } from "@/components/admin/charts/ChartDefs";

import {
  fetchAdminOverview,
  fetchAdminRecentActivity,
  fetchAdminTimeSeries,
} from "@/features/admin/services/admin-server";
import type { AdminActionQueueKey } from "@/features/admin/types/admin-types";
import {
  formatCents,
  formatCompactNumber,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  humanizeKey,
} from "@/features/admin/utils/admin-format";

export const metadata: Metadata = {
  title: "Admin · Dashboard",
  description: "Monitor platform metrics, moderation queues, and admin controls.",
  robots: { index: false, follow: false },
};

/** Queues an operator is expected to drain, each linking to the page that can drain it. */
const ACTION_QUEUE_ITEMS: Array<{
  key: AdminActionQueueKey;
  label: string;
  href: string;
  critical?: boolean;
}> = [
  {
    key: "failedWebhooks",
    label: "Failed webhooks",
    href: "/admin/billing/webhooks?status=FAILED",
    critical: true,
  },
  {
    key: "pendingWithdrawals",
    label: "Affiliate withdrawals",
    href: "/admin/affiliates/withdrawals?status=REQUESTED",
  },
  {
    key: "pendingAmbassadorApplications",
    label: "Ambassador applications",
    href: "/admin/ambassadors?status=PENDING",
  },
  {
    key: "pendingCommissions",
    label: "Commissions to review",
    href: "/admin/affiliates/commissions?status=PENDING",
  },
  {
    key: "suspendedPortfolios",
    label: "Suspended portfolios",
    href: "/admin/portfolios?status=SUSPENDED",
  },
  { key: "pendingPortfolioAssets", label: "Pending assets", href: "/admin/system" },
];

/** Subscription lifecycle, ordered healthiest first so the bar reads left-to-right as decay. */
const SUBSCRIPTION_SERIES: Array<{ status: string; series: ChartSeries }> = [
  { status: "ACTIVE", series: 3 },
  { status: "PAST_DUE", series: 4 },
  { status: "CANCELED", series: 5 },
  { status: "INACTIVE", series: 2 },
];

const VISIBILITY_SERIES: Array<{ visibility: string; series: ChartSeries }> = [
  { visibility: "PUBLIC", series: 1 },
  { visibility: "UNLISTED", series: 4 },
  { visibility: "PRIVATE", series: 2 },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const days = parseWindowDays((await searchParams).days);

  const [overview, activity, timeSeries] = await Promise.all([
    fetchAdminOverview(days),
    fetchAdminRecentActivity(),
    fetchAdminTimeSeries(days),
  ]);

  const { series, buckets } = timeSeries;

  const openQueues = ACTION_QUEUE_ITEMS.filter((item) => overview.actionQueue[item.key] > 0);
  const totalOpen = openQueues.reduce((sum, item) => sum + overview.actionQueue[item.key], 0);

  const commissionInWindow = series.commissionCents.reduce((sum, value) => sum + value, 0);

  return (
    // Section gap is deliberately double the gap inside a grid row (24px vs 12px). At the
    // previous 20px vs 12px the two were close enough that nothing grouped: the page read as
    // one uniform field of forty boxes instead of six labelled bands, which is most of why it
    // felt unstructured regardless of how any individual card looked.
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description={`Platform health and operator queues. Trends cover the last ${days} days.`}
        actions={
          <>
            <AdminWindowSelector />
            <AdminActionButtons />
          </>
        }
      />

      {/*
        Anything needing a human decision is surfaced above every metric on the page. A queue
        that renders below the fold, under eight equally-weighted stat cards, is a queue that
        does not get drained — which is what the previous layout did.

        Both states sit on the card surface with a coloured border rather than a coloured fill.
        `--warning` is a deep amber (#b45309), and a 5% wash of it over the warm page background
        produced a flat tan panel that read as dirty rather than as urgent. The border plus the
        per-queue counts carry the same signal without tinting a 200px-tall region of the page.
      */}
      {openQueues.length === 0 ? (
        <div className="border-success/30 bg-card flex items-center gap-2.5 rounded-xl border px-4 py-3">
          <CheckCircle2 className="text-success h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-foreground text-sm">
            Every queue is clear — no pending applications, payouts, or failed webhooks.
          </p>
        </div>
      ) : (
        <section
          aria-labelledby="needs-attention"
          className="border-warning/35 bg-card rounded-xl border p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 id="needs-attention" className="text-foreground text-sm font-semibold">
              Needs attention
              <span className="text-muted admin-numeric ml-2 font-normal">
                {formatNumber(totalOpen)} open across {openQueues.length}{" "}
                {openQueues.length === 1 ? "queue" : "queues"}
              </span>
            </h2>

            <AdminStatusBadge status={overview.health.status} dot />
          </div>

          {/*
            Wrapping flex, not a fixed column grid. The number of open queues is data — it moves
            between one and six — and a `xl:grid-cols-3` left a conspicuous empty cell whenever
            that count wasn't a multiple of three (five open queues drew a hole the size of a
            card). Letting the items flex means the final row always fills the width.
          */}
          <div className="flex flex-wrap gap-2">
            {openQueues.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                // `max-w-lg` caps the stretch so a single item left over on the last row becomes
                // a wide card rather than a full-bleed banner with its count stranded at the far
                // right edge of the page.
                className="border-border bg-card hover:border-accent/40 hover:bg-admin-inset focus-visible:ring-accent group flex max-w-lg min-w-56 flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-foreground min-w-0 truncate text-sm">{item.label}</span>

                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={
                      item.critical
                        ? "text-destructive admin-numeric text-sm font-semibold"
                        : "text-warning admin-numeric text-sm font-semibold"
                    }
                  >
                    {formatNumber(overview.actionQueue[item.key])}
                  </span>

                  <ArrowUpRight
                    className="text-muted h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* The four numbers that describe the business. Everything below is a breakdown of one. */}
      <section
        aria-label="Key metrics"
        className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Total users"
          value={formatNumber(overview.users.total)}
          delta={overview.users.growthPercent}
          hint={`${formatNumber(overview.users.newInWindow)} joined in ${days} days`}
          trend={series.signups}
          series={1}
          href="/admin/users"
        />

        <MetricCard
          label="Paying subscriptions"
          value={formatNumber(overview.billing.subscriptions.paying)}
          delta={trendFromSeries(series.subscriptions)}
          hint={`${formatNumber(overview.billing.subscriptions.cancelingAtPeriodEnd)} canceling at period end`}
          trend={series.subscriptions}
          series={3}
          href="/admin/billing"
        />

        <MetricCard
          label="Live portfolios"
          value={formatNumber(overview.portfolios.live)}
          delta={trendFromSeries(series.publications)}
          hint={`${formatCompactNumber(overview.portfolios.views.last30Days)} views in 30 days`}
          trend={series.publications}
          series={2}
          href="/admin/portfolios?status=LIVE"
        />

        <MetricCard
          label={`Commission earned · ${days}d`}
          value={formatCents(commissionInWindow)}
          delta={trendFromSeries(series.commissionCents)}
          hint={`${formatCents(overview.affiliates.wallets.pendingCents + overview.affiliates.wallets.availableCents)} owed to affiliates`}
          trend={series.commissionCents}
          series={4}
          href="/admin/affiliates"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel padding="none" className="lg:col-span-2">
          <PanelHeader
            title="Growth"
            description="New users, subscriptions and published portfolios per day"
            actions={
              <div className="flex items-center gap-3">
                {[
                  { label: "Signups", series: 1 as ChartSeries },
                  { label: "Subscriptions", series: 3 as ChartSeries },
                  { label: "Publishes", series: 2 as ChartSeries },
                ].map((legend) => (
                  <span
                    key={legend.label}
                    className="text-muted flex items-center gap-1.5 text-[11px]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: `var(--chart-${legend.series})` }}
                      aria-hidden="true"
                    />
                    {legend.label}
                  </span>
                ))}
              </div>
            }
          />

          <PanelBody align="center">
            <TrendChart
              buckets={buckets}
              height={220}
              datasets={[
                { label: "Signups", values: series.signups, series: 1 },
                { label: "Subscriptions", values: series.subscriptions, series: 3, filled: false },
                { label: "Publishes", values: series.publications, series: 2, filled: false },
              ]}
            />
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="Users by role"
            actions={
              <Link href="/admin/users" className="text-accent text-xs font-medium hover:underline">
                View all
              </Link>
            }
          />

          <PanelBody align="between" className="gap-4">
            <BarList
              items={Object.entries(overview.users.byRole).map(([role, count]) => ({
                label: humanizeKey(role),
                value: count,
                href: `/admin/users?role=${role}`,
              }))}
              series={1}
            />

            <div className="border-border space-y-0.5 border-t pt-3">
              <PanelRow
                label="Verified email"
                value={`${formatNumber(overview.users.verified)} · ${
                  overview.users.total > 0
                    ? Math.round((overview.users.verified / overview.users.total) * 100)
                    : 0
                }%`}
              />
              <PanelRow
                label="Active sessions"
                value={formatNumber(overview.users.activeSessions)}
              />
            </div>
          </PanelBody>
        </Panel>
      </section>

      {/* Secondary stats: real, but not the numbers you open the dashboard to check. */}
      <section
        aria-label="Secondary metrics"
        className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <AdminStatCard
          label="Documents"
          value={formatNumber(overview.documents.active)}
          hint={`${formatNumber(overview.documents.shareLinks)} share links · ${formatCompactNumber(overview.documents.shareViews)} views`}
          href="/admin/documents"
        />

        <AdminStatCard
          label="Active ambassadors"
          value={formatNumber(overview.ambassadors.activeAmbassadors)}
          hint={`${formatNumber(overview.ambassadors.applicationsLast7Days)} applications in 7 days`}
          href="/admin/ambassadors/roster"
        />

        <AdminStatCard
          label="Credit float"
          value={formatNumber(overview.billing.credits.balance)}
          hint={`${formatNumber(overview.billing.credits.spentLast30Days)} spent in 30 days`}
          href="/admin/billing/credits"
        />

        <AdminStatCard
          label="Active API keys"
          value={formatNumber(overview.apiKeys.active)}
          hint={`${formatNumber(overview.apiKeys.usedLast7Days)} used in 7 days`}
          href="/admin/api-keys"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel padding="none">
          <PanelHeader
            title="Subscription mix"
            actions={
              <Link
                href="/admin/billing"
                className="text-accent text-xs font-medium hover:underline"
              >
                Manage
              </Link>
            }
          />

          <PanelBody align="center">
            <StackedBar
              segments={SUBSCRIPTION_SERIES.map((entry) => ({
                label: humanizeKey(entry.status),
                value:
                  overview.billing.subscriptions.byStatus[
                    entry.status as keyof typeof overview.billing.subscriptions.byStatus
                  ] ?? 0,
                series: entry.series,
              }))}
              emptyMessage="No subscriptions yet."
            />
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="Document visibility"
            actions={
              <Link
                href="/admin/documents"
                className="text-accent text-xs font-medium hover:underline"
              >
                Manage
              </Link>
            }
          />

          <PanelBody align="center">
            <StackedBar
              segments={VISIBILITY_SERIES.map((entry) => ({
                label: humanizeKey(entry.visibility),
                value:
                  overview.documents.byVisibility[
                    entry.visibility as keyof typeof overview.documents.byVisibility
                  ] ?? 0,
                series: entry.series,
              }))}
              emptyMessage="No documents yet."
            />
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelHeader title="Top portfolio templates" />

          <PanelBody align="center">
            <BarList
              items={overview.portfolios.topTemplates.map((template) => ({
                label: humanizeKey(template.templateId),
                value: template.count,
              }))}
              series={2}
              limit={6}
              emptyMessage="No portfolios published yet."
            />
          </PanelBody>
        </Panel>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel padding="none">
          <PanelHeader
            title="Portfolio traffic"
            description={`Daily views over ${days} days`}
            actions={
              <Link
                href="/admin/portfolios"
                className="text-accent text-xs font-medium hover:underline"
              >
                Portfolios
              </Link>
            }
            className="lg:col-span-1"
          />

          <PanelBody align="center">
            <TrendChart
              buckets={buckets}
              height={140}
              formatValue={(value) => formatCompactNumber(value)}
              datasets={[{ label: "Views", values: series.portfolioViews, series: 6 }]}
            />
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="Credit consumption"
            description={`Credits spent per day over ${days} days`}
            actions={
              <Link
                href="/admin/billing/credits"
                className="text-accent text-xs font-medium hover:underline"
              >
                Wallets
              </Link>
            }
          />

          <PanelBody align="center">
            <TrendChart
              buckets={buckets}
              height={140}
              formatValue={(value) => formatCompactNumber(value)}
              datasets={[{ label: "Credits spent", values: series.creditsSpent, series: 5 }]}
            />
          </PanelBody>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="System"
            actions={
              <Link
                href="/admin/system"
                className="text-accent text-xs font-medium hover:underline"
              >
                Details
              </Link>
            }
          />

          {/* Two groups, not N rows: the checks stay together at the top and the job timestamps
              sit against the bottom edge, so any slack in a tall row opens between the two
              groups rather than being shared out between individual rows. */}
          <PanelBody align="between" className="gap-3">
            <div className="space-y-0.5">
              {overview.health.checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-muted min-w-0 truncate text-sm">
                    {humanizeKey(check.name)}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-muted admin-numeric text-xs">{check.latencyMs}ms</span>
                    <AdminStatusBadge status={check.status} dot />
                  </span>
                </div>
              ))}
            </div>

            <div className="border-border space-y-0.5 border-t pt-2">
              <PanelRow label="Uptime" value={formatDuration(overview.health.uptimeSeconds)} />
              <PanelRow
                label="Last metric flush"
                value={formatRelativeTime(overview.jobs.lastUsageMetricFlush?.createdAt)}
              />
              <PanelRow
                label="Last view flush"
                value={formatRelativeTime(overview.jobs.lastViewFlush?.createdAt)}
              />
            </div>
          </PanelBody>
        </Panel>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Panel padding="none">
          <PanelHeader
            title="Newest signups"
            actions={
              <Link href="/admin/users" className="text-accent text-xs font-medium hover:underline">
                View all
              </Link>
            }
          />

          <ul className="divide-border flex-1 divide-y">
            {activity.signups.length === 0 ? (
              <li className="text-muted px-4 py-8 text-center text-sm">No signups yet.</li>
            ) : (
              activity.signups.slice(0, 6).map((signup) => (
                <li key={signup.id}>
                  <Link
                    href={`/admin/users/${signup.id}`}
                    className="hover:bg-admin-inset flex items-center justify-between gap-3 px-4 py-2.5 transition"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-sm font-medium">
                        {signup.name || signup.email}
                      </span>
                      <span className="text-muted block truncate text-xs">{signup.email}</span>
                    </span>

                    <span className="text-muted shrink-0 text-xs">
                      {formatRelativeTime(signup.createdAt)}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="Recently published"
            actions={
              <Link
                href="/admin/portfolios"
                className="text-accent text-xs font-medium hover:underline"
              >
                View all
              </Link>
            }
          />

          <ul className="divide-border flex-1 divide-y">
            {activity.publications.length === 0 ? (
              <li className="text-muted px-4 py-8 text-center text-sm">
                No published portfolios yet.
              </li>
            ) : (
              activity.publications.slice(0, 6).map((publication) => (
                <li key={publication.id}>
                  <Link
                    href={`/admin/portfolios/${publication.id}`}
                    className="hover:bg-admin-inset flex items-center justify-between gap-3 px-4 py-2.5 transition"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-sm font-medium">
                        {publication.subdomain}
                      </span>
                      <span className="text-muted block truncate text-xs">
                        {publication.user.name || publication.user.email}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      <AdminStatusBadge status={publication.status} />
                      <span className="text-muted hidden text-xs sm:inline">
                        {formatRelativeTime(publication.publishedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel padding="none">
          <PanelHeader
            title="Recent admin activity"
            actions={
              <Link href="/admin/audit" className="text-accent text-xs font-medium hover:underline">
                Audit log
              </Link>
            }
          />

          <ul className="divide-border flex-1 divide-y">
            {overview.recentActivity.length === 0 ? (
              <li className="text-muted px-4 py-8 text-center text-sm">
                No admin actions recorded yet.
              </li>
            ) : (
              overview.recentActivity.slice(0, 6).map((entry) => (
                <li key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground min-w-0 truncate text-sm font-medium">
                      {humanizeKey(entry.action)}
                    </span>

                    <span className="text-muted shrink-0 text-xs">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>

                  <p className="text-muted mt-0.5 truncate text-xs">
                    {entry.actor?.email ?? "system"}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </section>
    </div>
  );
}
