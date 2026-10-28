import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import AdminUserLink, { isDeletedAccount } from "@/components/admin/AdminUserLink";
import { CommissionActions, CommissionCreateForm } from "@/app/admin/affiliates/AffiliateActions";

import { fetchAdminCommissions } from "@/features/admin/services/admin-server";
import type { AdminCommissionRow } from "@/features/admin/types/admin-types";
import { formatCents, formatDateTime } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";
import { pluralize } from "@/lib/pluralize";

export const metadata: Metadata = {
  title: "Admin · Commissions",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Pending", value: "PENDING" },
      { label: "Available", value: "AVAILABLE" },
      { label: "Paid", value: "PAID" },
      { label: "Reversed", value: "REVERSED" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminCommissionRow>> = [
  {
    key: "affiliate",
    header: "Affiliate",
    render: (row) => (
      <AdminUserLink
        user={row.affiliate}
        href={
          row.affiliate ? `/admin/affiliates/${encodeURIComponent(row.affiliate.id)}` : undefined
        }
        detail={row.affiliate?.affiliateCode || "no code"}
      />
    ),
  },
  {
    key: "referred",
    header: "Referred user",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">
        {row.referral?.referredUser.email ?? "Deleted account"}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Commission",
    render: (row) => (
      <div>
        <p className="text-foreground font-medium">{formatCents(row.amountCents, row.currency)}</p>
        <p className="text-muted text-xs">{(row.rateBps / 100).toFixed(1)}% rate</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="space-y-1">
        <AdminStatusBadge status={row.status} />
        <p className="text-muted text-xs">{formatDateTime(row.createdAt)}</p>
      </div>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (row) =>
      // The server refuses every change to a deleted account's commission.
      isDeletedAccount(row.affiliate) ? (
        <span className="text-muted text-xs">Read-only</span>
      ) : (
        <CommissionActions
          id={row.id}
          status={row.status}
          amountCents={row.amountCents}
          currency={row.currency}
          rateBps={row.rateBps}
          referredUserId={row.referral?.referredUser.id ?? null}
          providerPaymentId={row.providerPaymentId}
          subscriptionId={row.subscriptionId}
          affiliateActive={row.affiliateStatus === "ACTIVE"}
        />
      ),
  },
];

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminCommissions(params);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Affiliate commissions"
      description="Release pending commissions once the underlying payment has settled, or reverse them if it was refunded."
      actions={
        <Link href="/admin/affiliates" className="text-accent text-sm font-semibold">
          ← Affiliates
        </Link>
      }
      aside={{
        title: "Manual commission",
        description:
          "For a payment that never produced a webhook. The referral must already exist and the affiliate must be active.",
        form: <CommissionCreateForm />,
      }}
      basePath="/admin/affiliates/commissions"
      params={params}
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No commissions match these filters."
      caption={`${pluralize(data.total, "matching commission")}; ${formatCents(data.totalAmountCents)} of them in USD (other currencies are not added in${params.status ? "" : "; reversed ones are"}).`}
    />
  );
}
