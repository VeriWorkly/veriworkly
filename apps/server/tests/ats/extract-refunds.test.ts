import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "#lib/errors";

/**
 * V-386: an upload is refunded only when the server, not the file, failed it (503: the queue was
 * full or extraction was unavailable). A file that could not be read (400), took too long (408)
 * or was too complex (422) keeps its charge, so a hostile file cannot be retried for free
 * (`AtsQuotaService.refundExtract`).
 */
const consumeExtract = vi.fn(async () => ({ tier: "anonymous" }));
const refundExtract = vi.fn(async () => undefined);
const extract = vi.fn();

vi.mock("#services/ats/quota", () => ({ AtsQuotaService: { consumeExtract, refundExtract } }));
vi.mock("#services/ats/resumeExtract", () => ({
  AtsResumeExtractService: { extract },
  UNSUPPORTED_RESUME_FORMAT: "Upload a PDF, DOCX, TXT, Markdown, or JSON resume.",
}));
vi.mock("#utils/requestIp", () => ({
  getRequestIpDetails: () => ({ resolvedIp: "203.0.113.9" }),
}));

const { AtsExtractController } = await import("#controllers/ats/extractController");

function upload() {
  const req = {
    file: { originalname: "resume.pdf", mimetype: "application/pdf", buffer: Buffer.from("%PDF") },
    authUser: undefined,
  } as unknown as Request;
  const res = { json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe("AtsExtractController upload refunds (V-386)", () => {
  beforeEach(() => {
    extract.mockReset();
  });

  it("refunds the upload once when extraction answers 503", async () => {
    extract.mockRejectedValue(new ApiError(503, "Too many resume extractions in progress."));
    const { req, res, next } = upload();

    await AtsExtractController.extract(req, res, next);

    expect(refundExtract).toHaveBeenCalledTimes(1);
    expect(refundExtract).toHaveBeenCalledWith(undefined, "203.0.113.9");
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it.each([400, 408, 422])("keeps the charge when extraction answers %i", async (status) => {
    extract.mockRejectedValue(new ApiError(status, "The file failed."));
    const { req, res, next } = upload();

    await AtsExtractController.extract(req, res, next);

    expect(consumeExtract).toHaveBeenCalledTimes(1);
    expect(refundExtract).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: status }));
  });

  it("keeps the charge on success", async () => {
    extract.mockResolvedValue({ text: "resume text", layout: undefined });
    const { req, res, next } = upload();

    await AtsExtractController.extract(req, res, next);

    expect(refundExtract).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
  });
});
