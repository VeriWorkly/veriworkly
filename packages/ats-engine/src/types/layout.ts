/**
 * Geometry recovered while parsing an uploaded document, for the checks that text cannot answer.
 *
 * `columnRatio` is the share of content lines whose text items are separated by a horizontal gap
 * wide enough to read as a column gutter — the signature of a two-column layout, a sidebar, or a
 * floating text box, all of which extract in a scrambled order. `tableCount` is the number of
 * ruled table grids found by tracing the page's vector drawing operators.
 *
 * Absent for pasted text and Studio documents, which have no geometry to measure; the rules that
 * depend on it are then omitted from the report rather than assumed to pass.
 */
export type AtsLayoutSignals = {
  /** `null` when the document had too few content lines for the ratio to mean anything. */
  columnRatio: number | null;
  tableCount: number;
  pageCount: number;
  /** Images at least 80px a side — a photo, rarely a logo. Absent when it was not measured. */
  imageCount?: number;
  /**
   * Characters drawn so a reader cannot see them while an ATS still reads them: in the page's
   * own colour or near it, too small to read, off the page, invisible, or under an image.
   */
  hiddenTextChars?: number;
  /** The start of that hidden text, so the report can quote it back. */
  hiddenTextSample?: string;
  /** Pages with no text layer at all: a scan, or a page exported as a picture. */
  imageOnlyPages?: number;
  /**
   * The file's title, subject, keywords and author fields. Never scored as resume text — an ATS
   * does not index them — but read for instructions aimed at an AI, which hide there.
   */
  metadataText?: string;
};
