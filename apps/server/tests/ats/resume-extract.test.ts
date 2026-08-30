import { beforeEach, describe, expect, it, vi } from "vitest";

const extractInChildProcessMock = vi.fn();

vi.mock("#lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("#services/ats/extractPool", () => ({
  extractInChildProcess: extractInChildProcessMock,
  stopExtractPool: vi.fn(),
}));

const { AtsResumeExtractService } = await import("#services/ats/resumeExtract");
const { ApiError } = await import("#lib/errors");

function file(buffer: Buffer, originalname: string, mimetype: string) {
  return { buffer, originalname, mimetype } as Express.Multer.File;
}

const RESUME = "Jane Doe, backend engineer with eight years of Node.js and Postgres experience.";

/**
 * Extraction runs in a separate OS process rather than a worker thread. Worker threads share the
 * parent's V8 process, and repeatedly spawning threads that load pdf.js segfaults Node (verified
 * on v24.18.0: a hard crash within 2-5 spawns). These tests pin the routing decisions around
 * that boundary; the pool's own lifecycle is exercised separately.
 */
describe("AtsResumeExtractService", () => {
  beforeEach(() => {
    extractInChildProcessMock.mockReset();
    extractInChildProcessMock.mockResolvedValue({ text: RESUME });
  });

  it("routes PDFs to the extraction process", async () => {
    await AtsResumeExtractService.extract(file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf"));

    expect(extractInChildProcessMock).toHaveBeenCalledWith("pdf", expect.any(Buffer));
  });

  it("routes DOCX by mime type and by extension", async () => {
    await AtsResumeExtractService.extract(
      file(
        Buffer.from("PK"),
        "cv.bin",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(extractInChildProcessMock).toHaveBeenLastCalledWith("docx", expect.any(Buffer));

    await AtsResumeExtractService.extract(
      file(Buffer.from("PK"), "cv.docx", "application/octet-stream"),
    );
    expect(extractInChildProcessMock).toHaveBeenLastCalledWith("docx", expect.any(Buffer));
  });

  it("handles plain text inline without paying for IPC", async () => {
    const { text, layout } = await AtsResumeExtractService.extract(
      file(Buffer.from(RESUME), "cv.txt", "text/plain"),
    );

    expect(text).toContain("Jane Doe");
    // Plain text has no geometry to measure, so no layout signal is reported at all.
    expect(layout).toBeUndefined();
    expect(extractInChildProcessMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported types before spawning anything", async () => {
    await expect(
      AtsResumeExtractService.extract(
        file(Buffer.from("MZ"), "cv.exe", "application/octet-stream"),
      ),
    ).rejects.toThrow(/PDF, DOCX, TXT/);

    expect(extractInChildProcessMock).not.toHaveBeenCalled();
  });

  it("rejects PDF files that yield too little readable text with actionable OCR diagnostic guidance", async () => {
    extractInChildProcessMock.mockResolvedValue({ text: "hi" });

    await expect(
      AtsResumeExtractService.extract(file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf")),
    ).rejects.toThrow(/scanned image or flattened graphic/);
  });

  it("rejects non-PDF files that yield too little readable text with standard message", async () => {
    await expect(
      AtsResumeExtractService.extract(file(Buffer.from("hi"), "cv.txt", "text/plain")),
    ).rejects.toThrow(/enough readable text/);
  });

  it("truncates very long documents to the character cap", async () => {
    extractInChildProcessMock.mockResolvedValue({ text: "a".repeat(120_000) });

    const { text } = await AtsResumeExtractService.extract(
      file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf"),
    );

    expect(text.length).toBe(50_000);
  });

  it("passes through pool ApiErrors so timeouts and backpressure keep their status codes", async () => {
    extractInChildProcessMock.mockRejectedValue(
      new ApiError(408, "Resume extraction took too long to process."),
    );

    await expect(
      AtsResumeExtractService.extract(file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf")),
    ).rejects.toMatchObject({ statusCode: 408 });

    extractInChildProcessMock.mockRejectedValue(
      new ApiError(503, "Too many resume extractions in progress. Please retry shortly."),
    );

    await expect(
      AtsResumeExtractService.extract(file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf")),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("converts unexpected failures into a 400 rather than leaking internals", async () => {
    extractInChildProcessMock.mockRejectedValue(new Error("EPIPE writing to child"));

    await expect(
      AtsResumeExtractService.extract(file(Buffer.from("%PDF-"), "cv.pdf", "application/pdf")),
    ).rejects.toMatchObject({ statusCode: 400, message: "Resume file could not be read." });
  });
});
