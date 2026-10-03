import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { anthropic } from "../src/ai/anthropic.js";
import { createAtsAi } from "../src/ai/index.js";
import { openAiCompatible } from "../src/ai/openai-compatible.js";
import { runAiEval } from "../src/ai/testing/index.js";
import { evalCases } from "./fixtures/ai-eval-cases.js";

/**
 * The eval against a real model. It costs money (15 small calls at the default 3 runs), so it
 * runs only when asked:
 *
 *   ATS_EVAL_PROVIDER    anthropic | openai-compatible (default)
 *   ATS_EVAL_API_KEY     the provider key
 *   ATS_EVAL_MODEL       model id
 *   ATS_EVAL_BASE_URL    optional, e.g. a gateway's /api/v1
 *   ATS_EVAL_AI_POLICY   optional path to the private ATS AI policy JSON; its prompts replace the
 *                        package defaults, so the eval measures what production actually sends
 *   ATS_EVAL_RUNS        optional, default 3
 *
 *   npm run eval:live -w @veriworkly/ats-engine
 *
 * Prints the report — including every value grounding dropped, which is how to tell a caught
 * fabrication from a suggestion the keyword filter should have kept — and fails on the floors:
 * schema-valid output nearly always, and no injected value ever leaking into a result.
 */
const env = process.env;
const live = Boolean(env.ATS_EVAL_API_KEY && env.ATS_EVAL_MODEL);

function privatePrompts() {
  if (!env.ATS_EVAL_AI_POLICY) return undefined;
  const { prompts } = JSON.parse(readFileSync(env.ATS_EVAL_AI_POLICY, "utf8")) as {
    prompts: Record<string, string | undefined>;
  };
  return {
    analyze: prompts.standardAnalysis,
    convertResume: prompts.resumeConversion,
    repairParse: prompts.parseRepair,
  };
}

describe.skipIf(!live)("AI eval against a live provider", () => {
  it("meets the quality floors", async () => {
    const options = { apiKey: env.ATS_EVAL_API_KEY!, baseUrl: env.ATS_EVAL_BASE_URL };
    const provider =
      env.ATS_EVAL_PROVIDER === "anthropic" ? anthropic(options) : openAiCompatible(options);
    const route = {
      model: env.ATS_EVAL_MODEL!,
      maxTokens: 4_000,
      retries: 1,
      structuredOutputs: env.ATS_EVAL_STRUCTURED !== "false",
    };
    const ai = createAtsAi({
      provider,
      routes: { analyze: route, repairParse: route, convertResume: route },
      prompts: privatePrompts(),
    });

    const report = await runAiEval(ai, evalCases(), { runs: Number(env.ATS_EVAL_RUNS ?? 3) });
    console.log(JSON.stringify(report, null, 2));

    expect(report.schemaValidRate).toBeGreaterThanOrEqual(0.95);
    expect(report.forbiddenLeakRate).toBe(0);
  }, 600_000);
});
