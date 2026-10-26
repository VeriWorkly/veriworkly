/**
 * The printed page box, shared by every document type.
 *
 * A4 at 96dpi is 793.71 x 1122.52 CSS px (595.28 x 841.89 pt). Resumes used to
 * floor the height to 1122 while cover letters ceiled it to 1123 — the same
 * physical page described by two different numbers, which meant a preview page
 * break could land differently between document types for no reason. One constant
 * now. The height is floored, so the preview box can never be taller than the PDF
 * page it represents (a preview that is 1px too tall hides a sliver of content; one
 * that is 1px too short only breaks marginally early). The width is rounded up: the
 * page is 595.5 x 841.5 pt, 0.22 pt wider and 0.39 pt shorter than A4.
 *
 * PDF templates state the size in points via {@link pxToPt} rather than `size="A4"`,
 * so both sides derive from these same numbers.
 */
export const DOCUMENT_PAGE_WIDTH_PX = 794;
export const DOCUMENT_PAGE_HEIGHT_PX = 1122;

/** CSS px -> PDF points. */
const DOCUMENT_PDF_SCALE = 72 / 96;

export function pxToPt(value: number): number {
  return value * DOCUMENT_PDF_SCALE;
}

export const DOCUMENT_PAGE_WIDTH_PT = pxToPt(DOCUMENT_PAGE_WIDTH_PX);
export const DOCUMENT_PAGE_HEIGHT_PT = pxToPt(DOCUMENT_PAGE_HEIGHT_PX);
