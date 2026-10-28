import { ApiRequestError } from "@/utils/fetchApiData";

/** The server's longest admin reason or note (`adminReasonSchema`, `adminProvidedReasonSchema`). */
export const ADMIN_REASON_MAX_LENGTH = 500;

/**
 * The server's rule for an admin audit reason: a required reason needs `minLength` characters,
 * and an optional one may be left blank but is rejected when it is shorter than that. Either way
 * it is at most 500 characters once trimmed.
 */
export function isAdminReasonValid(
  reason: string,
  { required, minLength }: { required: boolean; minLength: number },
) {
  const length = reason.trim().length;
  if (length > ADMIN_REASON_MAX_LENGTH) return false;

  return length >= minLength || (!required && length === 0);
}

/**
 * A failed admin action as the dialog shows it. The server checks the retyped identifier of a
 * destructive action (V-082) against the record as it is now: `CONFIRMATION_MISMATCH` means the
 * record changed after the page loaded, `CONFIRMATION_REQUIRED` that none arrived. Either way the
 * typed value is cleared so the admin types it again. Anything else is the server's own message.
 */
export function describeAdminActionError(cause: unknown): {
  message: string;
  clearConfirmation: boolean;
} {
  if (cause instanceof ApiRequestError && cause.code === "CONFIRMATION_MISMATCH") {
    return {
      message: `${cause.message} It may have changed since this page loaded: refresh the page and type it again.`,
      clearConfirmation: true,
    };
  }
  if (cause instanceof ApiRequestError && cause.code === "CONFIRMATION_REQUIRED") {
    return {
      message: `${cause.message} Type the identifier shown for this record to confirm, then try again.`,
      clearConfirmation: true,
    };
  }

  return {
    message: cause instanceof Error ? cause.message : "The action failed. Please try again.",
    clearConfirmation: false,
  };
}
