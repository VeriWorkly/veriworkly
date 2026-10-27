import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";

import { fetchAdminUsers } from "@/features/admin/services/admin-server";
import type { AdminUserRow } from "@/features/admin/types/admin-types";
import { formatDate, formatNumber, humanizeKey } from "@/features/admin/utils/admin-format";
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
          href={`/admin/users/${encodeURIComponent(user.id)}`}
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
    // Only the live subscription: this list cannot see passes or credit packs, so a row without
    // one is not called "Free" (a payer must never read as free). The user page has the access.
    header: "Subscription",
    hideOnMobile: true,
    render: (user) =>
      user.subscription ? (
        <div className="space-y-1">
          <AdminStatusBadge status={user.subscription.status} />
          <p className="text-muted text-xs">{humanizeKey(user.subscription.productKey)}</p>
        </div>
      ) : (
        <span className="text-muted text-xs">None</span>
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
    <AdminListPage
      eyebrow="People"
      title="Users"
      description="Search every account, inspect a full billing and content history, and change roles or revoke sessions."
      basePath="/admin/users"
      params={params}
      searchPlaceholder="Email, name, username, user id, or affiliate code"
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(user) => user.id}
      emptyMessage="No users match these filters."
    />
  );
}
