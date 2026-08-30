import type { NextFunction, Request, Response } from "express";

import { AtsQuotaService } from "#services/ats/quota";
import { AtsResumeExtractService } from "#services/ats/resumeExtract";
import { createSuccessResponse, ApiError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

export class AtsExtractController {
  /**
   * Extraction is the most expensive unauthenticated operation on the server — it hands an
   * attacker-supplied 5 MB file to a PDF/DOCX parser — so it must not be free to call in a loop.
   * It has its own quota bucket (AtsQuotaService.consumeExtract), separate from the scan quota,
   * so uploading a file never eats into the caller's remaining check/analyze allowance.
   */
  static async extract(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ApiError(400, "Provide a resume file.");

      const quota = await AtsQuotaService.consumeExtract(req.authUser?.id, ip(req));
      // `layout` carries the page geometry measured during parsing. The client echoes it back
      // with the scan so the format checks can run on the document as it was actually laid out,
      // not just on the text that fell out of it.
      const { text, layout } = await AtsResumeExtractService.extract(req.file);

      res.json(createSuccessResponse({ text, layout, quota }));
    } catch (error) {
      next(error);
    }
  }
}
