import type { AtsEnginePolicy } from "../policy/schema.js";
import { memo } from "../util/memo.js";
import { own } from "../util/own.js";
import { VOCABULARY_TOKEN, WORD_CHARS, escapeRegex, stem } from "../text/text.js";

export type Term = { token: string; label: string; skill: boolean };

export type Vocabulary = {
  /** Stopwords stored both raw and stemmed, so "experiences" is filtered like "experience". */
  stopwords: Set<string>;
  /** Canonical tokens the policy explicitly recognises as skills. */
  skillTokens: Set<string>;
  /** Canonical skill -> canonical capabilities it demonstrates. Resume side only. */
  implies: Map<string, string[]>;
};

/**
 * Folds a raw word to the same canonical key `extractVocabulary` would file it under, so
 * alternation detection and term lookup agree on what counts as "the same skill".
 */
export function canonicalize(raw: string, km: AtsEnginePolicy["keywordMatch"], vocab: Vocabulary) {
  const word = raw.toLowerCase().replace(/(?<![./])[./]+$/, "");
  if (!word || vocab.stopwords.has(word) || vocab.stopwords.has(stem(word, km.stemming)))
    return null;
  const mapped = own(km.synonyms, word) ?? word;
  return mapped.includes(" ") ? mapped : stem(mapped, km.stemming);
}

/** The policy's term maps, folded once per policy (see `memo`). */
export const buildVocabulary = memo((km: AtsEnginePolicy["keywordMatch"]): Vocabulary => {
  const stopwords = new Set<string>();
  for (const word of km.stopwords) {
    stopwords.add(word);
    stopwords.add(stem(word, km.stemming));
  }

  // Everything the policy names explicitly — phrases plus both sides of the synonym map — is a
  // known skill by construction. Anything else has to earn the classification at match time.
  const skillTokens = new Set<string>();
  for (const phrase of km.phrases) skillTokens.add(phrase);
  for (const [abbreviation, canonical] of Object.entries(km.synonyms)) {
    skillTokens.add(stem(abbreviation, km.stemming));
    skillTokens.add(canonical.includes(" ") ? canonical : stem(canonical, km.stemming));
  }

  const vocabulary: Vocabulary = { stopwords, skillTokens, implies: new Map() };

  // Both sides of the implication map are folded through the same canonicalisation the term
  // maps use, so "PostgreSQL" -> "relational database" lines up with whatever spelling the
  // posting happened to use.
  for (const [skill, capabilities] of Object.entries(km.implies)) {
    const from = canonicalize(skill, km, vocabulary);
    if (!from) continue;
    const to = capabilities
      .map((capability) => canonicalize(capability, km, vocabulary))
      .filter((token): token is string => Boolean(token));
    if (to.length) vocabulary.implies.set(from, to);
  }
  return vocabulary;
});

/**
 * Each phrase's pattern, compiled once. Keyed on the plural-suffix list — the only other input to
 * the pattern — rather than on `keywordMatch`, because the requirements judge passes a copy of
 * it with a filtered phrase list, and that copy shares this array. Recompiling every phrase on
 * every call cost more than the matching: a 400-phrase policy doubled the time of a check.
 */
const phrasesOf = memo<readonly string[], Map<string, RegExp>>(() => new Map());

function phrasePattern(phrase: string, pluralSuffixes: readonly string[]) {
  const patterns = phrasesOf(pluralSuffixes);
  let re = patterns.get(phrase);
  if (!re) {
    // A trailing plural on the last word still refers to the same concept, and postings write
    // it either way ("relational database" / "relational databases"). Without this the phrase
    // fails to match and its words scatter into unrelated single terms.
    re = new RegExp(
      `(?<![${WORD_CHARS}_])${escapeRegex(phrase)}(?:${pluralSuffixes.join("|")})?(?![${WORD_CHARS}_])`,
      "giu",
    );
    patterns.set(phrase, re);
  }
  // Shared and global: every use starts from the beginning.
  re.lastIndex = 0;
  return re;
}

/**
 * Maps text to canonical term -> term metadata. Multi-word skills collapse to one token,
 * synonyms and abbreviations fold to a shared canonical form, and single words are lightly
 * stemmed so inflections line up.
 *
 * Phrase occurrences are consumed *by character span* rather than by word. Suppressing the
 * component words globally meant a resume containing "machine learning" no longer matched a
 * posting that used "learning" and "machine" separately — the words were struck from the whole
 * document because they happened to appear inside a phrase elsewhere in it.
 */
