import { AtsInputError, AtsScoringService as Engine, prepareResume } from "@veriworkly/ats-engine";
import type { AtsLayoutSignals, AtsReport, PreparedResume } from "@veriworkly/ats-engine";

import { getAtsEnginePolicy } from "#services/ats/enginePolicy";
import { ApiError } from "#lib/errors";

/**
 * The server's view of the scoring engine.
 *
 * The engine takes its policy as an argument so that it holds no state and can run anywhere.
 * This wrapper supplies the policy from the host's cache and translates the engine's typed
 * input error into an HTTP one — the two things a library has no business knowing about.
 */
export class AtsScoringService {
  /**
   * Reads a request's resume once. Callers that need both a report and an AI pass prepare with
   * this and hand the result to both, so a large JSON document is walked a single time.
   */
  static prepare(resume: unknown): PreparedResume {
    try {
      return prepareResume(resume);
    } catch (error) {
      if (error instanceof AtsInputError) {
        const [first] = error.issues;
        throw new ApiError(
          400,
          first
            ? `Invalid resume document at ${first.path || "root"}: ${first.message}`
            : error.message,
        );
      }
      throw error;
    }
  }

  static check(
    resume: unknown,
    options: { jobDescription?: string; layout?: AtsLayoutSignals } = {},
  ): AtsReport {
    return Engine.check(this.prepare(resume), getAtsEnginePolicy(), options);
  }
}
