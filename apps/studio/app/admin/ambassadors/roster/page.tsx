import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";

import { fetchAdminAmbassadorRoster } from "@/features/admin/services/admin-server";
import type { AdminAmbassadorRosterRow } from "@/features/admin/types/admin-types";
import { formatDate, formatNumber } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Ambassador roster",
  robots: { index: false, follow: false },
};

const columns: Array<AdminTableColumn<AdminAmbassadorRosterRow>> = [
  {
    key: "ambassador",
    header: "Ambassador",
    render: (row) => (
      <div className="min-w-0">
        <Link
          href={`/admin/users/${encodeURIComponent(row.id)}`}
          className="text-foreground font-medium hover:underline"
        >
          {row.name || row.email}
        </Link>
        <p className="text-muted truncate text-xs">{row.email}</p>
      </div>
    ),
  },
  {
    key: "college",
    header: "College",
    render: (row) => (
      <div>
        <p className="text-foreground text-sm">{row.ambassadorApplication?.collegeName ?? "—"}</p>
        <p className="text-muted text-xs">
          {row.ambassadorApplication?.graduationYear
            ? `Class of ${row.ambassadorApplication.graduationYear}`
            : ""}
        </p>
      </div>
    ),
  },
  {
    key: "social",
    header: "Social",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{row.ambassadorApplication?.socialHandle || "—"}</span>
    ),
  },
  {
    key: "referrals",
    header: "Referrals",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-foreground text-sm">{formatNumber(row._count.affiliateReferrals)}</span>
    ),
  },
  {
    key: "affiliate",
    header: "Affiliate",
    hideOnMobile: true,
    render: (row) => <AdminStatusBadge status={row.affiliateStatus} />,
  },
  {
    key: "approved",
    header: "Approved",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">
        {formatDate(row.ambassadorApplication?.reviewedAt)}
      </span>
    ),
  },
];

export default async function AdminAmbassadorRosterPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminAmbassadorRoster(params);

  return (
    <AdminListPage
      eyebrow="People"
      title="Ambassador roster"
      description="Everyone currently holding the AMBASSADOR role, with the campus they represent and how many referrals they have driven."
      actions={
        <Link href="/admin/ambassadors" className="text-accent text-sm font-semibold">
          ← Back to applications
        </Link>
      }
      basePath="/admin/ambassadors/roster"
      params={params}
      searchPlaceholder="Name, email, or college"
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No active ambassadors yet."
    />
  );
}
