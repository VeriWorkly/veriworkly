"use client";

import { useId, useState } from "react";

import { TextArea } from "@veriworkly/ui";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import { ADMIN_REASON_MAX_LENGTH, isAdminReasonValid } from "@/components/admin/admin-reason";
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
 * One review decision. The review note goes to the applicant; the audit reason (V-081) stays in
 * the admin audit log, so the two are separate fields.
 */
function ReviewDecision({
  applicationId,
  action,
  noteRequired,
  notePlaceholder,
  ...dialog
}: {
  applicationId: string;
  action: "APPROVE" | "REJECT";
  noteRequired: boolean;
  notePlaceholder: string;
  trigger: string;
  triggerVariant?: "primary";
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const noteValid = isAdminReasonValid(note, { required: noteRequired, minLength: 3 });
  const showNoteError = note.length > 0 && !noteValid;

  return (
    <AdminActionDialog
      {...dialog}
      reasonLabel="Internal audit reason"
      reasonPlaceholder="Why you decided this. Kept in the admin audit log; the applicant never sees it."
      confirmDisabled={!noteValid}
      onClosed={() => setNote("")}
      onConfirm={async (reason) => {
        await reviewAdminAmbassadorApplication(applicationId, action, reason, note);
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-muted text-xs font-medium">
          Review note (visible to the applicant)
          {noteRequired ? <span className="text-destructive"> *</span> : null}
        </label>

        <TextArea
          id={noteId}
          rows={3}
          value={note}
          maxLength={ADMIN_REASON_MAX_LENGTH}
          placeholder={notePlaceholder}
          aria-required={noteRequired}
          aria-invalid={showNoteError}
          aria-describedby={showNoteError ? `${noteId}-error` : undefined}
          onChange={(event) => setNote(event.target.value)}
        />

        {showNoteError ? (
          <p id={`${noteId}-error`} className="text-warning text-xs">
            Give at least 3 characters.
          </p>
        ) : null}
      </div>
    </AdminActionDialog>
  );
}

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
      <ReviewDecision
        applicationId={applicationId}
        action="APPROVE"
        trigger="Approve"
        triggerVariant="primary"
        title="Approve this ambassador"
        description={`${applicantEmail} will be promoted to the AMBASSADOR role. ${decisionNotice(applicantEmail)}`}
        confirmLabel="Approve application"
        notePlaceholder="Optional. Shown to the applicant and stored on the application."
        noteRequired={false}
      />

      <ReviewDecision
        applicationId={applicationId}
        action="REJECT"
        trigger="Reject"
        title="Reject this application"
        description={`${applicantEmail} keeps their current role and can re-apply later. ${decisionNotice(applicantEmail)}`}
        confirmLabel="Reject application"
        notePlaceholder="Explain the decision. The applicant can see this."
        noteRequired
      />
    </div>
  );
};

export default AmbassadorReviewActions;
