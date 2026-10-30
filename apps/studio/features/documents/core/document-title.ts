/**
 * The longest title the documents API accepts (`documentValidator`: trimmed, 1 to 255). A
 * longer or blank one saved on the device, and then every backup of it was refused (S-405).
 */
export const DOCUMENT_TITLE_MAX_LENGTH = 255;

/** `title` as the server accepts it: trimmed, cut to the limit, `fallback` when blank. */
export function toDocumentTitle(title: string, fallback: string): string {
  const trimmed = title.trim().slice(0, DOCUMENT_TITLE_MAX_LENGTH).trim();

  return trimmed || fallback;
}
