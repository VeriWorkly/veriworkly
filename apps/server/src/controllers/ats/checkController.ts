import { shapeReport } from "@veriworkly/ats-engine";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AtsQuotaService } from "#services/ats/quota";
import { AtsScoringService } from "#services/ats/scoring";
import { createSuccessResponse, handleValidationError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";
import { atsCheckSchema } from "#validators/atsValidator";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

export class AtsCheckController {
  static async quota(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(createSuccessResponse(await AtsQuotaService.summary(req.authUser?.id, ip(req))));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Free, deterministic, rule-based scan. Anonymous callers get a score and a verdict —
   * `shapeReport` withholds the rule-by-rule breakdown and keyword lists server-side rather
   * than relying on the client to hide them. Any authenticated user (free or subscriber) gets
   * the full report; AI-powered interpretation stays behind /ats/analyze.
   */
  static async check(req: Request, res: Response, next: NextFunction) {
    try {
      const input = atsCheckSchema.parse(req.body);
      // Read before metering, so a malformed document is a 400 that costs the caller nothing.
      const resume = AtsScoringService.prepare(input.resume);
      const quota = await AtsQuotaService.consume(req.authUser?.id, ip(req));
      const report = AtsScoringService.check(resume, {
        jobDescription: input.jobDescription,
        layout: input.layout,
        file: input.file,
      });
      res.json(
        createSuccessResponse({
          report: shapeReport(report, req.authUser ? "full" : "restricted"),
          ai: null,
          creditsSpent: 0,
          quota,
        }),
      );
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }
}
