import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { AtsAiService } from "#services/ats/ai";
import { AtsJobFetchService } from "#services/ats/jobFetch";
import { AtsQuotaService } from "#services/ats/quota";
import { AtsScoringService } from "#services/ats/scoring";
import { shapeReport } from "#services/ats/reportShaping";
import { AtsRepairService, needsRepair } from "#services/ats/repair";
import { createSuccessResponse, handleValidationError, ApiError } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";
import { atsAnalyzeSchema, atsConvertResumeSchema } from "#validators/atsValidator";
import type { AtsParsedResume } from "#services/ats/types";

function ip(req: Request) {
  return getRequestIpDetails(req).resolvedIp;
}

/**
 * Which recovered fields came from the repair pass rather than the deterministic parser.
 *
 * Derived by comparing before and after rather than threaded through the engine, so
 * `AtsParsedResume` stays a plain description of what was recovered and gains no notion of who
 * recovered it. The merge only ever fills fields the parser left empty, so a field that changed
 * is by construction a field the model supplied.
 *
 * Returned to the caller because a repaired row and a parsed row are not the same claim: one is
 * what a parser read, the other is what a model read. Showing them identically would spend the
 * credibility the "what the software sees" table exists to earn.
 */
function repairedFields(before: AtsParsedResume, after: AtsParsedResume): string[] {
  const changed: string[] = [];
  if (!before.name && after.name) changed.push("name");
  if (!before.email && after.email) changed.push("email");
  if (!before.phone && after.phone) changed.push("phone");
  if (before.roles.length === 0 && after.roles.length > 0) changed.push("roles");
  if (before.education.length === 0 && after.education.length > 0) changed.push("education");
  if (before.skills.length === 0 && after.skills.length > 0) changed.push("skills");
  return changed;
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

      /**
       * Parse repair is offered, never imposed.
       *
       * `repairAvailable` says the deterministic parse came back thin enough that a second read
       * would probably help; the pass itself runs only when the caller asked for it, because it
       * spends credits and that is their call. A caller who never opts in is billed nothing and
       * still learns that the option exists.
       */
      const repairAvailable = needsRepair(report);
      let repairedFieldList: string[] = [];
      let repairCreditsSpent = 0;
      let rejectedValues = 0;

      if (repairAvailable && input.repairParse) {
        const deterministic = report.parsed;
        const outcome = await AtsRepairService.repair(user.id, input.requestId, resumeText, report);
        repairCreditsSpent = outcome.creditsSpent;
        rejectedValues = outcome.rejectedValues;
        if (outcome.repaired) {
          report.parsed = outcome.repaired;
          repairedFieldList = repairedFields(deterministic, outcome.repaired);
        }
      }

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
