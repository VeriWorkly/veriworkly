import type { CoverLetterContent } from "./types";

import {
  isEmail,
  isHttpUrl,
  isValidPhoneValue,
  VALIDATION_MESSAGES,
  type ValidationErrors,
} from "@/features/documents/validation/rules";

export type CoverLetterFieldError = "senderEmail" | "senderPhone" | "senderWebsite";

/**
 * Advisory inline errors for the cover letter's contact fields.
 *
 * The panel collects an email, a phone number, a website and a list of URLs, and validated
 * none of them — on a document whose entire purpose is being contacted back, so a typo
 * reached the exported PDF and DOCX unchallenged. The plumbing was already there and
 * simply unused: `TextInputField` takes an `error`, `Field` renders it, `invalidClass`
 * styles the input.
 *
 * Same severity model as the resume: these never block saving or exporting. Same messages
 * too, from the shared rules module, so the two editors describe the same problem
 * identically. Link URLs are validated by the shared `LinksEditor` rather than here.
 *
 * Blank is not an error — unlike the resume's `validateBasics`, every one of these fields
 * is genuinely optional on a cover letter.
 */
export function validateCoverLetterContent(
  content: CoverLetterContent,
): ValidationErrors<CoverLetterFieldError> {
  const errors: ValidationErrors<CoverLetterFieldError> = {};

  if (content.senderEmail.trim() && !isEmail(content.senderEmail)) {
    errors.senderEmail = VALIDATION_MESSAGES.email;
  }

  if (content.senderPhone.trim() && !isValidPhoneValue(content.senderPhone)) {
    errors.senderPhone = VALIDATION_MESSAGES.phone;
  }

  // `senderWebsite` is routinely entered bare ("veriworkly.com"), which the templates
  // normalise to https:// on render — so only flag a value that is not a URL at all.
  if (content.senderWebsite.trim() && !isHttpUrl(`https://${stripScheme(content.senderWebsite)}`)) {
    errors.senderWebsite = VALIDATION_MESSAGES.url;
  }

  return errors;
}

function stripScheme(value: string) {
  return value.trim().replace(/^https?:\/\//i, "");
}
