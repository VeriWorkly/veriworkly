import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";

import { fetchAdminReferrals } from "@/features/admin/services/admin-server";
import type { AdminReferralRow } from "@/features/admin/types/admin-types";
import { formatDateTime, formatRelativeTime } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";
import { accountName } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin · Referrals",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Signed up", value: "SIGNED_UP" },
      { label: "Converted", value: "CONVERTED" },
      { label: "Rejected", value: "REJECTED" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminReferralRow>> = [
  {
    key: "affiliate",
    header: "Affiliate",
    render: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/affiliates/${encodeURIComponent(row.affiliate.id)}`}
          className="text-foreground font-medium hover:underline"
        >
          {accountName(row.affiliate.name) ?? row.affiliate.email}
        </Link>
        <p className="text-muted truncate text-xs">{row.code}</p>
      </div>
    ),
  },
  {
    key: "referred",
    header: "Referred user",
    render: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/users/${encodeURIComponent(row.referredUser.id)}`}
          className="text-foreground text-sm hover:underline"
        >
          {accountName(row.referredUser.name) ?? row.referredUser.email}
        </Link>
        <p className="text-muted truncate text-xs">
          joined {formatRelativeTime(row.referredUser.createdAt)}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <AdminStatusBadge status={row.status} />,
  },
  {
    key: "converted",
    header: "Converted",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">
        {row.convertedAt ? formatDateTime(row.convertedAt) : "—"}
      </span>
    ),
  },
  {
    key: "created",
    header: "Referred",
    hideOnMobile: true,
    render: (row) => <span className="text-muted text-xs">{formatDateTime(row.createdAt)}</span>,
  },
];

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminReferrals(params);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Affiliate referrals"
      description="Every signup attributed to an affiliate code, and whether it has converted into a paying customer."
      actions={
        <Link href="/admin/affiliates" className="text-accent text-sm font-semibold">
          ← Affiliates
        </Link>
      }
      basePath="/admin/affiliates/referrals"
      params={params}
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No referrals match these filters."
    />
  );
}
