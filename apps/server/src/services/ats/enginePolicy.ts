import { z } from "zod";

import { config } from "#config";
import { getAtsEnginePolicyJson } from "#services/aiPrivateConfig";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

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
  pattern: z.string().min(1),
  flags: z.string().default(""),
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
  emailPattern: z.string().min(1),
  phonePattern: z.string().min(1),
  windowFraction: z.number().min(0).max(1),
  weight: z.number().nonnegative(),
});

const bandsRule = z.object({
  ...ruleBase.shape,
  kind: z.literal("bands"),
  metric: z.enum(["wordCount", "metricsRatio", "actionVerbRatio", "buzzwordCount"]),
  pattern: z.string().min(1).optional(),
  flags: z.string().default(""),
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
    experience: z.string().min(1),
    education: z.string().min(1),
    skills: z.string().min(1),
    projects: z.string().min(1),
    /** Any other heading. Classified only so that it terminates the block above it. */
    other: z.string().min(1),
  }),
  /** Words that mark a fragment as a job title rather than an employer name. */
  titleWords: z.array(z.string()).min(1),
  /** Words that mark a fragment as an institution. */
  schoolWords: z.array(z.string()).min(1),
  degrees: z.object({
    diploma: z.string().min(1),
    associate: z.string().min(1),
    bachelor: z.string().min(1),
    master: z.string().min(1),
    doctorate: z.string().min(1),
  }),
});

/**
 * Heading patterns used to split a posting into blocks. Each block runs to the next heading, so
 * these replace the old fixed-length windows, which overshot the requirements list and promoted
 * nice-to-haves to the required weight. `excluded` blocks (about-us, benefits, EEO boilerplate)
 * are dropped from scoring entirely rather than down-weighted.
 */
const jobSectionSchema = z.object({
  required: z.string().min(1),
  preferred: z.string().min(1),
  responsibilities: z.string().min(1),
  excluded: z.string().min(1),
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

const atsEngineSchema = z.object({
  version: z.string().min(1),
  rules: z.array(ruleSchema).min(1),
  keywordMatch: keywordMatchSchema,
  resumeParse: resumeParseSchema,
});

export type AtsEngineRule = z.infer<typeof ruleSchema>;
export type AtsEnginePolicy = z.infer<typeof atsEngineSchema>;

let cached: AtsEnginePolicy | null = null;

/**
 * Fails the boot rather than the request.
 *
 * The AI policy has always been checked at startup; the scoring policy was not. A missing or
 * malformed engine policy therefore produced a process that reported itself healthy while every
 * `/ats/check` — the free, anonymous, highest-traffic endpoint — returned 503. Nobody finds that
 * out except from users. Validating here turns a silent production outage into a refusal to
 * start, with the offending field named in the log above.
 */
export function validateAtsEngineRuntimeConfig() {
  if (config.nodeEnv === "production") getAtsEnginePolicy();
}

export function getAtsEnginePolicy(): AtsEnginePolicy {
  if (cached) return cached;

  try {
    cached = atsEngineSchema.parse(getAtsEnginePolicyJson());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // The policy is operator-supplied and never reaches a caller, so the specific field that
    // failed belongs in the log. Without it a typo in one rule surfaces only as an opaque 503,
    // which is a miserable thing to debug against a file the process cannot show you.
    if (error instanceof z.ZodError)
      logger.error("ATS engine policy failed validation", {
        issues: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .slice(0, 10),
      });
    throw new ApiError(503, "AI ATS engine policy is invalid.");
  }
  return cached;
}
