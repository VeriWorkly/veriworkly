import { isSupportedCountry } from "libphonenumber-js/min";
import { z } from "zod";

import { iscedDegrees, regexString, term, wordList } from "../policy/primitives.js";

/**
 * Locale packs: the vocabulary a resume in one language, or from one country, is written in.
 *
 * A pack is a fragment of a policy's vocabulary, never a whole policy, so it extends whatever
 * policy it is attached to — the community one or a private one — rather than replacing it.
 * Every field is optional and every list is added to what the policy already has; patterns are
 * added as alternatives. Rules, weights and thresholds are the policy's alone, except the few a
 * region pack may adjust by rule id.
 *
 * Packs are plain JSON-compatible data, validated here, so a new locale is a data contribution
 * (see LOCALES.md), not a code change.
 */

const optionalList = (label: string) => wordList(label).optional();

const vocabularyShape = {
  /** Section heading patterns, each added as an alternative to the policy's own. */
  sections: z
    .object({
      experience: regexString("sections.experience"),
      education: regexString("sections.education"),
      skills: regexString("sections.skills"),
      projects: regexString("sections.projects"),
      other: regexString("sections.other"),
    })
    .partial()
    .optional(),
  months: z.record(z.string().min(1), z.number().int().min(1).max(12)).optional(),
  openEnded: optionalList("openEnded"),
  rangeWords: optionalList("rangeWords"),
  sinceWords: optionalList("sinceWords"),
  employerWords: optionalList("employerWords"),
  titleWords: optionalList("titleWords"),
  schoolWords: optionalList("schoolWords"),
  documentTitles: optionalList("documentTitles"),
  nameParticles: optionalList("nameParticles"),
  dateOfBirthLabels: optionalList("dateOfBirthLabels"),
  headingConnectors: optionalList("headingConnectors"),
  degrees: iscedDegrees.optional(),
  contentLineVerbs: optionalList("contentLineVerbs"),
  actionVerbs: optionalList("actionVerbs"),
  /** Set for a verb-final language; see `text.actionVerbAnywhere`. */
  actionVerbAnywhere: z.boolean().optional(),
  injectionPhrases: optionalList("injectionPhrases"),
  /** Added to `keywordMatch.requirements`. */
  requirements: z
    .object({
      yearsPatterns: z.array(regexString("requirements.yearsPatterns")),
      equivalence: wordList("requirements.equivalence"),
      authorization: wordList("requirements.authorization"),
      clearance: wordList("requirements.clearance"),
      languagePatterns: z.array(regexString("requirements.languagePatterns")),
      languageNames: z.record(z.string().min(1), z.string().min(1)),
    })
    .partial()
    .optional(),
  /** Job-posting section heading patterns, added as alternatives. */
  jobSections: z
    .object({
      required: regexString("jobSections.required"),
      preferred: regexString("jobSections.preferred"),
      responsibilities: regexString("jobSections.responsibilities"),
      excluded: regexString("jobSections.excluded"),
    })
    .partial()
    .optional(),
  alternationWords: optionalList("alternationWords"),
  stopwords: z.array(term).optional(),
  buzzwords: z.array(term).optional(),
  pluralSuffixes: optionalList("pluralSuffixes"),
  /** Set for a language that capitalises every noun; see `keywordMatch.nounsCapitalized`. */
  nounsCapitalized: z.boolean().optional(),
};

/**
 * `verified`: a named maintainer reads the language natively and the pack meets the field
 * accuracy target on its fixture set. `community`: contributed and tested, not yet signed off.
 */
const status = z.enum(["verified", "community"]);

const scriptName = z.string().superRefine((script, ctx) => {
  try {
    new RegExp(`\\p{Script=${script}}`, "u");
  } catch {
    ctx.addIssue({ code: "custom", message: `"${script}" is not a Unicode script name` });
  }
});

export const languagePackSchema = z
  .object({
    ...vocabularyShape,
    /** ISO 639-1 (or 639-3) code: "de", "hi". */
    id: z.string().regex(/^[a-z]{2,3}$/, "an ISO 639 language code"),
    name: z.string().min(1),
    status,
    maintainers: z.array(z.string().min(1)).default([]),
    /**
     * The script the language is written in when it is not Latin ("Devanagari"). Text with a
     * fair share of letters in it is read as this language, whatever its words.
     */
    script: scriptName.optional(),
    /**
     * Words common in the language and rare in English — function words, mostly — by which a
     * text in a Latin script is recognised as written in it. Not the stopword list: that one
     * may share words with English ("will", "also") and recognition must not.
     */
    detectionWords: z.array(z.string().min(1)).default([]),
    /** The region assumed for a resume in this language when nothing more specific says. */
    defaultRegion: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .refine((pack) => pack.script !== undefined || pack.detectionWords.length >= 10, {
    message: "a language pack needs a script or at least ten detection words",
  });

export const regionPackSchema = z.object({
  ...vocabularyShape,
  /** ISO 3166-1 alpha-2: "DE", "IN". */
  id: z.string().regex(/^[A-Z]{2}$/, "an ISO 3166 country code"),
  name: z.string().min(1),
  status,
  maintainers: z.array(z.string().min(1)).default([]),
  /** The country a national phone number is read as. */
  phoneCountry: z
    .string()
    .refine((code) => isSupportedCountry(code), "not a country libphonenumber supports"),
  dateOrder: z.enum(["MDY", "DMY", "YMD"]),
  /**
   * Adjustments to the attached policy's rules, by rule id: a convention that differs by country
   * (a date of birth, a photo) is weighed differently there. `weight` replaces a rule's weight,
   * or every non-zero band weight of a banded rule. An id the policy does not have is ignored.
   */
  rules: z
    .record(
      z.string().min(1),
      z.object({
        weight: z.number().nonnegative().optional(),
        severity: z.enum(["info", "warning", "error"]).optional(),
      }),
    )
    .default({}),
});

export type AtsLanguagePack = z.output<typeof languagePackSchema>;
export type AtsLanguagePackInput = z.input<typeof languagePackSchema>;
export type AtsRegionPack = z.output<typeof regionPackSchema>;
export type AtsRegionPackInput = z.input<typeof regionPackSchema>;
/** The vocabulary fields both kinds of pack carry. */
export type AtsVocabulary = Pick<AtsLanguagePack, keyof typeof vocabularyShape>;
