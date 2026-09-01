import type { Metadata } from "next";
import Link from "next/link";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";
import Panel from "@/components/admin/Panel";
import { SubscriptionActions } from "@/app/admin/billing/BillingActions";

import {
  fetchAdminBillingSummary,
  fetchAdminSubscriptions,
} from "@/features/admin/services/admin-server";
import type { AdminSubscriptionRow } from "@/features/admin/types/admin-types";
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  humanizeKey,
} from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Billing",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Active", value: "ACTIVE" },
      { label: "Past due", value: "PAST_DUE" },
      { label: "Canceled", value: "CANCELED" },
      { label: "Inactive", value: "INACTIVE" },
    ],
  },
  {
    name: "interval",
    label: "Interval",
    options: [
      { label: "Any", value: "" },
      { label: "Monthly", value: "MONTHLY" },
      { label: "Annual", value: "ANNUAL" },
      { label: "7 day", value: "SEVEN_DAY" },
      { label: "1 day", value: "ONE_DAY" },
    ],
  },
  {
    name: "sort",
    label: "Sort",
    options: [
      { label: "Recently updated", value: "updated" },
      { label: "Newest", value: "newest" },
      { label: "Period ending soonest", value: "periodEnd" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminSubscriptionRow>> = [
  {
    key: "user",
    header: "Customer",
    render: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/users/${row.user.id}`}
          className="text-foreground font-medium hover:underline"
        >
          {row.user.name || row.user.email}
        </Link>
        <p className="text-muted truncate text-xs">{row.user.email}</p>
      </div>
    ),
  },
  {
    key: "product",
    header: "Product",
    render: (row) => (
      <div>
        <p className="text-foreground text-sm">{humanizeKey(row.productKey)}</p>
        <p className="text-muted text-xs">
          {row.provider} · {row.interval ? humanizeKey(row.interval) : "no interval"}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="space-y-1">
        <AdminStatusBadge status={row.status} />
        {row.cancelAtPeriodEnd ? (
          <p className="text-warning text-xs">cancels at period end</p>
        ) : null}
      </div>
    ),
  },
  {
    key: "period",
    header: "Renews",
    hideOnMobile: true,
    render: (row) => <span className="text-muted text-xs">{formatDate(row.currentPeriodEnd)}</span>,
  },
  {
    key: "webhook",
    header: "Last webhook",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{formatRelativeTime(row.lastWebhookAt)}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (row) => (
      <SubscriptionActions
        id={row.id}
        status={row.status}
        email={row.user.email}
        cancelAtPeriodEnd={row.cancelAtPeriodEnd}
      />
    ),
  },
];

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [summary, data] = await Promise.all([
    fetchAdminBillingSummary(),
    fetchAdminSubscriptions(params),
  ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Revenue"
        title="Billing"
        description="Subscriptions, credit float, entitlements, and the provider webhook log. Overrides here are support tools — the payment provider stays authoritative."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <Link href="/admin/billing/credits" className="text-accent">
              Credits
            </Link>
            <Link href="/admin/billing/entitlements" className="text-accent">
              Entitlements
            </Link>
            <Link href="/admin/billing/webhooks" className="text-accent">
              Webhooks
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Paying subscriptions"
          value={formatNumber(summary.subscriptions.paying)}
          hint={`${formatNumber(summary.subscriptions.newLast30Days)} new in 30 days`}
          tone="positive"
        />
        <AdminStatCard
          label="Canceling at period end"
          value={formatNumber(summary.subscriptions.cancelingAtPeriodEnd)}
          tone={summary.subscriptions.cancelingAtPeriodEnd > 0 ? "warning" : "default"}
        />
        <AdminStatCard
          label="Credit float"
          value={formatNumber(summary.credits.balance)}
          hint={`${formatNumber(summary.credits.spentLast30Days)} spent in 30 days`}
          href="/admin/billing/credits"
        />
        <AdminStatCard
          label="Failed webhooks"
          value={formatNumber(summary.webhooks.failed)}
          tone={summary.webhooks.failed > 0 ? "critical" : "default"}
          href="/admin/billing/webhooks?status=FAILED"
        />
      </section>

      <Panel className="space-y-3 rounded-xl p-4">
        <h3 className="text-foreground font-semibold tracking-tight">Subscriptions by product</h3>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(summary.subscriptions.byProduct).length === 0 ? (
            <p className="text-muted">No paying subscriptions yet.</p>
          ) : (
            Object.entries(summary.subscriptions.byProduct).map(([product, count]) => (
              <div key={product} className="flex items-center justify-between gap-3">
                <span className="text-muted">{humanizeKey(product)}</span>
                <span className="text-foreground font-medium">{formatNumber(count)}</span>
              </div>
            ))
          )}
        </div>
      </Panel>

      <AdminFilterBar
        basePath="/admin/billing"
        searchPlaceholder="Customer email, name, or provider subscription id"
        selects={FILTERS}
      />

      <AdminTable
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        emptyMessage="No subscriptions match these filters."
      />

      <AdminPagination
        total={data.total}
        limit={data.limit}
        offset={data.offset}
        basePath="/admin/billing"
        params={params}
      />
    </div>
  );
}
