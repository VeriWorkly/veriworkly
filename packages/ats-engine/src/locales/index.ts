/**
 * @veriworkly/ats-engine/locales — reading resumes in more than English.
 *
 * Attach the packs to a policy once, where it is loaded; `check` then reads each resume (and
 * posting) in the languages it is written in, and in one region:
 *
 *   const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
 *   AtsScoringService.check(resume, policy).locale; // { languages: ["de"], region: "DE" }
 *
 * A pack is data — see LOCALES.md for writing one, and the JSON Schemas below for checking it.
 */
import { z } from "zod";

import { de } from "./packs/de.js";
import { hi } from "./packs/hi.js";
import { DE, IN, US } from "./packs/regions.js";
import { languagePackSchema, regionPackSchema } from "./schema.js";

export { localizePolicy, withLocales, type AtsLocale, type AtsLocaleOptions } from "./resolve.js";
export type {
  AtsLanguagePack,
  AtsLanguagePackInput,
  AtsRegionPack,
  AtsRegionPackInput,
} from "./schema.js";
export { de, hi, DE, IN, US };

/** Every pack this package ships. English is the policy's own base vocabulary, not a pack. */
export const BUILT_IN_LOCALES = { languages: [de, hi], regions: [US, DE, IN] };

/** JSON Schemas for a pack written as JSON. Patterns are checked when the pack is attached. */
export const atsLanguagePackJsonSchema = z.toJSONSchema(languagePackSchema, { io: "input" });
export const atsRegionPackJsonSchema = z.toJSONSchema(regionPackSchema, { io: "input" });
