import { AtsPolicyError } from "../policy/errors.js";
import { parseAtsPolicy } from "../policy/parse.js";
import type { AtsEnginePolicy, AtsEnginePolicyInput, AtsEngineRule } from "../policy/schema.js";
import { phoneCountry } from "../parser/phone.js";
import { memo } from "../util/memo.js";
import { own } from "../util/own.js";
import type {
  AtsLanguagePack,
  AtsLanguagePackInput,
  AtsRegionPack,
  AtsRegionPackInput,
  AtsVocabulary,
} from "./schema.js";

/**
 * Attaches locale packs to a policy, validating them with it. Packs with an id the policy
 * already has replace that pack. Call once, where the policy is loaded; the result is an
 * ordinary policy to pass to `check`.
 */
export function withLocales(
  policy: AtsEnginePolicyInput,
  packs: { languages?: AtsLanguagePackInput[]; regions?: AtsRegionPackInput[] },
): AtsEnginePolicy {
  const byId = <T extends { id: string }>(existing: T[] = [], added: T[] = []) => [
    ...new Map([...existing, ...added].map((pack) => [pack.id, pack])).values(),
  ];
  const attached = parseAtsPolicy({
    ...policy,
    locales: {
      languages: byId(policy.locales?.languages, packs.languages),
      regions: byId(policy.locales?.regions, packs.regions),
    },
  });
  assertCombinable(attached);
  return attached;
}

/**
 * Each pack's patterns are valid alone, yet joined to the base's as alternatives they can still
 * fail to compile — a named group the base and a pack both use is a duplicate — and would then
 * throw on the first resume read in that language. So the combinations `check` can build are
 * compiled here, through the same schema: every language pack at once, with each region in turn.
 * A clash between any packs that can apply together shows up in one of those.
 */
function assertCombinable(policy: AtsEnginePolicy) {
  const { languages, regions } = policy.locales;
  if (!languages.length && !regions.length) return;
  const allLanguages = languages.reduce(applyVocabulary, policy);
  for (const region of regions.length ? regions : [undefined]) {
    const combined = region ? applyRegion(allLanguages, region) : allLanguages;
    try {
      parseAtsPolicy({ ...combined, locales: undefined });
    } catch (error) {
      if (!(error instanceof AtsPolicyError)) throw error;
      const ids = [...languages.map((pack) => pack.id), ...(region ? [region.id] : [])];
      throw new AtsPolicyError(
        `Locale packs ${ids.join(", ")} combine with the policy into an invalid one.`,
        error.issues,
      );
    }
  }
}

const union = (base: string[], added?: readonly string[]) =>
  added?.length ? [...new Set([...base, ...added])] : base;
const either = (base: string, added?: string) => (added ? `(?:${base})|(?:${added})` : base);

/** A policy with a pack's vocabulary added to its own: lists joined, patterns as alternatives. */
function applyVocabulary(policy: AtsEnginePolicy, v: AtsVocabulary): AtsEnginePolicy {
  const { resumeParse: rp, keywordMatch: km, text } = policy;

  const degrees = { ...rp.degrees };
  for (const [level, pattern] of Object.entries(v.degrees ?? {}) as Array<
    [keyof typeof degrees, string | undefined]
  >)
    if (pattern) degrees[level] = degrees[level] ? either(degrees[level], pattern) : pattern;

  return {
    ...policy,
    resumeParse: {
      ...rp,
      sections: {
        experience: either(rp.sections.experience, v.sections?.experience),
        education: either(rp.sections.education, v.sections?.education),
        skills: either(rp.sections.skills, v.sections?.skills),
        projects: either(rp.sections.projects, v.sections?.projects),
        other: either(rp.sections.other, v.sections?.other),
      },
      months: { ...rp.months, ...v.months },
      openEnded: union(rp.openEnded, v.openEnded),
      rangeWords: union(rp.rangeWords, v.rangeWords),
      sinceWords: union(rp.sinceWords, v.sinceWords),
      employerWords: union(rp.employerWords, v.employerWords),
      titleWords: union(rp.titleWords, v.titleWords),
      schoolWords: union(rp.schoolWords, v.schoolWords),
      documentTitles: union(rp.documentTitles, v.documentTitles),
      nameParticles: union(rp.nameParticles, v.nameParticles),
      dateOfBirthLabels: union(rp.dateOfBirthLabels, v.dateOfBirthLabels),
      headingConnectors: union(rp.headingConnectors, v.headingConnectors),
      degrees,
    },
    text: {
      ...text,
      contentLineVerbs: union(text.contentLineVerbs, v.contentLineVerbs),
      actionVerbs: union(text.actionVerbs, v.actionVerbs),
      actionVerbAnywhere: text.actionVerbAnywhere || Boolean(v.actionVerbAnywhere),
      injectionPhrases: union(text.injectionPhrases, v.injectionPhrases),
    },
    keywordMatch: {
      ...km,
      sections: {
        required: either(km.sections.required, v.jobSections?.required),
        preferred: either(km.sections.preferred, v.jobSections?.preferred),
        responsibilities: either(km.sections.responsibilities, v.jobSections?.responsibilities),
        excluded: either(km.sections.excluded, v.jobSections?.excluded),
      },
      alternationWords: union(km.alternationWords, v.alternationWords),
      stopwords: union(km.stopwords, v.stopwords),
      buzzwords: union(km.buzzwords, v.buzzwords),
      pluralSuffixes: union(km.pluralSuffixes, v.pluralSuffixes),
      nounsCapitalized: km.nounsCapitalized || Boolean(v.nounsCapitalized),
      requirements: {
        yearsPatterns: union(km.requirements.yearsPatterns, v.requirements?.yearsPatterns),
        equivalence: union(km.requirements.equivalence, v.requirements?.equivalence),
        authorization: union(km.requirements.authorization, v.requirements?.authorization),
        clearance: union(km.requirements.clearance, v.requirements?.clearance),
        languagePatterns: union(km.requirements.languagePatterns, v.requirements?.languagePatterns),
        languageNames: { ...km.requirements.languageNames, ...v.requirements?.languageNames },
      },
    },
  };
}

