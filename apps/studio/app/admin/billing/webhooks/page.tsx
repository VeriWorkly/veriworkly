import type { Metadata } from "next";
import Link from "next/link";

import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import AdminUserLink from "@/components/admin/AdminUserLink";
import { WebhookReplayAction } from "@/app/admin/billing/BillingActions";

import {
  fetchAdminBillingSummary,
  fetchAdminWebhooks,
} from "@/features/admin/services/admin-server";
import type { AdminWebhookRow } from "@/features/admin/types/admin-types";
import { formatDateTime, formatNumber, truncate } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Webhooks",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Failed", value: "FAILED" },
      { label: "Processing", value: "PROCESSING" },
      { label: "Processed", value: "PROCESSED" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminWebhookRow>> = [
  {
    key: "event",
    header: "Event",
    render: (row) => (
      <div className="min-w-0">
        <p className="text-foreground truncate font-medium">{row.type}</p>
        <p className="text-muted truncate font-mono text-xs">{row.providerEventId}</p>
      </div>
    ),
  },
  {
    key: "user",
    header: "Account",
    hideOnMobile: true,
    render: (row) =>
      row.user ? (
        <AdminUserLink user={row.user} />
      ) : (
        <span className="text-muted text-xs">Unmatched</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="space-y-1">
        <AdminStatusBadge status={row.status} />
        {row.retryCount > 0 ? <p className="text-muted text-xs">{row.retryCount} retries</p> : null}
      </div>
    ),
  },
  {
    key: "error",
    header: "Error",
    hideOnMobile: true,
    className: "max-w-xs",
    render: (row) => (
      <span className="text-destructive text-xs">{row.error ? truncate(row.error, 80) : "—"}</span>
    ),
  },
  {
    key: "received",
    header: "Received",
    hideOnMobile: true,
    render: (row) => <span className="text-muted text-xs">{formatDateTime(row.createdAt)}</span>,
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (row) => <WebhookReplayAction id={row.id} status={row.status} />,
  },
];

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [summary, data] = await Promise.all([
    fetchAdminBillingSummary(),
    fetchAdminWebhooks(params),
  ]);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Billing webhooks"
      description="The provider event log. A failed event usually means an account did not get the access it paid for — replay it once the underlying cause is fixed."
      actions={
        <Link href="/admin/billing" className="text-accent text-sm font-semibold">
          ← Billing
        </Link>
      }
      summary={
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="Failed"
            value={formatNumber(summary.webhooks.byStatus.FAILED ?? 0)}
            tone={(summary.webhooks.byStatus.FAILED ?? 0) > 0 ? "critical" : "default"}
          />
          <AdminStatCard
            label="Processing"
            value={formatNumber(summary.webhooks.byStatus.PROCESSING ?? 0)}
            tone={(summary.webhooks.byStatus.PROCESSING ?? 0) > 0 ? "warning" : "default"}
          />
          <AdminStatCard
            label="Processed"
            value={formatNumber(summary.webhooks.byStatus.PROCESSED ?? 0)}
            tone="positive"
          />
        </section>
      }
      basePath="/admin/billing/webhooks"
      params={params}
      searchPlaceholder="Provider event id, error text, or account email"
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No webhook events match these filters."
    />
  );
}
