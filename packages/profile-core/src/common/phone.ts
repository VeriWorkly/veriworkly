import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

/**
 * Phone numbers, for every country. One definition, shared by the studio, the server, and
 * the portfolio.
 *
 * The canonical stored format is E.164 (`+442079460958`): one string, no separate country
 * column, and the country stays recoverable via `parsePhoneNumber(value).country`.
 *
 * A value is valid when any of these hold:
 *   (a) it is empty — phone is optional, and blank means "not provided", not "invalid";
 *   (b) it starts with "+" and libphonenumber accepts it;
 *   (c) LEGACY: it contains no "+" and is 7-15 bare digits.
 *
 * Rule (c) exists because rows already stored hold bare local numbers whose country nobody
 * recorded. They stay valid and are never rewritten: guessing a country code would silently
 * reassign real users' numbers to the wrong country.
 */
const legacyPhonePattern = /^\d{7,15}$/;

export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

/** Rule (c): a stored number from before country codes were captured. */
export function isLegacyUnqualifiedPhone(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed.includes("+") && legacyPhonePattern.test(trimmed);
}

export function isValidPhoneValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("+")) {
    return isValidPhoneNumber(trimmed);
  }

  return isLegacyUnqualifiedPhone(trimmed);
}

/**
 * Storage normalisation: E.164 for anything that parses, the value unchanged for a legacy
 * bare number. Never strips the leading "+" — doing that is what silently corrupted every
 * international number on save.
 */
export function normalizePhoneValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    try {
      return parsePhoneNumber(trimmed).format("E.164");
    } catch {
      // Unparseable input is the validator's problem to report, not this function's to
      // silently rewrite; hand it back so the user still sees what they typed.
      return trimmed;
    }
  }

  return trimmed;
}

/** International spacing for display. Legacy values are shown exactly as stored. */
export function formatPhoneForDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return trimmed;

  try {
    return parsePhoneNumber(trimmed).formatInternational();
  } catch {
    return trimmed;
  }
}

/**
 * Import-side normalisation, for values that came from a model or a scraped page rather
 * than from a field the user typed. Unlike {@link normalizePhoneValue} it drops anything it
 * cannot recognise: an import is a bulk operation nobody reviews field by field, so a
 * garbled number is worse than a blank one. Never returns undefined — `basics.phone` is a
 * required string, and an undefined there is what made imported profiles fail to parse.
 */
export function sanitizeImportedPhone(phone?: string | null): string {
  if (!phone) return "";

  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    try {
      const parsed = parsePhoneNumber(trimmed);
      return parsed.isValid() ? parsed.format("E.164") : "";
    } catch {
      return "";
    }
  }

  const bareDigits = trimmed.replace(/\D/g, "");
  if (isLegacyUnqualifiedPhone(bareDigits)) {
    return bareDigits;
  }

  return "";
}
