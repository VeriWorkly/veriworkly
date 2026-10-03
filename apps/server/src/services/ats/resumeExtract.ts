import {
  detectResumeFormat,
  normalizeExtractedText,
  type AtsExtraction,
} from "@veriworkly/ats-engine/node";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { extractInChildProcess } from "#services/ats/extractPool";

/** Below this much text there is no resume to score: a scan, an image, or an empty file. */
const MIN_TEXT_CHARS = 50;

/** Normalised (again, cheaply: the child already did) and checked for a real text layer. */
function readable(text: string, format: string) {
  const value = normalizeExtractedText(text);
  if (value.length >= MIN_TEXT_CHARS) return value;
  if (format === "pdf")
    throw new ApiError(
      400,
      "This PDF appears to be a scanned image or flattened graphic without an embedded text layer. Real ATS parsers cannot read scanned resumes without OCR. Please export your resume as a text-based PDF or Word document.",
    );
  throw new ApiError(400, "Resume file did not contain enough readable text.");
}

export class AtsResumeExtractService {
  /**
   * Parses in a separate process so a pathological file cannot stall the event loop.
   *
   * Racing the parse against a timer on the main thread gave the caller a tidy 408 while
   * pdf-parse kept chewing CPU with no way to stop it, so one crafted upload could stall every
   * concurrent request on the process. The extraction process can actually be killed, which is
   * what makes the timeout mean something.
   */
  static async extract(file: Express.Multer.File): Promise<AtsExtraction> {
    const format = detectResumeFormat(file.originalname, file.mimetype);
    if (!format) throw new ApiError(400, "Upload a PDF, DOCX, TXT, Markdown, or JSON resume.");

    // Plain text needs no parser, so it skips the IPC round trip entirely.
    if (format === "text") return { text: readable(file.buffer.toString("utf8"), format) };

    try {
      // `layout` is absent for formats without page geometry; downstream that means "not known".
      const extracted = await extractInChildProcess(format, file.buffer);
      return { ...extracted, text: readable(extracted.text, format) };
    } catch (error) {
      if (error instanceof ApiError) throw error;

      logger.error("Resume extraction failed", {
        format,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApiError(400, "Resume file could not be read.");
    }
  }
}
