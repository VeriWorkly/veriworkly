import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const consumeExtract = vi.fn();
const refundExtract = vi.fn();
const extract = vi.fn();

vi.mock("#services/ats/quota", () => ({
  AtsQuotaService: {
    consumeExtract: (...args: unknown[]) => consumeExtract(...args),
    refundExtract: (...args: unknown[]) => refundExtract(...args),
  },
}));
vi.mock("#services/ats/resumeExtract", () => ({
  AtsResumeExtractService: { extract: (...args: unknown[]) => extract(...args) },
  UNSUPPORTED_RESUME_FORMAT: "Upload a PDF, DOCX, HTML, TXT, Markdown, or JSON resume.",
}));
vi.mock("#utils/requestIp", () => ({
  getRequestIpDetails: vi.fn(() => ({ resolvedIp: "203.0.113.20" })),
}));

const { AtsExtractController } = await import("#controllers/ats/extractController");

function upload(originalname: string, mimetype: string) {
  return {
    file: { originalname, mimetype, buffer: Buffer.from("not a resume") },
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  consumeExtract.mockResolvedValue({ extract: { limit: 3, used: 1, remaining: 2 } });
  extract.mockResolvedValue({ text: "Jane Doe" });
});

/**
 * V-328: an anonymous visitor has three uploads per 48 hours. A file of a type the server cannot
 * read at all is refused before one of them is spent, as `/ats/check` validates before metering.
 */
describe("POST /ats/extract meters only a file it can read", () => {
  it.each([
    ["photo.png", "image/png"],
    ["resume.pages", "application/octet-stream"],
  ])("refuses %s with 400 and spends no upload", async (name, mimetype) => {
    const next = vi.fn() as unknown as NextFunction;

    await AtsExtractController.extract(upload(name, mimetype), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(consumeExtract).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
  });

  it("meters a supported file before extracting it", async () => {
    const json = vi.fn();
    await AtsExtractController.extract(
      upload("resume.pdf", "application/pdf"),
      { json } as unknown as Response,
      vi.fn() as unknown as NextFunction,
    );

    expect(consumeExtract).toHaveBeenCalledTimes(1);
    expect(extract).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalled();
  });
});
