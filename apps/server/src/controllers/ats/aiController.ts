import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AtsAiService } from "#services/ats/ai";
import { AtsJobFetchService } from "#services/ats/jobFetch";
import { AtsQuotaService } from "#services/ats/quota";
import { AtsScoringService } from "#services/ats/scoring";
import { shapeReport } from "#services/ats/reportShaping";
import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";
import { atsAnalyzeSchema, atsConvertResumeSchema } from "#validators/atsValidator";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

export class AtsAiController {
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const input = atsAnalyzeSchema.parse(req.body);
      if (input.fetchJobUrl && !input.jobUrl)
        throw new ApiError(400, "Provide a job URL to analyze online.");

      /**
       * Metering happens before the outbound fetch, not after. Fetching first meant a caller
       * who was already at their quota could still make the server issue an arbitrary
       * (SSRF-filtered, but still attacker-chosen) HTTPS request per attempt, unmetered — the
       * 429 only landed once the page had already been downloaded. Consuming first makes the
       * quota an actual budget on egress.
       */
      const quota = await AtsQuotaService.consume(user.id, ip(req));
      const jobDescription =
        input.fetchJobUrl && input.jobUrl
          ? await AtsJobFetchService.fetch(input.jobUrl)
          : input.jobDescription;

      // Flattened once here and handed to both passes; each used to walk the resume document
      // independently, and the document can be up to the 4 MB body limit.
      const resumeText = AtsScoringService.flattenResume(input.resume);
      const report = AtsScoringService.check(resumeText, jobDescription, input.layout);
      const { routed, ...result } = await AtsAiService.analyze(
        user.id,
        input.requestId,
        resumeText,
        jobDescription,
        report,
        input.fetchJobUrl,
      );

      /**
       * No model could be routed. That is our configuration failing, not the caller's request,
       * so the scan goes back rather than being spent on an analysis they never received. The
       * deterministic report is still returned and still useful — but `aiStatus` says plainly
       * that the AI layer did not run, instead of an empty `ai` field the caller cannot
       * distinguish from a model that found nothing to say.
       */
      res.json(
        createSuccessResponse({
          report: shapeReport(report, true),
          ...result,
          aiStatus: routed ? "ok" : "unavailable",
          quota: routed ? quota : await AtsQuotaService.refund(user.id, ip(req)),
        }),
      );
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
