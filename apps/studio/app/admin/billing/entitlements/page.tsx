import type { Metadata } from "next";
import Link from "next/link";

import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import AdminUserLink, { isDeletedAccount } from "@/components/admin/AdminUserLink";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import { EntitlementGrantForm, EntitlementRevokeAction } from "@/app/admin/billing/BillingActions";

import { fetchAdminEntitlements } from "@/features/admin/services/admin-server";
import type { AdminEntitlementRow } from "@/features/admin/types/admin-types";
import { formatDate, humanizeKey } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Entitlements",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "key",
    label: "Entitlement",
    options: [
      { label: "Any", value: "" },
      { label: "Portfolio publish", value: "portfolio_publish" },
      { label: "AI credits", value: "ai_credits" },
      { label: "SEO controls", value: "seo_controls" },
      { label: "Analytics", value: "analytics" },
      { label: "Watermark removal", value: "watermark_removal" },
    ],
  },
  {
    name: "active",
    label: "State",
    options: [
      { label: "Any", value: "" },
      { label: "Active only", value: "true" },
      { label: "Expired or revoked", value: "false" },
    ],
  },
];

/** An entitlement is live only when it has started, has not been revoked, and has not lapsed. */
function isActive(grant: AdminEntitlementRow) {
  if (grant.revokedAt) return false;
  if (new Date(grant.startsAt).getTime() > Date.now()) return false;

  return !grant.endsAt || new Date(grant.endsAt).getTime() > Date.now();
}

const columns: Array<AdminTableColumn<AdminEntitlementRow>> = [
  {
    key: "user",
    header: "Account",
    render: (row) => <AdminUserLink user={row.user} />,
  },
  {
    key: "key",
    header: "Entitlement",
    render: (row) => (
      <div>
        <p className="text-foreground text-sm">{humanizeKey(row.key)}</p>
        <p className="text-muted text-xs">{humanizeKey(row.source)}</p>
      </div>
    ),
  },
  {
    key: "window",
    header: "Window",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">
        {formatDate(row.startsAt)} → {row.endsAt ? formatDate(row.endsAt) : "no expiry"}
      </span>
    ),
  },
  {
    key: "state",
    header: "State",
    render: (row) => (
      <AdminStatusBadge
        status={
          row.revokedAt
            ? "REVOKED"
            : isActive(row)
              ? "ACTIVE"
              : row.endsAt && new Date(row.endsAt).getTime() <= Date.now()
                ? "EXPIRED"
                : "INACTIVE"
        }
      />
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (row) => (
      <EntitlementRevokeAction
        id={row.id}
        entitlementKey={row.key}
        revoked={Boolean(row.revokedAt)}
        source={row.source}
        expired={Boolean(row.endsAt && new Date(row.endsAt).getTime() <= Date.now())}
        deleted={isDeletedAccount(row.user)}
      />
    ),
  },
];

export default async function AdminEntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);
  const data = await fetchAdminEntitlements(params);

  return (
    <AdminListPage
      eyebrow="Revenue"
      title="Entitlements"
      description="Feature access grants, whether they came from a subscription or a manual override. Revoking one takes effect immediately."
      actions={
        <Link href="/admin/billing" className="text-accent text-sm font-semibold">
          ← Billing
        </Link>
      }
      aside={{
        title: "Grant entitlement",
        description:
          "A manual grant sits alongside subscription-derived access rather than replacing it. Leave the date empty for a permanent grant.",
        form: <EntitlementGrantForm />,
      }}
      basePath="/admin/billing/entitlements"
      params={params}
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="No entitlement grants match these filters."
    />
  );
}
