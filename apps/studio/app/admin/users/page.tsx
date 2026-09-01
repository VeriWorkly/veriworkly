import type { Metadata } from "next";
import Link from "next/link";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminTable, { type AdminTableColumn } from "@/components/admin/AdminTable";

import { fetchAdminUsers } from "@/features/admin/services/admin-server";
import type { AdminUserRow } from "@/features/admin/types/admin-types";
import { formatDate, formatNumber } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Users",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "role",
    label: "Role",
    options: [
      { label: "Any role", value: "" },
      { label: "User", value: "USER" },
      { label: "Ambassador", value: "AMBASSADOR" },
      { label: "Admin", value: "ADMIN" },
    ],
  },
  {
    name: "subscription",
    label: "Subscription",
    options: [
      { label: "Any", value: "" },
      { label: "Active", value: "ACTIVE" },
      { label: "Past due", value: "PAST_DUE" },
      { label: "Canceled", value: "CANCELED" },
      { label: "No subscription", value: "NONE" },
    ],
  },
  {
    name: "affiliateStatus",
    label: "Affiliate",
    options: [
      { label: "Any", value: "" },
      { label: "Not enrolled", value: "NOT_ENROLLED" },
      { label: "Pending", value: "PENDING" },
      { label: "Active", value: "ACTIVE" },
      { label: "Suspended", value: "SUSPENDED" },
    ],
  },
  {
    name: "sort",
    label: "Sort",
    options: [
      { label: "Newest", value: "newest" },
      { label: "Oldest", value: "oldest" },
      { label: "Name", value: "name" },
      { label: "Email", value: "email" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminUserRow>> = [
  {
    key: "user",
    header: "User",
    render: (user) => (
      <div className="min-w-0">
        <Link
          href={`/admin/users/${user.id}`}
          className="text-foreground font-medium hover:underline"
        >
          {user.name || user.email}
        </Link>
        <p className="text-muted truncate text-xs">{user.email}</p>
      </div>
    ),
  },
  { key: "role", header: "Role", render: (user) => <AdminStatusBadge status={user.role} /> },
  {
    key: "subscription",
    header: "Plan",
    hideOnMobile: true,
    render: (user) =>
      user.subscription ? (
        <div className="space-y-1">
          <AdminStatusBadge status={user.subscription.status} />
          <p className="text-muted text-xs">{user.subscription.productKey}</p>
        </div>
      ) : (
        <span className="text-muted text-xs">Free</span>
      ),
  },
  {
    key: "portfolio",
    header: "Portfolio",
    hideOnMobile: true,
    render: (user) =>
      user.portfolioPublication ? (
        <div className="space-y-1">
          <span className="text-foreground text-xs">{user.portfolioPublication.subdomain}</span>
          <AdminStatusBadge status={user.portfolioPublication.status} />
        </div>
      ) : (
        <span className="text-muted text-xs">—</span>
      ),
  },
  {
    key: "affiliate",
    header: "Affiliate",
    hideOnMobile: true,
    render: (user) => <AdminStatusBadge status={user.affiliateStatus} />,
  },
  {
    key: "activity",
    header: "Docs / Credits",
    hideOnMobile: true,
    render: (user) => (
      <span className="text-muted text-xs">
        {formatNumber(user._count.resumes)} docs · {formatNumber(user.creditBalance)} cr
      </span>
    ),
  },
  {
    key: "joined",
    header: "Joined",
    hideOnMobile: true,
    render: (user) => <span className="text-muted text-xs">{formatDate(user.createdAt)}</span>,
  },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminUsers(params);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="People"
        title="Users"
        description="Search every account, inspect a full billing and content history, and change roles or revoke sessions."
      />

      <AdminFilterBar
        basePath="/admin/users"
        searchPlaceholder="Email, name, username, user id, or affiliate code"
        selects={FILTERS}
      />

      <AdminTable
        columns={columns}
        rows={data.items}
        rowKey={(user) => user.id}
        emptyMessage="No users match these filters."
      />

      <AdminPagination
        total={data.total}
        limit={data.limit}
        offset={data.offset}
        basePath="/admin/users"
        params={params}
      />
    </div>
  );
}
