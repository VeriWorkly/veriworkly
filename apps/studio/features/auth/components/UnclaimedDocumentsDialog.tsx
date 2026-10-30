"use client";

import { Button, Modal } from "@veriworkly/ui";

import type {
  UnclaimedDocuments,
  UnclaimedDocumentsChoice,
} from "@/features/documents/services/workspace-owner";

import { pluralize } from "@/lib/pluralize";

interface UnclaimedDocumentsDialogProps {
  unclaimed: UnclaimedDocuments;
  busy: boolean;
  error: string | null;
  onChoose: (choice: UnclaimedDocumentsChoice) => void;
}

/**
 * Asked once, right after a sign-in finds documents on this browser that are not yet the
 * account's: made here without signing in, or linked to a cloud document the account does not
 * have. Nothing syncs until it is answered, so it cannot be dismissed.
 */
export function UnclaimedDocumentsDialog({
  unclaimed,
  busy,
  error,
  onChoose,
}: UnclaimedDocumentsDialogProps) {
  const count = unclaimed.documents.length;
  const these = count === 1 ? "this document" : `these ${pluralize(count, "document")}`;
  const missing = unclaimed.cloudCopyMissing;

  return (
    <Modal open onClose={() => {}}>
      <Modal.Content className="max-w-md">
        <Modal.Header>
          <Modal.Title>
            {missing
              ? `Keep ${these} on this browser?`
              : `Add ${these} from this browser to your account?`}
          </Modal.Title>

          <Modal.Description>
            {missing
              ? "They were backed up to a cloud copy your account does not have; it may have been deleted. They can stay on this device as new documents. Nothing is uploaded until you choose."
              : "They were made here without signing in. Nothing is uploaded until you choose."}
          </Modal.Description>
        </Modal.Header>

        <Modal.Body className="space-y-3">
          <ul className="text-muted-foreground max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
            {unclaimed.documents.map((meta) => (
              <li key={`${meta.type}:${meta.id}`}>{meta.title}</li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            Deleting them removes the only copy: they are not saved in any account you can reach.
          </p>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </Modal.Body>

        {/* Safest choice first (top on phones, rightmost on wider screens); delete last. */}
        <Modal.Footer className="flex-col items-stretch gap-2 sm:flex-row-reverse sm:flex-wrap sm:justify-start">
          {!missing && (
            <Button loading={busy} onClick={() => onChoose("add")}>
              Add to my account
            </Button>
          )}

          <Button
            variant={missing ? undefined : "secondary"}
            loading={missing && busy}
            disabled={busy}
            onClick={() => onChoose("keep")}
          >
            Keep on this device only
          </Button>

          <Button variant="ghost" disabled={busy} onClick={() => onChoose("remove")}>
            Delete from this device
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