/**
 * A rule as a region weighs it, or null when the region turns it off (`weight: 0`). Off, not
 * passed: a date-of-birth rule weighted to nothing would otherwise report "no date of birth is
 * stated" about a resume that states one.
 */
function adjustRule(
  rule: AtsEngineRule,
  change: AtsRegionPack["rules"][string] | undefined,
): AtsEngineRule | null {
  if (!change) return rule;
  if (change.weight === 0) return null;
  const adjusted = change.severity ? { ...rule, severity: change.severity } : { ...rule };
  const { weight } = change;
  if (weight === undefined) return adjusted;
  if ("bands" in adjusted)
    return {
      ...adjusted,
      bands: adjusted.bands.map((band) => (band.weight > 0 ? { ...band, weight } : band)),
    };
  return { ...adjusted, weight };
}

function applyRegion(policy: AtsEnginePolicy, region: AtsRegionPack): AtsEnginePolicy {
  const localized = applyVocabulary(policy, region);
  return {
    ...localized,
    rules: localized.rules
      .map((rule) => adjustRule(rule, own(region.rules, rule.id)))
      .filter((rule): rule is AtsEngineRule => rule !== null),
    resumeParse: {
      ...localized.resumeParse,
      dateOrder: region.dateOrder,
      phoneRegions: union([region.phoneCountry], localized.resumeParse.phoneRegions),
    },
  };
}

const DETECTION_SAMPLE = 20_000;
const detectionOf = memo((pack: AtsLanguagePack) => ({
  words: new Set(pack.detectionWords.map((word) => word.toLowerCase())),
  script: pack.script ? new RegExp(`\\p{Script=${pack.script}}`, "gu") : undefined,
}));

/** A text's opening, as language detection reads it. */
type Sample = { text: string; words: string[] };

/**
 * The words are taken from everything but email addresses and URLs, which spell names rather
 * than a language: "ananya.das@gmail.com" and "linkedin.com/in/ananya-das" are not German.
 * Split on whitespace rather than matched by a pattern, which a long unbroken token would make
 * quadratic.
 */
function sampleOf(text: string): Sample {
  const sample = text.slice(0, DETECTION_SAMPLE);
  const prose = sample
    .split(/\s+/)
    .filter((token) => !/[@/]/.test(token))
    .join(" ");
  return { text: sample, words: prose.toLowerCase().match(/\p{L}[\p{L}\p{M}]*/gu) ?? [] };
}

/**
 * Whether the text is written, at least partly, in the pack's language.
 *
 * A script decides outright when it covers a fair share of the letters: a Hindi resume is
 * Devanagari, whatever English terms it carries. A Latin-script language is recognised by its
 * detection words — at least three different ones, and at least 3% of all words, so a German
 * company name in an English resume ("Müller und Söhne") does not make the resume German, and
 * neither does a surname that is one of the words ("Das") however often it is repeated.
 */
function isWrittenIn({ text, words }: Sample, pack: AtsLanguagePack) {
  const detection = detectionOf(pack);
  if (detection.script) {
    const letters = text.match(/[\p{L}\p{M}]/gu)?.length ?? 0;
    const inScript = text.match(detection.script)?.length ?? 0;
    return inScript >= 20 && inScript / Math.max(letters, 1) >= 0.15;
  }
  const hits = words.filter((word) => detection.words.has(word));
  return new Set(hits).size >= 3 && hits.length / Math.max(words.length, 1) >= 0.03;
}

/** What `check` read a resume as. Packs are named by id; the policy's base vocabulary is not. */
export type AtsLocale = { languages: string[]; region: string | null };

export type AtsLocaleOptions = {
  /** Language pack ids to read with, instead of detecting them. `[]` reads with the base only. */
  languages?: string[];
  /** The region pack id to apply, instead of inferring one. */
  region?: string;
};

