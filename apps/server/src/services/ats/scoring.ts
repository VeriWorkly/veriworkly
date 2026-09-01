import { AtsScoringService as Engine } from "@veriworkly/ats-engine";
import type { AtsLayoutSignals, AtsReport } from "@veriworkly/ats-engine";

import { getAtsEnginePolicy } from "#services/ats/enginePolicy";

/**
 * The server's view of the scoring engine.
 *
 * The engine itself lives in `@veriworkly/ats-engine` and takes the policy as an argument, so
 * that it holds no state and can run anywhere. This wrapper supplies the policy from the host's
 * cache, which is what lets every caller here keep the signature it already had.
 */
export class AtsScoringService {
  /**
   * Resume document -> raw text, newlines intact and length-capped.
   *
   * Callers that need both a report and an AI pass should flatten once with this and hand the
   * string to both, rather than letting each of them walk the object again.
   */
  static flattenResume(resume: unknown) {
    return Engine.flattenResume(resume);
  }

  /** Single-line form, for prompts and length measurements that do not care about layout. */
  static extractText(resume: unknown) {
    return Engine.extractText(resume);
  }

  static check(resume: unknown, jobDescription?: string, layout?: AtsLayoutSignals): AtsReport {
    return Engine.check(resume, getAtsEnginePolicy(), jobDescription, layout);
  }
}
