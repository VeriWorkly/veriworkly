"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, Modal, TextArea } from "@veriworkly/ui";

import type { ButtonVariant } from "@veriworkly/ui";

import {
  ADMIN_REASON_MAX_LENGTH,
  describeAdminActionError,
  isAdminReasonValid,
} from "@/components/admin/admin-reason";
import { createRequestId } from "@/features/ai/ai-api";

interface AdminActionDialogProps {
  /** Label on the button that opens the dialog. */
  trigger: ReactNode;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  disabled?: boolean;

  title: string;
  description?: ReactNode;
  /** Extra context rendered above the reason field (the row being acted on, warnings). */
  children?: ReactNode;

  confirmLabel: string;
  confirmVariant?: ButtonVariant;

  /**
   * Requires the operator to retype this exact string before the action can run. Used for
   * irreversible actions (account deletion, a portfolio takedown, a share-link or API-key revoke)
   * where a misclick must not be sufficient. What was typed, trimmed, reaches `onConfirm` as
   * `confirmation`, for the endpoints that check it again (V-082 `confirm`).
   */
  confirmPhrase?: string;
  confirmPhraseLabel?: string;

  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Off for the few endpoints whose reason field is genuinely optional. */
  reasonRequired?: boolean;
  /** The server's minimum for this action's reason (3 for most, more where it is shown to a user). */
  minReasonLength?: number;
  /** Off for an endpoint that takes no reason at all, so the dialog does not ask for one. */
  askReason?: boolean;
  /** Holds the confirm button back while a field of the caller's own (in `children`) is invalid. */
  confirmDisabled?: boolean;
  /** Runs whenever the dialog closes (cancel or success), to reset the caller's own fields. */
  onClosed?: () => void;

  /**
   * `attemptKey` is created when the dialog opens and reused for every retry until it closes,
   * so an endpoint that accepts an idempotency key applies a retried submit only once.
   */
  onConfirm: (reason: string, attemptKey: string, confirmation: string) => Promise<unknown>;
}

/**
 * The single confirmation surface for destructive and semi-destructive admin actions.
 *
 * It exists because every admin mutation on the server demands an audit reason, and a bare
 * `onClick` handler gives the operator nowhere to type one. Bundling the reason field with
 * the confirmation step means the audit trail is populated by construction rather than by
 * whoever remembered to add a prompt.
 */
const AdminActionDialog = ({
  trigger,
  triggerVariant = "secondary",
  triggerClassName,
  disabled,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = "primary",
  confirmPhrase,
  confirmPhraseLabel,
  reasonLabel = "Audit reason",
  reasonPlaceholder = "Why are you doing this? Recorded in the admin audit log.",
  reasonRequired = true,
  minReasonLength = 3,
  askReason = true,
  confirmDisabled = false,
  onClosed,
  onConfirm,
}: AdminActionDialogProps) => {
  const router = useRouter();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [attemptKey, setAttemptKey] = useState("");
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const reasonSatisfied =
    !askReason ||
    isAdminReasonValid(reason, { required: reasonRequired, minLength: minReasonLength });
  const phraseSatisfied = !confirmPhrase || phrase.trim() === confirmPhrase;

  const close = () => {
    if (pending) return;

    setOpen(false);
    setReason("");
    setPhrase("");
    setError("");
    onClosed?.();
  };

  const submit = async () => {
    if (!reasonSatisfied || !phraseSatisfied || confirmDisabled) return;

    setPending(true);
    setError("");

    try {
      await onConfirm(reason.trim(), attemptKey, phrase.trim());

      setOpen(false);
      setReason("");
      setPhrase("");
      onClosed?.();

      // Re-fetch the server component that rendered this row so the table reflects the change.
      router.refresh();
    } catch (cause) {
      const failure = describeAdminActionError(cause);
      if (failure.clearConfirmation) setPhrase("");
      setError(failure.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant={triggerVariant}
        className={triggerClassName}
        disabled={disabled}
        onClick={() => {
          // Not `crypto.randomUUID`: it does not exist on a plain-HTTP origin (LAN, self-host).
          setAttemptKey(createRequestId());
          setOpen(true);
        }}
      >
        {trigger}
      </Button>

      <Modal open={open} onClose={close}>
        <Modal.Content titleId={titleId} className="md:max-w-md">
          <Modal.Header>
            <Modal.Title id={titleId}>{title}</Modal.Title>
            {description ? <Modal.Description>{description}</Modal.Description> : null}
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {children}

            {askReason ? (
              <div className="space-y-1.5">
                <label htmlFor={`${titleId}-reason`} className="text-muted text-xs font-medium">
                  {reasonLabel}
                  {reasonRequired ? <span className="text-destructive"> *</span> : null}
                </label>

                <TextArea
                  id={`${titleId}-reason`}
                  rows={3}
                  value={reason}
                  maxLength={ADMIN_REASON_MAX_LENGTH}
                  placeholder={reasonPlaceholder}
                  onChange={(event) => setReason(event.target.value)}
                />

                {reason.length > 0 && !reasonSatisfied ? (
                  <p className="text-warning text-xs">
                    Give at least {minReasonLength} characters of context.
                  </p>
                ) : null}
              </div>
            ) : null}

            {confirmPhrase ? (
              <div className="space-y-1.5">
                <label htmlFor={`${titleId}-phrase`} className="text-muted text-xs font-medium">
                  {confirmPhraseLabel ?? `Type ${confirmPhrase} to confirm`}
                </label>

                <Input
                  id={`${titleId}-phrase`}
                  inputSize="sm"
                  value={phrase}
                  autoComplete="off"
                  onChange={(event) => setPhrase(event.target.value)}
                />
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-destructive/25 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
              >
                {error}
              </p>
            ) : null}
          </Modal.Body>

          <Modal.Footer className="-mx-6 -mb-6 rounded-b-3xl">
            <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
              Cancel
            </Button>

            <Button
              size="sm"
              variant={confirmVariant}
              loading={pending}
              disabled={!reasonSatisfied || !phraseSatisfied || confirmDisabled}
              onClick={() => void submit()}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
};

export default AdminActionDialog;
