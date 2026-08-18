import type { DocumentLinkItem } from "@/features/documents/core/link-types";

/**
 * Field rules shared by every document editor.
 *
 * The rules themselves now live in `@veriworkly/profile-core` — they are not resume-specific
 * (an email is an email) and they are not studio-specific either: the server validates the
 * same fields with the same predicates, and until the package existed the two copies had
 * drifted apart. Re-exported here so the studio's existing import sites are unchanged, and
 * so there is still one obvious place to look for "how does this app validate a field".
 *
 * What stays local is what genuinely belongs to the editors: the link-item check, which
 * takes a `DocumentLinkItem`, and the `ValidationErrors` shape the form components consume.
 */
export {
  isEmail,
  isEmailOrEmpty,
  isHttpUrl,
  isMonthDate,
  isYearDate,
  isValidPhoneValue,
  normalizePhoneValue,
  formatPhoneForDisplay,
  isLegacyUnqualifiedPhone,
  countPhoneDigits,
  monthDatePattern,
  yearDatePattern,
  VALIDATION_MESSAGES,
} from "@veriworkly/profile-core";

import { isHttpUrl, VALIDATION_MESSAGES } from "@veriworkly/profile-core";

export type ValidationErrors<T extends string> = Partial<Record<T, string>>;

/**
 * Link-item validation, shared by the resume and cover-letter link editors — both render
 * the same `LinksEditor`, and a malformed URL becomes a broken anchor in the HTML export
 * for either type.
 */
export function validateLinkItem(item: DocumentLinkItem): ValidationErrors<"label" | "url"> {
  const errors: ValidationErrors<"label" | "url"> = {};

  if (!isHttpUrl(item.url)) {
    errors.url = VALIDATION_MESSAGES.url;
  }

  return errors;
}
