import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

import { extractInChildProcess } from "#services/ats/extractPool";
import type { AtsExtractFormat, AtsExtractLayout } from "#services/ats/extractChild";

const MAX_TEXT_CHARS = 50_000;

/**
 * `layout` is present only for formats whose geometry can be measured, and only when the
 * document had enough content to measure. Everything downstream treats its absence as "not
 * known" rather than "fine".
 */
export type AtsExtractResult = { text: string; layout?: AtsExtractLayout };

function detectFormat(file: Express.Multer.File): AtsExtractFormat {
  const name = file.originalname.toLowerCase();

  if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) return "pdf";

  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";

  if (file.mimetype.startsWith("text/") || /\.(txt|md|json)$/i.test(name)) return "text";

  throw new ApiError(400, "Upload a PDF, DOCX, TXT, Markdown, or JSON resume.");
}

function normalize(text: string, format?: AtsExtractFormat) {
  const value = text
    .replace(/\0/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (value.length < 50) {
    if (format === "pdf") {
      throw new ApiError(
        400,
        "This PDF appears to be a scanned image or flattened graphic without an embedded text layer. Real ATS parsers cannot read scanned resumes without OCR. Please export your resume as a text-based PDF or Word document.",
      );
    }
    throw new ApiError(400, "Resume file did not contain enough readable text.");
  }

  return value.slice(0, MAX_TEXT_CHARS);
}

export class AtsResumeExtractService {
  /**
   * Parses in a separate process so a pathological file cannot stall the event loop.
   *
   * The previous implementation raced the parse against a timer on the main thread: the caller
   * got a tidy 408, but pdf-parse kept chewing CPU with no way to stop it, so one crafted upload
   * could stall every concurrent request on the process. The extraction process can actually be
   * killed, which is what makes the timeout mean something.
   */
  static async extract(file: Express.Multer.File): Promise<AtsExtractResult> {
    const format = detectFormat(file);

    // Plain text needs no parser, so it skips the IPC round trip entirely.
    if (format === "text") return { text: normalize(file.buffer.toString("utf8"), format) };

    try {
      const { text, layout } = await extractInChildProcess(format, file.buffer);
      return { text: normalize(text, format), layout };
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
