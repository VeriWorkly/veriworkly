import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AdminAuditList from "@/components/admin/AdminAuditList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import Panel from "@/components/admin/Panel";
import AmbassadorReviewActions from "@/app/admin/ambassadors/AmbassadorReviewActions";

import {
  fetchAdminAmbassadorApplication,
  loadAdminDetail,
} from "@/features/admin/services/admin-server";
import { formatDateTime } from "@/features/admin/utils/admin-format";
import { accountName } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin · Ambassador application",
  robots: { index: false, follow: false },
};

/** The application questions, in the order the applicant answered them. */
const ANSWER_FIELDS: Array<{
  key: "whyJoin" | "superpower" | "funFact" | "vibeCheck";
  label: string;
}> = [
  { key: "whyJoin", label: "Why they want to join" },
  { key: "superpower", label: "Their superpower" },
  { key: "funFact", label: "Fun fact" },
  { key: "vibeCheck", label: "Vibe check" },
];

export default async function AdminAmbassadorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await loadAdminDetail(fetchAdminAmbassadorApplication(id));
  if (!data) notFound();

  const { application, reviewer, auditEntries } = data;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Ambassador application"
        title={accountName(application.user.name) ?? application.user.email}
        description={`${application.collegeName} · Class of ${application.graduationYear} · submitted ${formatDateTime(application.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge status={application.status} />
            <AmbassadorReviewActions
              applicationId={application.id}
              status={application.status}
              applicantEmail={application.user.email}
            />
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Panel className="space-y-5 rounded-xl p-4">
            <h3 className="text-foreground font-semibold tracking-tight">Application</h3>

            {ANSWER_FIELDS.map((field) => {
              const answer = application[field.key];
              if (!answer) return null;

              return (
                <div key={field.key} className="space-y-1">
                  <p className="text-muted text-xs font-medium tracking-wide uppercase">
                    {field.label}
                  </p>
                  <p className="text-foreground text-sm leading-6 whitespace-pre-wrap">{answer}</p>
                </div>
              );
            })}

            {application.socialHandle ? (
              <div className="space-y-1">
                <p className="text-muted text-xs font-medium tracking-wide uppercase">Social</p>
                <p className="text-foreground text-sm">{application.socialHandle}</p>
              </div>
            ) : null}
          </Panel>

          {application.status !== "PENDING" ? (
            <Panel className="space-y-2 rounded-xl p-4">
              <h3 className="text-foreground font-semibold tracking-tight">Review</h3>

              <p className="text-muted text-sm">
                {application.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                {reviewer?.email ?? "an admin"} on {formatDateTime(application.reviewedAt)}.
              </p>

              {application.reviewNote ? (
                <p className="text-foreground text-sm leading-6">{application.reviewNote}</p>
              ) : null}
            </Panel>
          ) : null}

          <AdminAuditList
            title="Audit history"
            emptyMessage="No admin actions on this application yet."
            entries={auditEntries}
          />
        </div>

        <Panel className="h-fit space-y-3 rounded-xl p-4">
          <h3 className="text-foreground font-semibold tracking-tight">Applicant</h3>

          <Link
            href={`/admin/users/${encodeURIComponent(application.user.id)}`}
            className="text-accent text-sm font-medium hover:underline"
          >
            Open full account →
          </Link>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Email</dt>
              <dd className="text-foreground truncate">{application.user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Current role</dt>
              <dd>
                <AdminStatusBadge status={application.user.role} />
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
