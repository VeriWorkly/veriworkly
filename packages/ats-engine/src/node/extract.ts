import type { AtsLayoutSignals } from "../types.js";
import { htmlText } from "../job/html.js";
import {
  MAX_DOCX_EXPANDED_BYTES,
  measureDocx,
  readableArchive,
  withinExpansionLimit,
  type DocxMeasure,
} from "./docx.js";
import { optional } from "./peer.js";
import { extractPdf } from "./pdf.js";

/**
 * Resume text and page geometry from an uploaded file.
 *
 * PDF needs `pdf-parse` and `pdfjs-dist`, DOCX needs `mammoth`. They are optional peer
 * dependencies, loaded only when a document of that format arrives, so a host that reads only
 * one format installs only what it reads.
 *
 * In-process and CPU-bound: a pathological PDF can occupy the thread for seconds. A server
 * should run this in a process it can kill (see `@veriworkly/ats-engine/node/child`); a CLI or
 * a batch job can call it directly.
 */

export type AtsResumeFormat = "pdf" | "docx" | "text";

/**
 * `layout` is present only for formats whose geometry can be measured. Downstream, its absence
 * means "not known", never "fine".
 */
export type AtsExtraction = { text: string; layout?: AtsLayoutSignals };

/** Text beyond this is not a resume; the scorer rejects longer input anyway. */
export const MAX_EXTRACTED_CHARS = 50_000;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** The format of an upload from its name and declared type, or `null` when unsupported. */
export function detectResumeFormat(fileName: string, mimeType = ""): AtsResumeFormat | null {
  const name = fileName.toLowerCase();
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mimeType === DOCX_MIME || name.endsWith(".docx")) return "docx";
  if (mimeType.startsWith("text/") || /\.(txt|md|json)$/.test(name)) return "text";
  return null;
}

/**
 * Strips NULs and collapses runs of blanks and blank lines, so the scorer sees clean lines.
 *
 * A run holding a tab becomes one tab rather than a space: a tab is the column gap a Word table
 * of contents or a text export puts between a job title and its employer, and the parser splits
 * the two there. Collapsing it to a space merged them into one title on every upload.
 */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/[ \t]+/g, (run) => (run.includes("\t") ? "\t" : " "))
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

/** What a DOCX upload that is not one fails with; the reader's own error is kept as the cause. */
const UNREADABLE_DOCX = "The document could not be read as DOCX.";

async function extractDocx(data: Uint8Array): Promise<AtsExtraction> {
  if (!readableArchive(data)) throw new Error(UNREADABLE_DOCX);
  if (!withinExpansionLimit(data))
    throw new Error(
      `The document expands to more than ${MAX_DOCX_EXPANDED_BYTES / 1024 / 1024} MB; it is not a resume.`,
    );
  const mammoth = await optional(() => import("mammoth"), "mammoth");
  // Through HTML rather than mammoth's raw text: Word keeps bullets as list numbering, not as
  // characters, and the raw text drops them, which read every bulleted DOCX resume as prose.
  // Images become empty tags instead of the embedded base64 mammoth writes by default.
  // A malformed file fails inside mammoth with whatever its parser hit — "Cannot read properties
  // of null" — which says nothing to the person who uploaded it.
  const { value: html } = await mammoth
    .convertToHtml(
      { buffer: Buffer.from(data) },
      { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
    )
    .catch((cause: unknown) => {
      throw new Error(UNREADABLE_DOCX, { cause });
    });
  // Raw text, not posting text: `extractResume` normalises it, keeping the tabs Word wrote.
  const value = htmlText(html);
  // A Word document has no page geometry, so columns stay unmeasured and that rule stays out of
  // the report. What its XML does say — tables, pictures, hidden runs — is read directly.
  let measured: DocxMeasure | null = null;
  try {
    measured = measureDocx(data);
  } catch {
    // An archive this reader cannot follow yields no signals, not a failed upload.
  }
  if (!measured) return { text: value };
  return {
    text: value,
    layout: {
      columnRatio: null,
      tableCount: measured.tableCount,
      pageCount: 0,
      imageCount: measured.imageCount,
      hiddenTextChars: measured.hiddenChars,
      hiddenTextSample: measured.hiddenSample,
    },
  };
}

/** Extracts and normalises a resume's text, with page geometry for PDFs. */
export async function extractResume(
  data: Uint8Array,
  format: AtsResumeFormat,
): Promise<AtsExtraction> {
  const raw =
    format === "pdf"
      ? await extractPdf(data, MAX_EXTRACTED_CHARS)
      : format === "docx"
        ? await extractDocx(data)
        : { text: new TextDecoder().decode(data) };
  return { ...raw, text: normalizeExtractedText(raw.text) };
}
