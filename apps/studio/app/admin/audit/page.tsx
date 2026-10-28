import type { Metadata } from "next";
import Link from "next/link";

import AdminListPage from "@/components/admin/AdminListPage";
import { adminAuditTargetHref, formatAuditMetadata } from "@/components/admin/AdminAuditList";
import type { AdminTableColumn } from "@/components/admin/AdminTable";

import {
  fetchAdminAuditEntries,
  fetchAdminAuditFilters,
} from "@/features/admin/services/admin-server";
import type { AdminAuditEntry } from "@/features/admin/types/admin-types";
import { formatDateTime, humanizeKey, truncate } from "@/features/admin/utils/admin-format";
import {
  auditRangeBound,
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

export const metadata: Metadata = {
  title: "Admin · Audit log",
  robots: { index: false, follow: false },
};

const columns: Array<AdminTableColumn<AdminAuditEntry>> = [
  {
    key: "action",
    header: "Action",
    render: (entry) => (
      <div className="min-w-0">
        <p className="text-foreground font-medium">{humanizeKey(entry.action)}</p>
        <p className="text-muted font-mono text-xs">{entry.action}</p>
      </div>
    ),
  },
  {
    key: "target",
    header: "Target",
    render: (entry) => {
      const href = adminAuditTargetHref(entry);

      return (
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="text-foreground text-sm hover:underline">
              {entry.targetType}
            </Link>
          ) : (
            <p className="text-foreground text-sm">{entry.targetType}</p>
          )}
          <p className="text-muted truncate font-mono text-xs">{entry.targetId ?? "—"}</p>
        </div>
      );
    },
  },
  {
    key: "actor",
    header: "Actor",
    render: (entry) => <span className="text-muted text-xs">{entry.actor?.email ?? "system"}</span>,
  },
  {
    key: "reason",
    header: "Reason",
    hideOnMobile: true,
    className: "max-w-sm",
    render: (entry) => <span className="text-muted text-xs">{truncate(entry.reason, 90)}</span>,
  },
  {
    key: "details",
    header: "Details",
    hideOnMobile: true,
    className: "max-w-sm",
    render: (entry) => (
      <span className="text-muted font-mono text-xs break-words">
        {formatAuditMetadata(entry.metadata) || "—"}
      </span>
    ),
  },
  {
    key: "when",
    header: "When",
    render: (entry) => (
      <span className="text-muted text-xs whitespace-nowrap">
        {formatDateTime(entry.createdAt)}
      </span>
    ),
  },
];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [filters, data] = await Promise.all([
    fetchAdminAuditFilters(),
    fetchAdminAuditEntries({
      ...params,
      from: auditRangeBound(params.from, "start"),
      to: auditRangeBound(params.to, "end"),
    }),
  ]);

  // Filter options come from the server so the dropdown lists exactly the actions and target
  // types that actually exist in this deployment's log.
  const selects = [
    {
      name: "action",
      label: "Action",
      options: [
        { label: "Any action", value: "" },
        ...filters.actions.map((action) => ({ label: humanizeKey(action), value: action })),
      ],
    },
    {
      name: "targetType",
      label: "Target type",
      options: [
        { label: "Any target", value: "" },
        ...filters.targetTypes.map((type) => ({ label: type, value: type })),
      ],
    },
    {
      name: "actorId",
      label: "Actor",
      options: [
        { label: "Anyone", value: "" },
        ...filters.actors.map((actor) => ({ label: actor.email, value: actor.id })),
      ],
    },
  ];

  return (
    <AdminListPage
      eyebrow="Platform"
      title="Admin audit log"
      description="Every mutating admin action, who ran it, and the reason they gave. This is the record of what operators did — it is append-only and cannot be edited from the dashboard."
      basePath="/admin/audit"
      params={params}
      searchPlaceholder="Action, target id, or reason text"
      filters={selects}
      dateFilters={[
        { name: "from", label: "From (UTC)" },
        { name: "to", label: "To (UTC)" },
      ]}
      page={data}
      caption={
        params.targetId
          ? `Actions on ${params.targetType ?? "record"} ${params.targetId}.`
          : undefined
      }
      columns={columns}
      rowKey={(entry) => entry.id}
      emptyMessage="No audit entries match these filters."
    />
  );
}
