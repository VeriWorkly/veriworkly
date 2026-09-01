import { z } from "zod";

/**
 * The scoring policy schema.
 *
 * The policy is data, not code: rules, weights, thresholds, and every language-bound
 * vocabulary the engine reads live here rather than in source, so a new job-title word or a
 * second locale is a data change rather than a release. The host supplies it; this module only
 * says what a valid one looks like.
 */
/**
 * A string the engine will hand to `new RegExp`, checked here rather than at match time.
 *
 * Without this a policy that satisfies every other constraint still throws `SyntaxError` on the
 * first request that evaluates the rule — which is the exact failure the boot-time validation
 * exists to prevent: a process that reports itself healthy while an endpoint 500s. The pattern is
 * operator-supplied and never reaches a caller, so naming the offending field in the issue is
 * safe and is the only way to debug a file the process cannot show you.
 *
 * Compilation only. It says nothing about whether the pattern is *correct* — that is what the
 * calibration suite is for.
 */
const regexString = (label: string) =>
  z
    .string()
    .min(1)
    .superRefine((pattern, ctx) => {
      try {
        new RegExp(pattern);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is not a valid regular expression: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });

/**
 * Regex flags, which `new RegExp` rejects just as loudly as a malformed pattern — an unknown
 * letter or a repeated one is a `SyntaxError`, so it is validated in the same place.
 */
const regexFlags = z
  .string()
  .default("")
  .superRefine((flags, ctx) => {
    try {
      new RegExp("", flags);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `flags "${flags}" are not valid regular-expression flags: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  });

/**
 * A word list the engine joins with `|` into one alternation, unescaped.
 *
 * That makes a metacharacter in any single entry a failure of the *whole* pattern, not just of
 * that word: `c++` in `titleWords` raises "Nothing to repeat" and takes down every parse. The
 * entries are deliberately not escaped at use — a policy author can legitimately write a small
 * pattern like `sr\.?` — so the check is that the assembled alternation compiles, which is the
 * thing that actually has to hold.
 */
const wordList = (label: string) =>
  z
    .array(z.string().min(1))
    .min(1)
    .superRefine((words, ctx) => {
      try {
        new RegExp(`\\b(?:${words.join("|")})\\b`, "i");
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} does not assemble into a valid regular expression: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });

const bandSchema = z.object({
  upTo: z.number().nullable(),
  weight: z.number().nonnegative(),
});

const ruleBase = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]),
  passEvidence: z.string().min(1),
  failEvidence: z.string().min(1),
  fix: z.string().min(1),
});

const minWordsRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("min-words"),
  min: z.number().int().positive(),
  weight: z.number().nonnegative(),
});

const presenceRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("presence"),
  pattern: regexString("pattern"),
  flags: regexFlags,
  invert: z.boolean().default(false),
  /**
   * What the pattern is tested against. `document` (the default, and the historical behaviour)
   * is the whitespace-collapsed resume; `line` tests each line, which is what any pattern using
   * `^`/`$` actually needs; `heading` tests only lines shaped like section headings, so a rule
   * asking "is there an Experience section" cannot be satisfied by the word appearing in prose.
   */
  scope: z.enum(["document", "line", "heading"]).default("document"),
  weight: z.number().nonnegative(),
});

const positionRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("position"),
  emailPattern: regexString("emailPattern"),
  phonePattern: regexString("phonePattern"),
  windowFraction: z.number().min(0).max(1),
  weight: z.number().nonnegative(),
});

const bandsRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("bands"),
  metric: z.enum(["wordCount", "metricsRatio", "actionVerbRatio", "buzzwordCount"]),
  pattern: regexString("pattern").optional(),
  flags: regexFlags,
  bands: z.array(bandSchema).min(1),
});

/**
 * Scores a signal recovered from the document's own geometry rather than from its text —
 * whether the page is laid out in columns, whether it contains ruled table grids. These are the
 * failures that text alone cannot see: a two-column resume extracts as perfectly ordinary words
 * in a ruinous order, and nothing in the character stream gives that away.
 *
 * Only file uploads carry geometry. When a resume arrives as pasted text or a Studio document
 * there is nothing to measure, so the rule is dropped from the report entirely — neither passed
 * nor failed, and excluded from the score's denominator. Scoring an unmeasurable signal in
 * either direction would be a guess presented as a check.
 */
const layoutRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("layout"),
  metric: z.enum(["columnRatio", "tableCount"]),
  appliesWhen: z.literal("layout"),
  bands: z.array(bandSchema).min(1),
});

/**
 * Scores how much of the resume a parser could actually recover.
 *
 * Distinct from every other rule kind because it grades the *document as data* rather than the
 * document as prose. An applicant tracking system does not rank a resume; it shreds it into a
 * row per job holding an employer, a title and a date range, and lets recruiters filter those
 * rows. A resume whose history cannot be recovered arrives with empty columns — invisible to the
 * filter no matter how well it reads. These metrics come from `parseResume`, and its failure to
 * find a field is the finding.
 */
const parsedRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("parsed"),
  metric: z.enum([
    "rolesDetected",
    "roleCompleteness",
    "datedRoleRatio",
    "contactCompleteness",
    "educationDetected",
  ]),
  bands: z.array(bandSchema).min(1),
});

const ruleSchema = z.discriminatedUnion("kind", [
  minWordsRule,
  presenceRule,
  positionRule,
  bandsRule,
  layoutRule,
  parsedRule,
]);

/**
 * Vocabulary the resume parser needs. Data, so it lives in the policy alongside the rules rather
 * than in the source — a new job-title word or degree spelling should not require a deploy.
 */
const resumeParseSchema = z.object({
  sections: z.object({
    experience: regexString("sections.experience"),
    education: regexString("sections.education"),
    skills: regexString("sections.skills"),
    projects: regexString("sections.projects"),
    /** Any other heading. Classified only so that it terminates the block above it. */
    other: regexString("sections.other"),
  }),
  /**
   * Month name -> month number, for the date spellings a resume actually uses.
   *
   * Language-bound, so it belongs in the policy rather than in the parser. It was previously a
   * constant in source, which would have made a second locale a rewrite of the date scanner
   * instead of another policy file. Optional, and defaulted to English, so an existing policy
   * written before this field stays valid and behaves exactly as it did.
   */
  months: z.record(z.number().int().min(1).max(12)).default({
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }),
  /** The ways a resume says a role is still current. Language-bound, hence data. */
  openEnded: z
    .array(z.string().min(1))
    .min(1)
    .default(["present", "current", "now", "ongoing", "to date", "till date"]),
  /** Words that mark a fragment as a job title rather than an employer name. */
  titleWords: wordList("titleWords"),
  /** Words that mark a fragment as an institution. */
  schoolWords: wordList("schoolWords"),
  degrees: z.object({
    diploma: regexString("degrees.diploma"),
    associate: regexString("degrees.associate"),
    bachelor: regexString("degrees.bachelor"),
    master: regexString("degrees.master"),
    doctorate: regexString("degrees.doctorate"),
  }),
});

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

const keywordMatchSchema = z
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
    stopwords: z.array(z.string()),
    synonyms: z.record(z.string()),
    /**
     * One-way skill implications, applied to the resume only: holding the key demonstrates the
     * values. Terraform *is* infrastructure as code; PostgreSQL *is* a relational database. Plain
     * token equality reported those as gaps and told the candidate to add words describing work
     * the resume already evidenced.
     *
     * Deliberately not symmetric. "Terraform" implies "infrastructure as code"; the reverse does
     * not hold, and inferring it would credit the candidate with a tool they never named.
     */
    implies: z.record(z.array(z.string())),
    phrases: z.array(z.string()),
    buzzwords: z.array(z.string()),
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
          code: z.ZodIssueCode.custom,
          path: ["phrases"],
          message: `multi-word term "${term}" is referenced by implies/synonyms but missing from phrases, so it can never match`,
        });
  });

/**
 * Text-shape vocabulary the scorer itself reads, as opposed to the parser or the matcher.
 *
 * `contentLineVerbs` decides which lines count as substantive content — the denominator both
 * ratio metrics divide by. It is a list of English verbs, so it is data; it was previously a
 * literal in the scorer, which is exactly the kind of thing that turns adding a locale into a
 * rewrite.
 *
 * Deliberately its own field rather than reusing the `actionVerbRatio` rule's pattern. The two
 * lists overlap but are not the same list and never were: this one decides what gets measured,
 * that one decides what scores well, and quietly collapsing them would change which lines are
 * counted. The default below is the exact list this replaced, so a policy that does not mention
 * the field behaves identically to the code that came before it.
 */
const engineTextSchema = z
  .object({
    contentLineVerbs: z
      .array(z.string().min(1))
      .min(1)
      .default([
        "managed",
        "led",
        "built",
        "developed",
        "designed",
        "improved",
        "reduced",
        "increased",
        "delivered",
        "achieved",
        "created",
        "generated",
        "optimized",
        "launched",
        "spearheaded",
        "engineered",
        "maintained",
        "scaled",
        "automated",
      ]),
  })
  .default({});

const atsEngineSchema = z.object({
  version: z.string().min(1),
  rules: z.array(ruleSchema).min(1),
  keywordMatch: keywordMatchSchema,
  resumeParse: resumeParseSchema,
  text: engineTextSchema,
});

export type AtsEngineRule = z.infer<typeof ruleSchema>;
export type AtsEnginePolicy = z.infer<typeof atsEngineSchema>;

export { atsEngineSchema };
