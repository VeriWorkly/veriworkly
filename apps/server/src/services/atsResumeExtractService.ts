import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { ApiError } from "#utils/errors";

const MAX_TEXT_CHARS = 50_000;

function normalize(text: string) {
  const value = text
    .replace(/\0/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (value.length < 50)
    throw new ApiError(400, "Resume file did not contain enough readable text.");
  return value.slice(0, MAX_TEXT_CHARS);
}

export class AtsResumeExtractService {
  static async extract(file: Express.Multer.File) {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: file.buffer });
      try {
        return normalize((await parser.getText()).text);
      } finally {
        await parser.destroy();
      }
    }

    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.toLowerCase().endsWith(".docx")
    ) {
      return normalize((await mammoth.extractRawText({ buffer: file.buffer })).value);
    }

    if (file.mimetype.startsWith("text/") || /\.(txt|md|json)$/i.test(file.originalname)) {
      return normalize(file.buffer.toString("utf8"));
    }

    throw new ApiError(400, "Upload a PDF, DOCX, TXT, Markdown, or JSON resume.");
  }
}
