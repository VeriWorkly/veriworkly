import { z } from "zod";

import { regexString, term, wordList } from "../primitives.js";

/**
 * Heading patterns used to split a posting into blocks. Each block runs to the next heading, so
 * these replace the old fixed-length windows, which overshot the requirements list and promoted
 * nice-to-haves to the required weight. `excluded` blocks (about-us, benefits, EEO boilerplate)
 * are dropped from scoring entirely rather than down-weighted.
 */
const jobSectionSchema = z.object({
  required: regexString("sections.required"),
  preferred: regexString("sections.preferred"),
  responsibilities: regexString("sections.responsibilities"),
  excluded: regexString("sections.excluded"),
});

export const keywordMatchSchema = z
  .object({
    requiredWeight: z.number().positive(),
    preferredWeight: z.number().positive(),
    responsibilitiesWeight: z.number().positive(),
    defaultWeight: z.number().positive(),
    /**
     * Multiplier applied to terms that are not recognised skills and do not read as proper nouns
     * or acronyms in the posting. Ordinary English still counts — a posting can name a real
     * requirement in lowercase prose — but it cannot outvote the skills the role actually asks for.
     */
    generalTermWeight: z.number().min(0).max(1),
    sections: jobSectionSchema,
    /**
     * The words a posting offers alternatives with: "Go or Java". The missing-keyword label
     * joins the alternatives with the word the posting itself used.
     */
    alternationWords: wordList("alternationWords").default(["or"]),
    /**
     * Suffix rules that fold inflections together ("managing" → "manag", like "managed"),
     * applied to every token on both sides of a match, in order, first match wins. One rule set
     * per policy, not per language: a German rule stripping "-er" would fold "engineer" into
     * "engine" on every English token too, so language packs do not change it.
     */
    stemming: z
      .array(
        z.object({
          suffix: z.string().min(1),
          minLength: z.number().int().nonnegative(),
          replacement: z.string(),
          /** Skip the rule when the word ends in this instead: "s" but not "ss". */
          unless: z.string().min(1).optional(),
        }),
      )
      .default([
        { suffix: "ing", minLength: 6, replacement: "" },
        { suffix: "ies", minLength: 5, replacement: "y" },
        { suffix: "ed", minLength: 5, replacement: "" },
        { suffix: "es", minLength: 5, replacement: "" },
        { suffix: "s", minLength: 4, replacement: "", unless: "ss" },
      ]),
    /** Endings a multi-word phrase may carry on its last word and still be the same phrase. */
    pluralSuffixes: wordList("pluralSuffixes").default(["s", "es"]),
    /**
     * Whether the language capitalises every noun, as German does. A capital letter
     * mid-sentence then says nothing about a word being a product or a skill, so only acronyms
     * and inner capitals ("PostgreSQL") count as proper nouns.
     */
    nounsCapitalized: z.boolean().default(false),
    /**
     * How a posting states the requirements that filter before any reading: years, a degree,
     * the right to work, a clearance, a language. Each a pattern; years and language patterns
     * capture the number and the language in group 1. Language packs add their own.
     */
    requirements: z
      .object({
        yearsPatterns: z.array(regexString("requirements.yearsPatterns")).default([
          // Not an age: "at least 18 years of age", "21 years or older", "18 years old".
          // `\s*(?:\+\s*)?`, not `\s*\+?\s*`: two adjacent `\s*` split a long run of spaces
          // every possible way, which is quadratic.
          // A range reads its lower end: "3-5 years", "3 to 5 years", "between 3 and 5 years".
          // "and" joins a range only after "between": "Python 3 and 5 years" asks for five. The
          // lookbehind follows the "and", so it runs once per "and", not once per space before it.
          String.raw`(?<!\d)(\d{1,2})\s*(?:\+\s*)?(?:(?:[-–]|to\s|and\s(?<=between\s+\d{1,2}\s*and\s))\s*\d{1,2}\s*)?(?:years?|yrs?)(?![\p{L}])(?![\s-]+(?:of\s+age|old|or\s+older)(?![\p{L}]))`,
        ]),
        /** Words that let experience stand in for the stated degree: "or equivalent experience". */
        equivalence: wordList("requirements.equivalence").default([
          String.raw`or\s+equivalent`,
          String.raw`equivalent\s+(?:practical\s+|work\s+)?experience`,
          String.raw`or\s+related\s+field`,
        ]),
        authorization: wordList("requirements.authorization").default([
          String.raw`authori[sz]ed\s+to\s+work`,
          String.raw`work\s+authori[sz]ation`,
          String.raw`right\s+to\s+work`,
          // Sponsorship of a visa, not of an event: "securing event sponsorship" is sales.
          String.raw`(?:visa|work|immigration|employment)\s+sponsorship`,
          String.raw`(?:requires?|requiring|needs?|needing)\s+sponsorship`,
          String.raw`work\s+permit`,
          String.raw`(?:us|u\.s\.)\s+citizen(?:ship)?`,
          String.raw`green\s+card`,
          String.raw`permanent\s+resident`,
        ]),
        // Qualified, never bare: "customs clearance" is logistics, not a security vetting.
        clearance: wordList("requirements.clearance").default([
          String.raw`(?:security|secret|top\s+secret|ts/sci|dv|sc|government|federal)\s+clearance`,
          String.raw`ts/sci`,
        ]),
        languagePatterns: z
          .array(regexString("requirements.languagePatterns"))
          .default([
            String.raw`(?:fluent|fluency|proficien(?:t|cy)|native|business[\s-]level|working\s+proficiency|professional\s+proficiency)\s+(?:in\s+|with\s+)?(\p{L}+)`,
          ]),
        /**
         * A language's name in other languages, keyed to its English name, lowercase: a German
         * posting asks for "Englisch", the resume says "English". Language packs fill it in.
         *
         * Also the list of what *is* a language: a `languagePatterns` capture becomes a language
         * requirement only when it is a key or a value here, so "proficient in Python" is judged
         * as the skill it names. The English names map to themselves.
         */
        languageNames: z
          .record(z.string().min(1), z.string().min(1))
          .default(
            Object.fromEntries(
              [
                "arabic",
                "bengali",
                "bulgarian",
                "cantonese",
                "chinese",
                "croatian",
                "czech",
                "danish",
                "dutch",
                "english",
                "filipino",
                "finnish",
                "french",
                "german",
                "greek",
                "gujarati",
                "hebrew",
                "hindi",
                "hungarian",
                "indonesian",
                "italian",
                "japanese",
                "kannada",
                "korean",
                "malay",
                "malayalam",
                "mandarin",
                "marathi",
                "norwegian",
                "persian",
                "polish",
                "portuguese",
                "punjabi",
                "romanian",
                "russian",
                "serbian",
                "slovak",
                "spanish",
                "swahili",
                "swedish",
                "tagalog",
                "tamil",
                "telugu",
                "thai",
                "turkish",
                "ukrainian",
                "urdu",
                "vietnamese",
              ].map((name) => [name, name]),
            ),
          ),
      })
      .prefault({}),
    stopwords: z.array(term),
    synonyms: z.record(term, term),
    /**
     * One-way skill implications, applied to the resume only: holding the key demonstrates the
     * values. Terraform *is* infrastructure as code; PostgreSQL *is* a relational database. Plain
     * token equality reported those as gaps and told the candidate to add words describing work
     * the resume already evidenced.
     *
     * Deliberately not symmetric. "Terraform" implies "infrastructure as code"; the reverse does
     * not hold, and inferring it would credit the candidate with a tool they never named.
     */
    implies: z.record(term, z.array(term)),
    phrases: z.array(term),
    buzzwords: z.array(term),
  })
  .superRefine((km, ctx) => {
    /**
     * A multi-word term only ever becomes a single token by matching the phrase list first. One
     * that appears in `implies` or `synonyms` but not in `phrases` therefore never resolves: the
     * posting scatters it into unrelated single words and the implication silently does nothing.
     * Catching it here turns a quiet scoring hole into a startup failure naming the term.
     */
    const phrases = new Set(km.phrases);
    const multiWord = new Set<string>();

    for (const [skill, capabilities] of Object.entries(km.implies)) {
      if (skill.includes(" ")) multiWord.add(skill);
      for (const capability of capabilities)
        if (capability.includes(" ")) multiWord.add(capability);
    }
    for (const canonical of Object.values(km.synonyms))
      if (canonical.includes(" ")) multiWord.add(canonical);

    for (const term of multiWord)
      if (!phrases.has(term))
        ctx.addIssue({
          code: "custom",
          path: ["phrases"],
          message: `multi-word term "${term}" is referenced by implies/synonyms but missing from phrases, so it can never match`,
        });
  });
