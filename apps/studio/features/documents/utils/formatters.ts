// Pure, and shared: the public share page normalises a shared resume on the server too.

export function safeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

/** How a document prints a month: "Mar 2022", "03/2022" or "2022-03". Stored per document. */
export const DOCUMENT_DATE_FORMATS = ["MMM YYYY", "MM/YYYY", "YYYY-MM"] as const;

export type DocumentDateFormat = (typeof DOCUMENT_DATE_FORMATS)[number];

export const DEFAULT_DOCUMENT_DATE_FORMAT: DocumentDateFormat = "MMM YYYY";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A stored format, or the default for a document written before the choice existed. */
export function toDocumentDateFormat(value: unknown): DocumentDateFormat {
  return DOCUMENT_DATE_FORMATS.find((format) => format === value) ?? DEFAULT_DOCUMENT_DATE_FORMAT;
}

/**
 * One stored date as the document prints it. Only a complete `YYYY-MM`, what the month
 * inputs write, is reformatted; a year, a hand-typed "Spring 2019" or an invalid month is
 * printed as typed, because guessing at it could print a date the user never meant.
 */
export function formatDocumentDate(
  value: string,
  format: DocumentDateFormat = DEFAULT_DOCUMENT_DATE_FORMAT,
): string {
  const text = safeText(value);
  const match = /^(\d{4})-(\d{2})$/.exec(text);
  const month = match ? Number(match[2]) : 0;

  if (!match || month < 1 || month > 12) return text;

  if (format === "MM/YYYY") return `${match[2]}/${match[1]}`;
  if (format === "YYYY-MM") return text;
  return `${SHORT_MONTHS[month - 1]} ${match[1]}`;
}

/**
 * Renders only the date parts the user actually filled in — never a placeholder like
 * "Start"/"End". A resume export must never contain literal placeholder text; if both
 * dates are empty (and the entry isn't marked "current"), this returns "" so callers
 * can omit the date line entirely instead of printing a fake range.
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  current: boolean,
  format: DocumentDateFormat = DEFAULT_DOCUMENT_DATE_FORMAT,
): string {
  const start = formatDocumentDate(startDate, format);
  const end = current ? "Present" : formatDocumentDate(endDate, format);

  if (start && end) return `${start} – ${end}`;
  return start || end;
}

const LANGUAGE_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;

/** A typed language as a tag: "de_DE", the POSIX locale form, is read as "de-DE". */
function toLanguageTag(value: unknown): string {
  return typeof value === "string" ? value.trim().replaceAll("_", "-") : "";
}

export const LANGUAGE_TAG_ERROR =
  "Not a language code. Use one like en, de or pt-BR; exports say English until it is fixed.";

/** Whether the editor can use what was typed: a BCP-47 tag, or nothing (English). */
export function isDocumentLanguage(value: unknown): boolean {
  const tag = toLanguageTag(value);

  return !tag || LANGUAGE_TAG.test(tag);
}

/**
 * The document's language as a BCP-47 tag for `<html lang>`, English when none is set. The
 * value is user input written into markup, so anything not shaped like a tag is refused.
 */
export function toDocumentLanguage(value: unknown): string {
  const tag = toLanguageTag(value);

  return LANGUAGE_TAG.test(tag) ? tag : "en";
}

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

/** `<html dir>` for the document's language: right to left for Arabic, Hebrew, Persian, Urdu. */
export function documentDirection(value: unknown): "rtl" | "ltr" {
  const primary = toDocumentLanguage(value).split("-")[0].toLowerCase();

  return RTL_LANGUAGES.has(primary) ? "rtl" : "ltr";
}

/**
 * A file name from a title in any script: letters, marks and digits are kept, every other
 * run of characters becomes one "-". An ASCII-only rule turned "Résumé" into "rsum" and a
 * name in Devanagari or kanji into nothing at all.
 */
export function sanitizeFileName(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
