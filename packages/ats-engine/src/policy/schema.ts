import { z } from "zod";

import { languagePackSchema, regionPackSchema } from "../locales/schema.js";
import { keywordMatchSchema } from "./schema/keywordMatch.js";
import { resumeParseSchema } from "./schema/resumeParse.js";
import { ruleSchema } from "./schema/rules.js";
import { engineTextSchema } from "./schema/text.js";

/**
 * The scoring policy schema.
 *
 * The policy is data, not code: rules, weights, thresholds, and every language-bound
 * vocabulary the engine reads live here rather than in source, so a new job-title word or a
 * second locale is a data change rather than a release. The host supplies it; this module only
 * says what a valid one looks like. Each area has its own file under `./schema/`.
 */

/**
 * Locale packs attached to the policy (see `withLocales`). The policy's vocabulary is the base,
 * in effect for every resume; a language pack's vocabulary joins it only for resumes and postings
 * detected as written in that language, and one region pack applies per resume.
 */
const localesSchema = z
  .object({
    languages: z.array(languagePackSchema).default([]),
    regions: z.array(regionPackSchema).default([]),
  })
  .prefault({});

export const atsEngineSchema = z.object({
  version: z.string().min(1),
  // Unique ids: a region pack adjusts rules by id, and would adjust every rule sharing one.
  rules: z
    .array(ruleSchema)
    .min(1)
    .superRefine((rules, ctx) => {
      const seen = new Set<string>();
      rules.forEach((rule, index) => {
        if (seen.has(rule.id))
          ctx.addIssue({
            code: "custom",
            path: [index, "id"],
            message: `rule id "${rule.id}" is used by more than one rule`,
          });
        seen.add(rule.id);
      });
    }),
  keywordMatch: keywordMatchSchema,
  resumeParse: resumeParseSchema,
  text: engineTextSchema,
  locales: localesSchema,
});

export type AtsEngineRule = z.infer<typeof ruleSchema>;
/** A validated policy, with every default applied. What the engine reads. */
export type AtsEnginePolicy = z.infer<typeof atsEngineSchema>;
/** A policy as an author writes it: fields with defaults may be omitted. What `parseAtsPolicy` takes. */
export type AtsEnginePolicyInput = z.input<typeof atsEngineSchema>;
