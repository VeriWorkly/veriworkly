"use client";

import { Select } from "@veriworkly/ui";

import { ADMIN_INPUT_CLASS } from "@/components/admin/admin-input-class";
import {
  ADMIN_CREDIT_KINDS,
  ADMIN_CUSTOMER_NOTE_MAX_LENGTH,
  type AdminCreditKind,
} from "@/features/admin/services/admin-actions";

/**
 * What adjusted credits are, and the note the customer reads in their credit history (SV-22).
 * Restoring a lost pack or plan month as goodwill would make paid credits that never expire, so
 * the kind is asked for every adjustment. Shared by the billing and user-detail credit forms.
 */
export function CreditKindFields({
  id,
  kind,
  onKindChange,
  note,
  onNoteChange,
}: {
  id: string;
  kind: AdminCreditKind;
  onKindChange: (kind: AdminCreditKind) => void;
  note: string;
  onNoteChange: (note: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Select
        aria-label="What are these credits?"
        className="h-9 text-xs"
        value={kind}
        onChange={(event) => onKindChange(event.target.value as AdminCreditKind)}
      >
        {Object.entries(ADMIN_CREDIT_KINDS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <input
        id={`${id}-customer-note`}
        className={ADMIN_INPUT_CLASS}
        aria-label="Note the customer sees (optional)"
        placeholder="Note the customer sees (optional)"
        maxLength={ADMIN_CUSTOMER_NOTE_MAX_LENGTH}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
      />
    </div>
  );
}
