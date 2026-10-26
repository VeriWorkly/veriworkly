import type { Metadata } from "next";
import Link from "next/link";

import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import AdminUserLink from "@/components/admin/AdminUserLink";
import { CreditAdjustmentForm } from "@/app/admin/billing/BillingActions";

import {
  fetchAdminBillingSummary,
  fetchAdminCreditWallets,
} from "@/features/admin/services/admin-server";
import type { AdminCreditWalletRow } from "@/features/admin/types/admin-types";
import { formatNumber, formatRelativeTime } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Credits",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "sort",
    label: "Sort",
    options: [
      { label: "Recently active", value: "updated" },
      { label: "Highest balance", value: "balance" },
      { label: "Most spent", value: "lifetime" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminCreditWalletRow>> = [
  {
    key: "user",
    header: "Account",
    render: (row) => <AdminUserLink user={row.user} />,
  },
  {
    key: "balance",
    header: "Balance",
    render: (row) => (
      <div>
        <p className="text-foreground font-medium">{formatNumber(row.balance)}</p>
        <p className="text-muted text-xs">{formatNumber(row.reserved)} reserved</p>
      </div>
    ),
  },
  {
    key: "credited",
    header: "Lifetime granted",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-sm">{formatNumber(row.lifetimeCredited)}</span>
    ),
  },
  {
    key: "debited",
    header: "Lifetime spent",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-sm">{formatNumber(row.lifetimeDebited)}</span>
    ),
  },
  {
    key: "updated",
    header: "Last activity",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{formatRelativeTime(row.updatedAt)}</span>
    ),
  },
];

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [summary, data] = await Promise.all([
    fetchAdminBillingSummary(),
    fetchAdminCreditWallets(params),
  ]);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Credit wallets"
      description="AI credit balances across every account, and the manual adjustment tool for support refunds and goodwill grants."
      actions={
        <Link href="/admin/billing" className="text-accent text-sm font-semibold">
          ← Billing
        </Link>
      }
      summary={
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Outstanding balance"
            value={formatNumber(summary.credits.balance)}
          />
          <AdminStatCard label="Reserved" value={formatNumber(summary.credits.reserved)} />
          <AdminStatCard
            label="Granted (30d)"
            value={formatNumber(summary.credits.grantedLast30Days)}
            tone="positive"
          />
          <AdminStatCard
            label="Spent (30d)"
            value={formatNumber(summary.credits.spentLast30Days)}
          />
        </section>
      }
      aside={{
        title: "Adjust credits",
        description:
          "Positive grants, negative claws back. Every adjustment is a ledger entry the user can see in their credit history.",
        form: <CreditAdjustmentForm />,
      }}
      basePath="/admin/billing/credits"
      params={params}
      searchPlaceholder="Account email, name, or user id"
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No credit wallets match these filters."
    />
  );
}