export function extractVocabulary(
  text: string,
  km: AtsEnginePolicy["keywordMatch"],
  vocab: Vocabulary,
) {
  const lower = text.toLowerCase();
  const map = new Map<string, Term>();
  // Character mask marking spans already claimed by a multi-word phrase.
  const claimed = new Uint8Array(lower.length);

  for (const phrase of km.phrases) {
    // Most of a large phrase list is absent from any one text, and a substring test is far
    // cheaper than compiling and running a Unicode-boundary pattern the first time.
    if (!lower.includes(phrase.toLowerCase())) continue;
    const re = phrasePattern(phrase, km.pluralSuffixes);
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower))) {
      map.set(phrase, { token: phrase, label: phrase, skill: true });
      claimed.fill(1, match.index, match.index + match[0].length);
      if (match.index === re.lastIndex) re.lastIndex += 1;
    }
  }

  // Cloned rather than reused: a module-level /g/ regex carries `lastIndex` across calls.
  const tokenRe = new RegExp(VOCABULARY_TOKEN.source, "gu");
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(lower))) {
    if (claimed[match.index]) continue;
    const raw = match[0].replace(/(?<![./])[./]+$/, "");
    if (!raw || vocab.stopwords.has(raw) || vocab.stopwords.has(stem(raw, km.stemming))) continue;

    const mapped = own(km.synonyms, raw) ?? raw;
    if (mapped.includes(" ")) {
      if (!map.has(mapped)) map.set(mapped, { token: mapped, label: mapped, skill: true });
      continue;
    }
    const token = stem(mapped, km.stemming);
    if (!map.has(token)) map.set(token, { token, label: raw, skill: vocab.skillTokens.has(token) });
  }

  return map;
}

/**
 * The resume's literal terms plus everything they demonstrate. Matching against this rather
 * than the literal set is what stops the report telling a candidate who listed Terraform that
 * they are missing "infrastructure as code".
 */
export function resumeCapabilities(resumeTerms: Map<string, Term>, vocab: Vocabulary) {
  const capabilities = new Set(resumeTerms.keys());
  for (const token of resumeTerms.keys())
    for (const implied of vocab.implies.get(token) ?? []) capabilities.add(implied);
  return capabilities;
}

/**
 * Tokens written with a capital letter somewhere other than the start of a sentence, plus
 * short all-caps runs. Used as a specificity signal: "Kubernetes", "PostgreSQL", "Go", "AWS"
 * are proper nouns or acronyms and are almost always the actual skill; "payments", "ownership",
 * "familiarity" are not. Cheap and needs no corpus.
 *
 * In a language that capitalises every noun (`nounsCapitalized`, German) a leading capital is
 * no signal at all — "Erfahrung" would rank beside "Kubernetes" — so only acronyms and inner
 * capitals ("PostgreSQL", "JavaScript", "iOS") count there. A script without case gives no
 * signal either way; its specificity comes from the policy's skill vocabulary alone.
 */
export function properNounTokens(originalText: string, nounsCapitalized = false) {
  const proper = new Set<string>();
  const re = /\p{L}[\p{L}\p{M}\p{N}+#./-]*/gu;
  let match: RegExpExecArray | null;

  while ((match = re.exec(originalText))) {
    const token = match[0];
    const acronym = /^[\p{Lu}\p{N}+#.]{2,6}$/u.test(token);
    const innerCapital = /\p{Ll}\p{Lu}/u.test(token);
    let capitalised = false;
    if (!nounsCapitalized && /^\p{Lu}/u.test(token)) {
      // Back past spaces and list markers to the previous sentence boundary or line break, so
      // an indented bullet ("      - Proficient") still opens a sentence.
      const before = originalText.slice(Math.max(0, match.index - 40), match.index);
      capitalised = !/(?:^|[.!?:\n])[^\p{L}\p{N}]*$/u.test(before);
    }

    if (acronym || innerCapital || capitalised)
      proper.add(token.toLowerCase().replace(/(?<![./])[./]+$/, ""));
  }
  return proper;
}