/** Per base policy: every language, region and date-order combination it has been localised to. */
const localizedOf = memo<AtsEnginePolicy, Map<string, AtsEnginePolicy>>(() => new Map());

const FULL_DATE = /(?<!\d)(\d{1,2})[./-](\d{1,2})[./-]\d{4}(?!\d)/g;

/**
 * How the resume orders an all-numeric date, when its own dates settle it: "15/07/2015" can only
 * be day-first, "07/15/2015" only month-first. Undefined when none settles it or they disagree.
 * The country's convention is a guess; a resume that writes a 15th of the month is not.
 */
function dateOrderIn(text: string): "DMY" | "MDY" | undefined {
  let dayFirst = false;
  let monthFirst = false;
  for (const [, first, second] of text.matchAll(FULL_DATE)) {
    if (Number(first) > 12 && Number(second) <= 12) dayFirst = true;
    else if (Number(second) > 12 && Number(first) <= 12) monthFirst = true;
  }
  return dayFirst === monthFirst ? undefined : dayFirst ? "DMY" : "MDY";
}

/**
 * The policy a given resume (and posting) is scored with: the base, plus the attached language
 * packs it is written in, plus one region, plus the date order the resume's own dates show.
 *
 * The region is the one asked for; failing that the country of the first phone number written
 * with a country code; failing that the default region of a language the resume itself is
 * written in (or of a language asked for). Memoised per
 * combination, so every resume read as German shares one compiled policy.
 */
export function localizePolicy(
  policy: AtsEnginePolicy,
  text: string,
  options: AtsLocaleOptions = {},
  /** The resume alone, without a posting: what names the region and the date order. */
  resumeText = text,
): { policy: AtsEnginePolicy; locale: AtsLocale } {
  const { languages: packs, regions } = policy.locales;
  // A region asked for by name is applied or refused, never dropped: ignoring it would also skip
  // the inference from the phone number, and score the resume under no region without a word.
  const asked = options.region
    ? regions.find((pack) => pack.id === options.region!.toUpperCase())
    : undefined;
  if (options.region && !asked) {
    const attached = regions.map((pack) => pack.id).join(", ") || "none";
    throw new AtsPolicyError(
      `Region "${options.region}" is not attached to the policy (attached: ${attached}).`,
      [{ path: "locales.regions", message: `no region pack with id "${options.region}"` }],
    );
  }
  const dateOrder = dateOrderIn(resumeText.slice(0, DETECTION_SAMPLE));
  if (packs.length === 0 && regions.length === 0 && dateOrder === undefined)
    return { policy, locale: { languages: [], region: null } };

  // The resume and the posting are detected apart, each in its own language: measured together,
  // a long English posting dilutes a German resume below the share that recognises it.
  const posting =
    text === resumeText ? "" : text.startsWith(resumeText) ? text.slice(resumeText.length) : text;
  const resumeSample = sampleOf(resumeText);
  const postingSample = posting ? sampleOf(posting) : undefined;
  const inResume = packs.filter((pack) => isWrittenIn(resumeSample, pack));
  const languages = options.languages
    ? packs.filter((pack) => options.languages!.includes(pack.id))
    : packs.filter(
        (pack) =>
          inResume.includes(pack) ||
          (postingSample !== undefined && isWrittenIn(postingSample, pack)),
      );

  // A language only the posting is written in says where the job is, not how the resume writes
  // its dates: a US resume applying to a German posting keeps month-first dates.
  const country = asked ? undefined : phoneCountry(resumeText.slice(0, DETECTION_SAMPLE));
  const region =
    asked ??
    regions.find((pack) => pack.phoneCountry === country) ??
    (options.languages ? languages : inResume)
      .map((pack) => regions.find((candidate) => candidate.id === pack.defaultRegion))
      .find(Boolean);

  const locale: AtsLocale = {
    languages: languages.map((pack) => pack.id),
    region: region?.id ?? null,
  };
  const key = `${locale.languages.join("+")}|${locale.region ?? ""}|${dateOrder ?? ""}`;

  const cached = localizedOf(policy);
  let localized = cached.get(key);
  if (!localized) {
    localized = languages.reduce(applyVocabulary, policy);
    if (region) localized = applyRegion(localized, region);
    // With no region known, a national number is still recovered if any attached region reads
    // it. The region is not inferred from that: the "min" metadata takes nearly any 10-digit run
    // as a valid German or Indian number, US ones included, so validity cannot name a country.
    else if (regions.length)
      localized = {
        ...localized,
        resumeParse: {
          ...localized.resumeParse,
          phoneRegions: union(
            localized.resumeParse.phoneRegions,
            regions.map((pack) => pack.phoneCountry),
          ),
        },
      };
    if (dateOrder)
      localized = { ...localized, resumeParse: { ...localized.resumeParse, dateOrder } };
    cached.set(key, localized);
  }
  return { policy: localized, locale };
}
