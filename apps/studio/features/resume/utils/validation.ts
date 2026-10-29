import type { ResumeBasics, ResumeEducationItem, ResumeProjectItem } from "@/types/resume";
import {
  isEmail,
  isHttpUrl,
  isYearDate,
  isValidPhoneValue,
  VALIDATION_MESSAGES,
} from "@/features/documents/validation/rules";

export type { ValidationErrors } from "@/features/documents/validation/rules";

import type { ValidationErrors } from "@/features/documents/validation/rules";

/*
 * Only the rules a template needs to print a field correctly: a contact detail that works
 * and a date it can read. Every field is optional — the templates leave out whatever is
 * blank — so nothing here demands a value, and a student's first blank resume is not wrong.
 */

export function validateBasics(basics: ResumeBasics): ValidationErrors<"email" | "phone"> {
  const errors: ValidationErrors<"email" | "phone"> = {};

  if (basics.email.trim() && !isEmail(basics.email)) {
    errors.email = VALIDATION_MESSAGES.email;
  }

  if (basics.phone.trim() && !isValidPhoneValue(basics.phone)) {
    errors.phone = VALIDATION_MESSAGES.phone;
  }

  return errors;
}

export function validateEducation(
  item: ResumeEducationItem,
): ValidationErrors<"startDate" | "endDate"> {
  const errors: ValidationErrors<"startDate" | "endDate"> = {};

  if (!isYearDate(item.startDate)) {
    errors.startDate = "Use YYYY format.";
  }

  if (!isYearDate(item.endDate) && !item.current) {
    errors.endDate = "Use YYYY format.";
  } else if (!item.current && endBeforeStartError(item.startDate, item.endDate)) {
    errors.endDate = endBeforeStartError(item.startDate, item.endDate);
  }

  return errors;
}

/**
 * Advice, never a block (S-413): an end before the start prints as "Feb 2023 – May 2021". Both
 * dates in the same form (YYYY or YYYY-MM) compare as text; anything else is left alone.
 */
export function endBeforeStartError(startDate: string, endDate: string): string | undefined {
  const start = startDate.trim();
  const end = endDate.trim();

  if (!start || !end || start.length !== end.length || end >= start) return undefined;
  if (!/^\d{4}(-\d{2})?$/.test(start) || !/^\d{4}(-\d{2})?$/.test(end)) return undefined;

  return "Ends before it starts. Check the start and end dates.";
}

export function validateProject(item: ResumeProjectItem): ValidationErrors<"link"> {
  const errors: ValidationErrors<"link"> = {};

  if (!isHttpUrl(item.link)) {
    errors.link = VALIDATION_MESSAGES.url;
  }

  return errors;
}
