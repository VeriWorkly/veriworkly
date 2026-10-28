"use client";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { reviewAdminAmbassadorApplication } from "@/features/admin/services/admin-actions";

interface AmbassadorReviewActionsProps {
  applicationId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  applicantEmail: string;
}

/** The server emails every decision with the review note (`sendAmbassadorDecisionEmail`). */
const decisionNotice = (email: string) =>
  `${email} is emailed the decision, with your note, and also sees it on their ambassador page.`;

/**
 * Approve/reject controls for one application.
 *
 * The server rejects a second review of an already-decided application, so the buttons are
 * hidden once a decision exists rather than shown-and-failing.
 */
const AmbassadorReviewActions = ({
  applicationId,
  status,
  applicantEmail,
}: AmbassadorReviewActionsProps) => {
  if (status !== "PENDING") {
    return <span className="text-muted text-xs">Reviewed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AdminActionDialog
        trigger="Approve"
        triggerVariant="primary"
        title="Approve this ambassador"
        description={`${applicantEmail} will be promoted to the AMBASSADOR role. ${decisionNotice(applicantEmail)}`}
        confirmLabel="Approve application"
        reasonLabel="Review note"
        reasonPlaceholder="Shown to the applicant and stored on the application."
        reasonRequired={false}
        onConfirm={async (reason) => {
          await reviewAdminAmbassadorApplication(applicationId, "APPROVE", reason || undefined);
        }}
      />

      <AdminActionDialog
        trigger="Reject"
        title="Reject this application"
        description={`${applicantEmail} keeps their current role and can re-apply later. ${decisionNotice(applicantEmail)}`}
        confirmLabel="Reject application"
        reasonLabel="Review note"
        reasonPlaceholder="Explain the decision — the applicant can see this."
        onConfirm={async (reason) => {
          await reviewAdminAmbassadorApplication(applicationId, "REJECT", reason);
        }}
      />
    </div>
  );
};

export default AmbassadorReviewActions;
