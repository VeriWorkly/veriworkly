import {
  needsRepair,
  shapeReport,
  type AtsParsedField,
  type AtsParsedResume,
  type PreparedResume,
} from "@veriworkly/ats-engine";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AtsAiService } from "#services/ats/ai";
import { AtsJobFetchService } from "#services/ats/jobFetch";
import { AtsQuotaService } from "#services/ats/quota";
import { AtsScoringService } from "#services/ats/scoring";
import { AtsRepairService } from "#services/ats/repair";
import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";
import {
  atsAnalyzeSchema,
  atsConvertResumeSchema,
  type AtsAnalyzeInput,
} from "#validators/atsValidator";
import { logger } from "#lib/logger";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

/**
 * The recovered fields a model supplied rather than the deterministic parser, read from the
 * record's provenance. Returned to the caller because a repaired row and a parsed row are not
 * the same claim, and showing them identically would spend the credibility the "what the
 * software sees" table exists to earn.
 */
function aiFilledFields(parsed: AtsParsedResume): AtsParsedField[] {
  return (Object.keys(parsed.provenance) as AtsParsedField[]).filter(
    (field) => parsed.provenance[field] === "ai",
  );
}

export class AtsAiController {
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const input = atsAnalyzeSchema.parse(req.body);
      if (input.fetchJobUrl && !input.jobUrl)
        throw new ApiError(400, "Provide a job URL to analyze online.");

      // Read once, and before metering: a malformed document is a 400 that costs nothing, and
      // the same prepared text feeds the report, the repair pass and the analysis.
      const resume = AtsScoringService.prepare(input.resume);

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

      // From here on a failure is ours, not the caller's, so the scan goes back. The job fetch
      // above is deliberately outside this: refunding a failed fetch would make fetching free.
      try {
        res.json(
          createSuccessResponse(
            await AtsAiController.run(user.id, req, input, resume, jobDescription, quota),
          ),
        );
      } catch (error) {
        await AtsQuotaService.refund(user.id, ip(req));
        throw error;
      }
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : error);
    }
  }

  private static async run(
    userId: string,
    req: Request,
    input: AtsAnalyzeInput,
    resume: PreparedResume,
    jobDescription: string | undefined,
    quota: Awaited<ReturnType<typeof AtsQuotaService.consume>>,
  ) {
    const resumeText = resume.text;
    const report = AtsScoringService.check(resume, { jobDescription, layout: input.layout });

    /**
     * Parse repair is offered, never imposed.
     *
     * `repairAvailable` says the deterministic parse came back thin enough that a second read
     * would probably help; the pass itself runs only when the caller asked for it, because it
     * spends credits and that is their call. A caller who never opts in is billed nothing and
     * still learns that the option exists.
     */
    const repairAvailable = needsRepair(report);
    let repairedFieldList: AtsParsedField[] = [];
    let repairCreditsSpent = 0;
    let rejectedValues = 0;

    if (repairAvailable && input.repairParse) {
      try {
        // Its own reservation id: credit reservations are unique per request id, so sharing
        // the analysis id made the analysis reservation fail with a 409 after repair was paid.
        const outcome = await AtsRepairService.repair(
          userId,
          `${input.requestId}:repair`,
          resumeText,
          report,
        );
        repairCreditsSpent = outcome.creditsSpent;
        rejectedValues = outcome.rejectedValues;
        if (outcome.repaired) {
          report.parsed = outcome.repaired;
          repairedFieldList = aiFilledFields(outcome.repaired);
        }
      } catch (error) {
        // Repair is optional: its own failure releases its credits and must not cost the
        // caller the analysis they also asked for. It is reported as not applied.
        logger.warn("ATS parse repair failed; continuing without it", {
          requestId: input.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const { routed, ...result } = await AtsAiService.analyze(
      userId,
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
    return {
      report: shapeReport(report, "full"),
      ...result,
      aiStatus: routed ? "ok" : "unavailable",
      /**
       * `available` lets the UI offer the pass; `fields` tells it which recovered values a
       * model supplied, so a repaired row can be labelled rather than shown as though a
       * parser found it. `rejectedValues` counts values the model returned that did not
       * occur in the document and were therefore dropped — worth surfacing, because it is
       * the grounding check visibly doing its job.
       */
      repair: {
        available: repairAvailable,
        applied: repairedFieldList.length > 0,
        fields: repairedFieldList,
        rejectedValues,
        creditsSpent: repairCreditsSpent,
      },
      quota: routed ? quota : await AtsQuotaService.refund(userId, ip(req)),
    };
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
