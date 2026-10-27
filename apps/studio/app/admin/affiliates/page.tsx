import type { Metadata } from "next";
import Link from "next/link";

import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import { AffiliateStandingActions } from "@/app/admin/affiliates/AffiliateActions";

import {
  fetchAdminAffiliateSummary,
  fetchAdminAffiliates,
} from "@/features/admin/services/admin-server";
import type { AdminAffiliateRow } from "@/features/admin/types/admin-types";
import { formatCents, formatNumber } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Affiliates",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Enrolled", value: "" },
      { label: "Active", value: "ACTIVE" },
      { label: "Pending", value: "PENDING" },
      { label: "Suspended", value: "SUSPENDED" },
    ],
  },
  {
    name: "tier",
    label: "Tier",
    options: [
      { label: "Any tier", value: "" },
      { label: "Tier 1", value: "TIER_1" },
      { label: "Tier 2", value: "TIER_2" },
      { label: "Tier 3", value: "TIER_3" },
    ],
  },
  {
    name: "sort",
    label: "Sort",
    options: [
      { label: "Newest", value: "newest" },
      { label: "Top earners", value: "earnings" },
      { label: "Most referrals", value: "referrals" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminAffiliateRow>> = [
  {
    key: "affiliate",
    header: "Affiliate",
    render: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/affiliates/${encodeURIComponent(row.id)}`}
          className="text-foreground font-medium hover:underline"
        >
          {row.name || row.email}
        </Link>
        <p className="text-muted truncate text-xs">
          {row.email} · {row.affiliateCode || "no code"}
        </p>
      </div>
    ),
  },
  {
    key: "tier",
    header: "Tier",
    render: (row) => <AdminStatusBadge status={row.affiliateTier} />,
  },
  {
    key: "traffic",
    header: "Clicks / Referrals",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">
        {formatNumber(row._count.affiliateClicks)} / {formatNumber(row._count.affiliateReferrals)}
      </span>
    ),
  },
  {
    key: "pending",
    header: "Pending",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-foreground text-sm">
        {formatCents(row.affiliateWallet?.pendingCents ?? 0)}
      </span>
    ),
  },
  {
    key: "available",
    header: "Available",
    render: (row) => (
      <span className="text-foreground text-sm">
        {formatCents(row.affiliateWallet?.availableCents ?? 0)}
      </span>
    ),
  },
  {
    key: "paid",
    header: "Paid",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-sm">{formatCents(row.affiliateWallet?.paidCents ?? 0)}</span>
    ),
  },
  {
    key: "actions",
    header: "Standing",
    className: "text-right",
    render: (row) => (
      <AffiliateStandingActions
        userId={row.id}
        status={row.affiliateStatus}
        tier={row.affiliateTier}
        email={row.email}
      />
    ),
  },
];

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [summary, data] = await Promise.all([
    fetchAdminAffiliateSummary(),
    fetchAdminAffiliates(params),
  ]);

  const pendingCommissions = summary.commissionsByStatus.PENDING;

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Affiliate program"
      description="Moderate affiliate standing, review commissions, and work the payout queue."
      actions={
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link href="/admin/affiliates/commissions" className="text-accent">
            Commissions
          </Link>
          <Link href="/admin/affiliates/withdrawals" className="text-accent">
            Withdrawals
          </Link>
          <Link href="/admin/affiliates/referrals" className="text-accent">
            Referrals
          </Link>
        </div>
      }
      summary={
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Active affiliates"
            value={formatNumber(summary.affiliatesByStatus.ACTIVE ?? 0)}
            hint={`${formatNumber(summary.affiliatesByStatus.SUSPENDED ?? 0)} suspended`}
          />
          <AdminStatCard
            label="Owed to affiliates"
            value={formatCents(summary.wallets.pendingCents + summary.wallets.availableCents)}
            hint={`${formatCents(summary.wallets.availableCents)} withdrawable now`}
          />
          <AdminStatCard
            label="Withdrawals waiting"
            value={formatNumber(summary.pendingWithdrawals.count)}
            hint={formatCents(summary.pendingWithdrawals.amountCents)}
            tone={summary.pendingWithdrawals.count > 0 ? "warning" : "default"}
            href="/admin/affiliates/withdrawals?status=REQUESTED"
          />
          <AdminStatCard
            label="Commissions to review"
            value={formatNumber(pendingCommissions?.count ?? 0)}
            hint={formatCents(pendingCommissions?.amountCents ?? 0)}
            tone={(pendingCommissions?.count ?? 0) > 0 ? "warning" : "default"}
            href="/admin/affiliates/commissions?status=PENDING"
          />
        </section>
      }
      basePath="/admin/affiliates"
      params={params}
      searchPlaceholder="Email, name, affiliate code, or user id"
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No affiliates match these filters."
      caption={`${formatNumber(summary.totalClicks)} tracked clicks across the program.`}
    />
  );
}
