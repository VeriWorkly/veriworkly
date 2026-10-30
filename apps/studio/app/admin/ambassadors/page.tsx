import type { Metadata } from "next";
import Link from "next/link";

import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminListPage from "@/components/admin/AdminListPage";
import type { AdminTableColumn } from "@/components/admin/AdminTable";
import AmbassadorReviewActions from "@/app/admin/ambassadors/AmbassadorReviewActions";

import {
  fetchAdminAmbassadorApplications,
  fetchAdminAmbassadorSummary,
} from "@/features/admin/services/admin-server";
import type { AdminAmbassadorRow } from "@/features/admin/types/admin-types";
import { formatNumber, formatRelativeTime, truncate } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";
import { accountName } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin · Ambassadors",
  robots: { index: false, follow: false },
};

const FILTERS = [
  {
    name: "status",
    label: "Status",
    options: [
      { label: "Any status", value: "" },
      { label: "Pending", value: "PENDING" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" },
    ],
  },
  {
    name: "sort",
    label: "Sort",
    options: [
      { label: "Newest", value: "newest" },
      { label: "Oldest first", value: "oldest" },
    ],
  },
];

const columns: Array<AdminTableColumn<AdminAmbassadorRow>> = [
  {
    key: "applicant",
    header: "Applicant",
    render: (application) => (
      <div className="min-w-0">
        <Link
          href={`/admin/ambassadors/${encodeURIComponent(application.id)}`}
          className="text-foreground font-medium hover:underline"
        >
          {accountName(application.user.name) ?? application.user.email}
        </Link>
        <p className="text-muted truncate text-xs">{application.user.email}</p>
      </div>
    ),
  },
  {
    key: "college",
    header: "College",
    render: (application) => (
      <div>
        <p className="text-foreground text-sm">{application.collegeName}</p>
        <p className="text-muted text-xs">Class of {application.graduationYear}</p>
      </div>
    ),
  },
  {
    key: "why",
    header: "Why they applied",
    hideOnMobile: true,
    className: "max-w-xs",
    render: (application) => (
      <p className="text-muted text-xs leading-5">{truncate(application.whyJoin, 110)}</p>
    ),
  },
  {
    key: "social",
    header: "Social",
    hideOnMobile: true,
    render: (application) => (
      <span className="text-muted text-xs">{application.socialHandle || "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (application) => (
      <div className="space-y-1">
        <AdminStatusBadge status={application.status} />
        <p className="text-muted text-xs">{formatRelativeTime(application.createdAt)}</p>
      </div>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "text-right",
    render: (application) => (
      <AmbassadorReviewActions
        applicationId={application.id}
        status={application.status}
        applicantEmail={application.user.email}
      />
    ),
  },
];

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = toSingleValueParams(await searchParams);

  const [summary, data] = await Promise.all([
    fetchAdminAmbassadorSummary(),
    fetchAdminAmbassadorApplications(params),
  ]);

  return (
    <AdminListPage
      eyebrow="People"
      title="Campus ambassadors"
      description="Review applications, approve or reject with a note, and see who currently holds the ambassador role."
      actions={
        <Link href="/admin/ambassadors/roster" className="text-accent text-sm font-semibold">
          View roster →
        </Link>
      }
      summary={
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard
            label="Pending review"
            value={formatNumber(summary.pending)}
            tone={summary.pending > 0 ? "warning" : "default"}
            href="/admin/ambassadors?status=PENDING"
          />
          <AdminStatCard label="Approved" value={formatNumber(summary.approved)} tone="positive" />
          <AdminStatCard label="Rejected" value={formatNumber(summary.rejected)} />
          <AdminStatCard
            label="Active ambassadors"
            value={formatNumber(summary.activeAmbassadors)}
            href="/admin/ambassadors/roster"
          />
          <AdminStatCard
            label="Applications (7d)"
            value={formatNumber(summary.applicationsLast7Days)}
          />
        </section>
      }
      basePath="/admin/ambassadors"
      params={params}
      searchPlaceholder="College, applicant email, name, or social handle"
      filters={FILTERS}
      page={data}
      columns={columns}
      rowKey={(application) => application.id}
      emptyMessage="No applications match these filters."
    />
  );
}
