import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import AdminUserLink, { isDeletedAccount } from "@/components/admin/AdminUserLink";
import { WithdrawalActions } from "@/app/admin/affiliates/AffiliateActions";

import { fetchAdminWithdrawals } from "@/features/admin/services/admin-server";
import type { AdminWithdrawalRow } from "@/features/admin/types/admin-types";
import { formatCents, formatDateTime, truncate } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";
import { pluralize } from "@/lib/pluralize";

export const metadata: Metadata = {
  title: "Admin · Withdrawals",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Requested", value: "REQUESTED" },
      { label: "Approved", value: "APPROVED" },
      { label: "Paid", value: "PAID" },
      { label: "Rejected", value: "REJECTED" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminWithdrawalRow>> = [
  {
    key: "affiliate",
    header: "Affiliate",
    render: (row) => (
      <AdminUserLink
        user={row.user}
        href={row.user ? `/admin/affiliates/${encodeURIComponent(row.user.id)}` : undefined}
        detail={`${row.user?.email} · ${row.user?.affiliateCode || "no code"}`}
      />
    ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (row) => (
      <div>
        <p className="text-foreground font-medium">{formatCents(row.amountCents, row.currency)}</p>
        {row.user && !isDeletedAccount(row.user) ? (
          <p className="text-muted text-xs">
            {formatCents(row.user.affiliateWallet?.availableCents ?? 0)} still available
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "note",
    header: "Payout note",
    hideOnMobile: true,
    render: (row) => <span className="text-muted text-xs">{truncate(row.payoutNote, 40)}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="space-y-1">
        <AdminStatusBadge status={row.status} />
        <p className="text-muted text-xs">requested {formatDateTime(row.createdAt)}</p>
      </div>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (row) =>
      // The server refuses every change to a deleted account's withdrawal.
      !row.user || isDeletedAccount(row.user) ? (
        <span className="text-muted text-xs">Read-only</span>
      ) : (
        <WithdrawalActions
          id={row.id}
          status={row.status}
          amountCents={row.amountCents}
          currency={row.currency}
          email={row.user.email}
        />
      ),
  },
];

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminWithdrawals(params);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Affiliate withdrawals"
      description="Approve payout requests, then record the transfer once it has actually been sent. Approving reserves the balance; marking paid closes the request."
      actions={
        <Link href="/admin/affiliates" className="text-accent text-sm font-semibold">
          ← Affiliates
        </Link>
      }
      basePath="/admin/affiliates/withdrawals"
      params={params}
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No withdrawal requests match these filters."
      caption={`${pluralize(data.total, "matching request")}, ${formatCents(data.totalAmountCents)} requested in all${params.status ? "" : " (every status, rejected included)"}. Payouts are sent out of band — this queue records the decision and the transfer.`}
    />
  );
}
