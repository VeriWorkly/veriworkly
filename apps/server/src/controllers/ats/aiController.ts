import {
  needsRepair,
  shapeReport,
  type AtsParsedField,
  type AtsParsedResume,
  type PreparedResume,
} from "@veriworkly/ats-engine";
import { AtsAiError } from "@veriworkly/ats-engine/ai";
import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { requireAuthUser } from "#middleware/auth";
import { withAiSlot } from "#middleware/rateLimit";
import { ANALYSIS_ACTION, AtsAiService } from "#services/ats/ai";
import { aiRequestSignal, aiRouteError, aiTimeoutError } from "#services/ats/aiDeadline";
import { isShuttingDown } from "#lib/shutdown";
import { publicAtsPolicy } from "#services/ats/aiPolicy";
import { AtsJobFetchService } from "#services/ats/jobFetch";
import { AtsQuotaService } from "#services/ats/quota";
import type { AtsQuotaSummary } from "#services/ats/types";
import { AtsScoringService } from "#services/ats/scoring";
import { AtsRepairService, type RepairOutcome } from "#services/ats/repair";
import { CreditService, replayFingerprint } from "#services/creditService";
import { NOT_ENOUGH_CREDITS } from "#services/productNames";
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

/**
 * V-035: the cheapest analysis this request could be billed for, checked against the wallet
 * before a scan is spent or a job page fetched. An account with no credits was previously
 * metered, made the server fetch its URL, and only then got the 402 from the reservation —
 * which refunded the scan and left the fetch free to repeat.
 */
async function requireAnalysisCredits(userId: string, online: boolean, repair: boolean) {
  const pricing = publicAtsPolicy();
  // A repair that will run is billed too; a wallet that covers only the analysis would otherwise
  // pass here and lose the scan to the repair's own 402. One that will not run (not requested,
  // not needed, or no route) adds nothing (V-178).
  const minimum =
    (online ? pricing.jobUrlAnalysisCredits.min : pricing.analysisCredits.min) +
    (repair ? (pricing.parseRepairCredits ?? 0) : 0);
  const { available } = await CreditService.getWallet(userId);
  if (available < minimum) throw new ApiError(402, NOT_ENOUGH_CREDITS);
}

