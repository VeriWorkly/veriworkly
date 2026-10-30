import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import AdminActionButtons from "@/app/admin/components/AdminActionButtons";
import AdminWindowSelector from "@/app/admin/components/AdminWindowSelector";
import { parseWindowDays } from "@/app/admin/components/admin-window";
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
import { adminSection, type AdminActionQueueKey } from "@/features/admin/types/admin-types";
import {
  formatCents,
  formatCompactNumber,
  formatDuration,
  formatNumber,
  formatQueueCount,
  formatRelativeTime,
  humanizeKey,
} from "@/features/admin/utils/admin-format";
import { accountName } from "@/lib/constants";

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

/** What a card shows when its overview section failed to load on the server. */
const UNAVAILABLE = "Unavailable";

function SectionUnavailable() {
  return (
    <PanelBody align="center">
      <p className="text-muted py-6 text-center text-sm">
        {UNAVAILABLE}: this section failed to load. Reload to try again.
      </p>
    </PanelBody>
  );
}

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

  // Each section loads independently on the server; a failed one is `null` here and its cards
  // say "Unavailable" instead of the whole dashboard failing or showing zeros.
  const users = adminSection(overview.users);
  const billing = adminSection(overview.billing);
  const portfolios = adminSection(overview.portfolios);
  const documents = adminSection(overview.documents);
  const affiliates = adminSection(overview.affiliates);
  const ambassadors = adminSection(overview.ambassadors);
  const apiKeys = adminSection(overview.apiKeys);
  const jobs = adminSection(overview.jobs);
  const health = adminSection(overview.health);
  const recentActivity = adminSection(overview.recentActivity);

  // A queue whose count could not be read (`null`) is listed too: "every queue is clear" would
  // be a claim nobody checked.
  const openQueues = ACTION_QUEUE_ITEMS.filter((item) => {
    const count = overview.actionQueue[item.key];
    return count === null || count > 0;
  });
  const totalOpen = openQueues.reduce(
    (sum, item) => sum + (overview.actionQueue[item.key] ?? 0),
    0,
  );
  const hasUnknownQueue = openQueues.some((item) => overview.actionQueue[item.key] === null);

  // USD only (the server sums the wallet currency), reversed rows left out, all time. The daily
  // series counts the same rows, so it is the card's line.
  const commissionEarnedUsd = affiliates
    ? (["PENDING", "AVAILABLE", "PAID"] as const).reduce(
        (sum, status) => sum + (affiliates.commissionsByStatus[status]?.amountCents ?? 0),
        0,
      )
    : null;

  return (
    // Section gap is deliberately double the gap inside a grid row (24px vs 12px), so the page
    // reads as labelled bands rather than one uniform field of boxes.
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
        that renders below the fold, under eight equally-weighted stat cards, does not get
        drained.

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
                {hasUnknownQueue ? " · some counts unavailable" : ""}
              </span>
            </h2>

            <AdminStatusBadge status={health?.status} dot />
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
                    {formatQueueCount(overview.actionQueue[item.key])}
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

      {/* The numbers that describe the business. Everything below is a breakdown of one. */}
      <section
        aria-label="Key metrics"
        className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {/* Per currency: amounts in different currencies never add up. Net of refunds and lost
            disputes. Full width on two columns so the four cards after it pair up. */}
        <MetricCard
          label="Revenue · last 30 days"
          value={
            !billing ? (
              UNAVAILABLE
            ) : billing.revenue.last30Days.length === 0 ? (
              "None"
            ) : (
              <span className="block space-y-0.5">
                {billing.revenue.last30Days.map((row) => (
                  <span key={row.currency} className="block">
                    {formatCents(row.netCents, row.currency)}
                  </span>
                ))}
              </span>
            )
          }
          hint={
            billing
              ? `All time: ${billing.revenue.allTime.map((row) => formatCents(row.netCents, row.currency)).join(" · ") || "none"}`
              : undefined
          }
          href="/admin/billing"
          className="sm:col-span-2 xl:col-span-1"
        />

        <MetricCard
          label="Total users"
          value={users ? formatNumber(users.total) : UNAVAILABLE}
          delta={users?.growthPercent ?? null}
          hint={users ? `${formatNumber(users.newInWindow)} joined in ${days} days` : undefined}
          trend={series.signups}
          series={1}
          href="/admin/users"
        />

        <MetricCard
          label="Paying subscriptions"
          value={billing ? formatNumber(billing.subscriptions.paying) : UNAVAILABLE}
          delta={trendFromSeries(series.subscriptions)}
          hint={
            billing
              ? `${formatNumber(billing.subscriptions.cancelingAtPeriodEnd)} canceling at period end`
              : undefined
          }
          trend={series.subscriptions}
          series={3}
          href="/admin/billing"
        />

        <MetricCard
          label="Live portfolios"
          value={portfolios ? formatNumber(portfolios.live) : UNAVAILABLE}
          delta={trendFromSeries(series.publications)}
          hint={
            portfolios
              ? `${formatCompactNumber(portfolios.views.last30Days)} views in 30 days`
              : undefined
          }
          trend={series.publications}
          series={2}
          href="/admin/portfolios?status=LIVE"
        />

        <MetricCard
          label="Commission earned · USD, all time"
          value={commissionEarnedUsd === null ? UNAVAILABLE : formatCents(commissionEarnedUsd)}
          delta={trendFromSeries(series.commissionCents)}
          trend={series.commissionCents}
          series={4}
          hint={
            affiliates
              ? `${formatCents(affiliates.wallets.pendingCents + affiliates.wallets.availableCents)} owed to affiliates${affiliates.commissionsAwaitingConversion > 0 ? ` · ${formatNumber(affiliates.commissionsAwaitingConversion)} in other currencies` : ""}`
              : `Amount owed to affiliates ${UNAVAILABLE.toLowerCase()}`
          }
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
                  <span key={legend.label} className="text-muted flex items-center gap-1.5 text-xs">
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

          {users ? (
            <PanelBody align="between" className="gap-4">
              <BarList
                items={Object.entries(users.byRole).map(([role, count]) => ({
                  label: humanizeKey(role),
                  value: count,
                  href: `/admin/users?role=${role}`,
                }))}
                series={1}
              />

              <div className="border-border space-y-0.5 border-t pt-3">
                <PanelRow
                  label="Verified email"
                  value={`${formatNumber(users.verified)} · ${
                    users.total > 0 ? Math.round((users.verified / users.total) * 100) : 0
                  }%`}
                />
                <PanelRow label="Active sessions" value={formatNumber(users.activeSessions)} />
              </div>
            </PanelBody>
          ) : (
            <SectionUnavailable />
          )}
        </Panel>
      </section>

      {/* Secondary stats: real, but not the numbers you open the dashboard to check. */}
      <section
        aria-label="Secondary metrics"
        className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <AdminStatCard
          label="Documents"
          value={documents ? formatNumber(documents.active) : UNAVAILABLE}
          hint={
            documents
              ? `${formatNumber(documents.shareLinks)} share links · ${formatCompactNumber(documents.shareViews)} views`
              : undefined
          }
          href="/admin/documents"
        />

        <AdminStatCard
          label="Active ambassadors"
          value={ambassadors ? formatNumber(ambassadors.activeAmbassadors) : UNAVAILABLE}
          hint={
            ambassadors
              ? `${formatNumber(ambassadors.applicationsLast7Days)} applications in 7 days`
              : undefined
          }
          href="/admin/ambassadors/roster"
        />

        <AdminStatCard
          label="Credit float"
          value={billing ? formatNumber(billing.credits.balance) : UNAVAILABLE}
          hint={
            billing
              ? `${formatNumber(billing.credits.spentLast30Days)} spent in 30 days`
              : undefined
          }
          href="/admin/billing/credits"
        />

        <AdminStatCard
          label="Enabled API keys"
          value={apiKeys ? formatNumber(apiKeys.active) : UNAVAILABLE}
          hint={apiKeys ? `${formatNumber(apiKeys.usedLast7Days)} used in 7 days` : undefined}
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

          {billing ? (
            <PanelBody align="center">
              <StackedBar
                segments={SUBSCRIPTION_SERIES.map((entry) => ({
                  label: humanizeKey(entry.status),
                  value:
                    billing.subscriptions.byStatus[
                      entry.status as keyof typeof billing.subscriptions.byStatus
                    ] ?? 0,
                  series: entry.series,
                }))}
                emptyMessage="No subscriptions yet."
              />
            </PanelBody>
          ) : (
            <SectionUnavailable />
          )}
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

          {documents ? (
            <PanelBody align="center">
              <StackedBar
                segments={VISIBILITY_SERIES.map((entry) => ({
                  label: humanizeKey(entry.visibility),
                  value:
                    documents.byVisibility[
                      entry.visibility as keyof typeof documents.byVisibility
                    ] ?? 0,
                  series: entry.series,
                }))}
                emptyMessage="No documents yet."
              />
            </PanelBody>
          ) : (
            <SectionUnavailable />
          )}
        </Panel>

        <Panel padding="none">
          <PanelHeader title="Top portfolio templates" />

          {portfolios ? (
            <PanelBody align="center">
              <BarList
                items={portfolios.topTemplates.map((template) => ({
                  label: humanizeKey(template.templateId),
                  value: template.count,
                }))}
                series={2}
                limit={6}
                emptyMessage="No portfolios published yet."
              />
            </PanelBody>
          ) : (
            <SectionUnavailable />
          )}
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
              format="compact"
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
              format="compact"
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
              {health ? null : (
                <p className="text-muted py-1.5 text-sm">Health {UNAVAILABLE.toLowerCase()}.</p>
              )}
              {health?.checks.map((check) => (
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
              <PanelRow
                label="Uptime"
                value={health ? formatDuration(health.uptimeSeconds) : UNAVAILABLE}
              />
              <PanelRow
                label="Last metric flush"
                value={
                  jobs ? formatRelativeTime(jobs.lastUsageMetricFlush?.createdAt) : UNAVAILABLE
                }
              />
              <PanelRow
                label="Last view flush"
                value={jobs ? formatRelativeTime(jobs.lastViewFlush?.createdAt) : UNAVAILABLE}
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
                    href={`/admin/users/${encodeURIComponent(signup.id)}`}
                    className="hover:bg-admin-inset flex items-center justify-between gap-3 px-4 py-2.5 transition"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-sm font-medium">
                        {accountName(signup.name) ?? signup.email}
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
                    href={`/admin/portfolios/${encodeURIComponent(publication.id)}`}
                    className="hover:bg-admin-inset flex items-center justify-between gap-3 px-4 py-2.5 transition"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-sm font-medium">
                        {publication.subdomain}
                      </span>
                      <span className="text-muted block truncate text-xs">
                        {accountName(publication.user.name) ?? publication.user.email}
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
            {!recentActivity ? (
              <li className="text-muted px-4 py-8 text-center text-sm">
                Recent admin activity {UNAVAILABLE.toLowerCase()}.
              </li>
            ) : recentActivity.length === 0 ? (
              <li className="text-muted px-4 py-8 text-center text-sm">
                No admin actions recorded yet.
              </li>
            ) : (
              recentActivity.slice(0, 6).map((entry) => (
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
