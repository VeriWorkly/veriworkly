/**
 * Contact recovery.
 *
 * These patterns stay in source rather than in the policy: they match address grammars (RFC-ish
 * email, E.164-ish phone, URL) rather than any language's vocabulary, so they do not move when
 * the resume is written in another language. The policy owns words; this owns punctuation.
 */

export const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
export const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
export const LINK = /(?:https?:\/\/|www\.)[^\s|,]+|(?:linkedin\.com|github\.com)\/[^\s|,]+/gi;

/**
 * The candidate's name, taken from the top of the document.
 *
 * An ATS reads the name from the header block, so this looks only at the first few lines and
 * takes the first that reads like a person rather than a contact detail or a job title. Getting
 * this wrong is cheap — it is reported, not scored on its content — but not finding one at all
 * is worth knowing, because it usually means the name is inside an image or a text box.
 */
export function findName(lines: string[]) {
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (!trimmed || EMAIL.test(trimmed) || PHONE.test(trimmed)) continue;
    if (/\d/.test(trimmed)) continue;

    const words = trimmed.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    // Names are capitalised; an all-caps banner or a title-cased headline both qualify, which is
    // fine — anything at the very top with this shape is what the parser would take.
    if (words.every((word) => /^[A-Z][A-Za-z'’.-]*$/.test(word) || /^[A-Z.'’-]+$/.test(word)))
      return trimmed;
  }
  return "";
}