/** A refund from an error path must not replace the error it follows. */
async function refundScanQuietly(
  userId: string,
  address: string,
  requestId: string,
  spent: Pick<AtsQuotaSummary, "tier">,
) {
  try {
    await AtsQuotaService.refund(userId, address, spent);
  } catch (error) {
    logger.error("ATS scan refund failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * No model could be routed, so the scan goes back and the response says so. Never throws (V-388):
 * the refund decrements and then reads the summary, and an error reaching the caller's catch
 * refunded a second time. A failure after the decrement keeps the scan returned and answers with
 * the quota from before; a failure before it (the period lookup, the decrement itself) means
 * nothing went back yet, so the refund is tried once more before the loss is logged.
 */
async function refundUnroutedScan(
  userId: string,
  address: string,
  requestId: string,
  quota: AtsQuotaSummary,
) {
  let returned = false;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await AtsQuotaService.refund(userId, address, quota, () => {
        returned = true;
      });
    } catch (error) {
      logger.error(
        returned ? "ATS scan returned; its quota summary failed" : "ATS scan refund failed",
        { requestId, attempt, error: error instanceof Error ? error.message : String(error) },
      );
      if (returned) return quota;
    }
  }
  return quota;
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

      // V-192: a retry of an analysis already paid for (its response was lost) gets the stored
      // analysis back, before anything is checked, metered, fetched or charged again.
      const fingerprint = replayFingerprint({
        resume: resume.text,
        jobDescription: input.jobDescription ?? null,
        jobUrl: input.jobUrl ?? null,
        fetchJobUrl: input.fetchJobUrl,
        layout: input.layout ?? null,
        repairParse: input.repairParse,
      });
      const stored = await CreditService.storedResult(
        user.id,
        input.requestId,
        ANALYSIS_ACTION,
        fingerprint,
      );
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        res.json(
          createSuccessResponse({
            ...stored,
            quota: await AtsQuotaService.summary(user.id, ip(req)),
            replayed: true,
          }),
        );
        return;
      }

      // One signal for the whole request, built before the quota, the job fetch and every
      // provider call: the client leaving or the deadline ends whichever step is running, and
      // no reservation made after that is ever committed (V-034).
      const signal = aiRequestSignal(res);
      const fetchesJobPage = Boolean(input.fetchJobUrl && input.jobUrl);

      // Whether the repair pass would run depends only on the parse, not on the job text, so it
      // is known before anything is spent and only a repair that can happen is priced in.
      const repairWillRun =
        input.repairParse && needsRepair(AtsScoringService.check(resume, { layout: input.layout }));
      await requireAnalysisCredits(user.id, input.fetchJobUrl, repairWillRun);

      // V-038: at most two provider calls in flight per user, held for the whole request.
      await withAiSlot(user.id, async () => {
        /**
         * Metering happens before the outbound fetch, not after. Fetching first meant a caller
         * who was already at their quota could still make the server issue an arbitrary
         * (SSRF-filtered, but still attacker-chosen) HTTPS request per attempt, unmetered — the
         * 429 only landed once the page had already been downloaded. Consuming first makes the
         * quota an actual budget on egress.
         */
        const quota = await AtsQuotaService.consume(user.id, ip(req));
        let jobDescription = input.jobDescription;
        if (fetchesJobPage && input.jobUrl) {
          try {
            jobDescription = await AtsJobFetchService.fetch(input.jobUrl, signal);
          } catch (error) {
            // Cut off by a restart, not by the page: the scan goes back (V-313 review).
            if (isShuttingDown()) await refundScanQuietly(user.id, ip(req), input.requestId, quota);
            throw error;
          }
        }

        // From here on a failure is ours, not the caller's, so the scan goes back. The job
        // fetch above is deliberately outside this: refunding a failed fetch would make
        // fetching free. Once a page was fetched the scan also stays spent on any 402: the
        // wallet changed under the check above (V-035), or the page routed to a dearer bucket
        // than the check can price, which it only prices at its cheapest (V-327). The second is
        // not the caller's fault, but refunding it would make the fetch free and repeatable: the
        // same long posting gets the same 402 every time, and each attempt would make the server
        // fetch it again for nothing. The scan also stays spent on the client leaving or the
        // deadline passing (V-241): refunding those made a job fetch free to anyone who
        // disconnected after it, or whose page was slow. With no fetch behind it, any failure
        // cost the server nothing and the scan is returned.
        try {
          // Gone during the fetch: nothing is reserved for a client that is not there.
          if (signal.aborted) throw aiTimeoutError();
          res.json(
            createSuccessResponse(
              await AtsAiController.run(
                user.id,
                req,
                input,
                resume,
                jobDescription,
                quota,
                signal,
                {
                  fingerprint,
                },
              ),
            ),
          );
        } catch (error) {
          // A restart is never the caller's doing: the scan goes back whatever was fetched.
          const scanSpent =
            !isShuttingDown() &&
            fetchesJobPage &&
            (signal.aborted ||
              (error instanceof ApiError &&
                (error.statusCode === 402 || error.statusCode === 504)));
          if (!scanSpent) await refundScanQuietly(user.id, ip(req), input.requestId, quota);
          throw error;
        }
      });
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : aiRouteError(error));
    }
  }

  private static async run(
    userId: string,
    req: Request,
    input: AtsAnalyzeInput,
    resume: PreparedResume,
    jobDescription: string | undefined,
    quota: Awaited<ReturnType<typeof AtsQuotaService.consume>>,
    /** The request's signal (see `analyze`), shared by the repair and the analysis call. */
    signal: AbortSignal,
    /** What a retry of this request must match to be answered from the stored analysis. */
    replay: { fingerprint: string },
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
    let repair: RepairOutcome | null = null;
    let repairedFieldList: AtsParsedField[] = [];
    let repairUnusable = false;

    if (repairAvailable && input.repairParse) {
      try {
        // Its own reservation id: credit reservations are unique per request id, so sharing
        // the analysis id made the analysis reservation fail with a 409 after repair was paid.
        repair = await AtsRepairService.repair(
          userId,
          `${input.requestId}:repair`,
          resumeText,
          report,
          signal,
        );
        if (repair.repaired) {
          report.parsed = repair.repaired;
          repairedFieldList = aiFilledFields(repair.repaired);
        }
      } catch (error) {
        // The request itself is over — client gone or deadline passed — so there is nothing
        // left to continue with.
        if (signal.aborted) throw error;
        // Repair is optional: its own failure releases its credits and must not cost the
        // caller the analysis they also asked for. It is reported as not applied, and an
        // "unusable" reply (the model filled no field) is reported as such.
        repairUnusable = error instanceof AtsAiError && error.code === "unusable";
        if (!repairUnusable)
          logger.warn("ATS parse repair failed; continuing without it", {
            requestId: input.requestId,
            error: error instanceof Error ? error.message : String(error),
          });
      }
    }

    let analysis: Awaited<ReturnType<typeof AtsAiService.analyze>>;
    try {
      analysis = await AtsAiService.analyze(
        userId,
        input.requestId,
        resumeText,
        jobDescription,
        report,
        input.fetchJobUrl,
        signal,
      );
    } catch (error) {
      // V-036: the repaired parse goes nowhere with the analysis, so it is not paid for.
      await repair?.release();
      throw error;
    }
    const { routed, ...result } = analysis;

    /**
     * The response that carries the repaired parse is going out, so the repair is charged now
     * and never before the analysis it was done for (V-036). A commit the ledger refuses at
     * this point (the reservation expired under a very slow analysis) leaves the user with an
     * unbilled repair; it is logged and reported as unspent rather than failing the response.
     */
    let repairCreditsSpent = 0;
    if (repair && !routed) {
      // V-178: no analysis ran, the scan is refunded below, and the studio tells the user
      // nothing was charged. The repair goes back with it.
      await repair.release();
    } else if (repair) {
      try {
        await repair.commit();
        repairCreditsSpent = repair.creditsSpent;
      } catch (error) {
        logger.error("ATS parse repair delivered but could not be charged", {
          requestId: input.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    /**
     * No model could be routed. That is our configuration failing, not the caller's request,
     * so the scan goes back rather than being spent on an analysis they never received. The
     * deterministic report is still returned and still useful — but `aiStatus` says plainly
     * that the AI layer did not run, instead of an empty `ai` field the caller cannot
     * distinguish from a model that found nothing to say.
     */
    const delivered = {
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
        rejectedValues: repair?.rejectedValues ?? 0,
        creditsSpent: repairCreditsSpent,
        unusable: repairUnusable,
      },
    };

    // V-192: the analysis was charged inside `AtsAiService.analyze`; the response it belongs to
    // is only whole now, so it is stored now. Without it a retry answers 409 as it used to, so a
    // failure here is logged and the response still goes out.
    if (routed) {
      try {
        await CreditService.attachReplay(userId, input.requestId, {
          fingerprint: replay.fingerprint,
          response: JSON.parse(JSON.stringify(delivered)) as Prisma.InputJsonValue,
        });
      } catch (error) {
        logger.error("ATS analysis delivered but not stored for a retry", {
          requestId: input.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      ...delivered,
      quota: routed ? quota : await refundUnroutedScan(userId, ip(req), input.requestId, quota),
    };
  }

  static async convertResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireAuthUser(req);
      const input = atsConvertResumeSchema.parse(req.body);
      const result = await withAiSlot(user.id, () =>
        AtsAiService.convertResume(user.id, input.requestId, input.resume, aiRequestSignal(res)),
      );

      res.json(createSuccessResponse(result));
    } catch (error) {
      next(error instanceof z.ZodError ? handleValidationError(error) : aiRouteError(error));
    }
  }
}
