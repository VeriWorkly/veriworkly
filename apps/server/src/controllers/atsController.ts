import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AtsAiService } from "#services/atsAiService";
import { AtsJobFetchService } from "#services/atsJobFetchService";
import { AtsQuotaService } from "#services/atsQuotaService";
import { AtsResumeExtractService } from "#services/atsResumeExtractService";
import { AtsScoringService } from "#services/atsScoringService";
import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";
import { atsAnalyzeSchema, atsCheckSchema, atsConvertResumeSchema } from "#validators/atsValidator";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

export class AtsController {
  static async extract(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ApiError(400, "Provide a resume file.");
      res.json(createSuccessResponse({ text: await AtsResumeExtractService.extract(req.file) }));
    } catch (error) {
      next(error);
    }
  }

  static async quota(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await AtsQuotaService.summary(req.authUser?.id, ip(req))));
    } catch (error) {
      next(error);
    }
  }

  static async check(req: Request, res: Response, next: NextFunction) {
    try {
      const input = atsCheckSchema.parse(req.body);
      const quota = await AtsQuotaService.consume(req.authUser?.id, ip(req));
      res.json(
        createSuccessResponse({
          report: AtsScoringService.check(input.resume, input.jobDescription),
          ai: null,
          creditsSpent: 0,
          quota,
        }),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const input = atsAnalyzeSchema.parse(req.body);
      if (input.fetchJobUrl && !input.jobUrl)
        throw new ApiError(400, "Provide a job URL to analyze online.");
      const jobDescription =
        input.fetchJobUrl && input.jobUrl
          ? await AtsJobFetchService.fetch(input.jobUrl)
          : input.jobDescription;
      const quota = await AtsQuotaService.consume(user.id, ip(req));
      const report = AtsScoringService.check(input.resume, jobDescription);
      const result = await AtsAiService.analyze(
        user.id,
        input.requestId,
        input.resume,
        jobDescription,
        report,
        input.fetchJobUrl,
      );
      res.json(createSuccessResponse({ report, ...result, quota }));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  static async convertResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const input = atsConvertResumeSchema.parse(req.body);
      const result = await AtsAiService.convertResume(user.id, input.requestId, input.resume);

      res.json(createSuccessResponse(result));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
