import { DEFAULT_KEYWORD_MATCH } from "./default/keywordMatch.js";
import { DEFAULT_RESUME_PARSE } from "./default/resumeParse.js";
import { DEFAULT_RULES } from "./default/rules.js";
import { parseAtsPolicy } from "./parse.js";
import type { AtsEnginePolicy } from "./schema.js";

/**
 * A minimal, generic policy so the package is usable and testable on its own.
 *
 * Deliberately not the shipped one. The curated taxonomy — the real rule weights, thresholds,
 * synonym and implication maps, and the buzzword list — is private, and copying any of it here
 * would leak it into a package whose whole point is that it can eventually be published. What is
 * here is the smallest policy that exercises every rule kind and every vocabulary the parser
 * reads, so a consumer can score something the moment they install the package and a test can
 * run without a fixture.
 *
 * Everything language-bound lives in this data — month names, degree spellings, section
 * headings, title and school words, stopwords, action verbs. None of it is hardcoded in the
 * engine's source, which is what keeps adding a locale a matter of writing another policy rather
 * than editing the scorer. Fields the schema defaults (month names, text verbs, injection
 * phrases) are left to it rather than stated twice.
 */
const DEFAULT_POLICY_JSON = {
  version: "ats-v2",
  rules: DEFAULT_RULES,
  keywordMatch: DEFAULT_KEYWORD_MATCH,
  resumeParse: DEFAULT_RESUME_PARSE,
};

/**
 * Validated at module load, so a mistake in the default is caught by this package's own build
 * and test run rather than becoming a confusing schema error inside somebody else's application.
 *
 * Measured before choosing this: the parse costs about 5ms once, against ~35ms to import the
 * module graph at all (mostly zod). Deferring it behind a lazy proxy was tried and reverted —
 * it saved that 5ms but put a trap on every property read of an object the engine also uses as
 * a `WeakMap` key, which is a lot of subtlety to buy back a rounding error. A consumer who never
 * imports `DEFAULT_POLICY` pays nothing either way: `sideEffects` in package.json names only the
 * CLI and the child process, so a bundler drops this module when nothing imports from it.
 */
export const DEFAULT_POLICY: AtsEnginePolicy = parseAtsPolicy(DEFAULT_POLICY_JSON);
