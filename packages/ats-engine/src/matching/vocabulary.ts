import type { AtsEnginePolicy } from "../policy/schema.js";
import { VOCABULARY_TOKEN, escapeRegex, stem } from "./text.js";

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
 * Memoised against the policy object it was derived from, not against a module-level singleton.
 *
 * A WeakMap keyed on the caller's own policy is not the hidden global state the extraction set
 * out to remove: it holds nothing when no policy is live, two policies cannot see each other's
 * entry, and passing the same policy twice is the only way to get a cache hit. It is a pure
 * function's memo table, and it keeps `buildVocabulary` off the per-request path.
 */
const vocabularyCache = new WeakMap<AtsEnginePolicy["keywordMatch"], Vocabulary>();

/**
 * Folds a raw word to the same canonical key `extractVocabulary` would file it under, so
 * alternation detection and term lookup agree on what counts as "the same skill".
 */
export function canonicalize(raw: string, km: AtsEnginePolicy["keywordMatch"], vocab: Vocabulary) {
  const word = raw.toLowerCase().replace(/[./]+$/, "");
  if (!word || vocab.stopwords.has(word) || vocab.stopwords.has(stem(word))) return null;
  const mapped = km.synonyms[word] ?? word;
  return mapped.includes(" ") ? mapped : stem(mapped);
}

export function buildVocabulary(km: AtsEnginePolicy["keywordMatch"]): Vocabulary {
  const cached = vocabularyCache.get(km);
  if (cached) return cached;

  const stopwords = new Set<string>();
  for (const word of km.stopwords) {
    stopwords.add(word);
    stopwords.add(stem(word));
  }

  // Everything the policy names explicitly — phrases plus both sides of the synonym map — is a
  // known skill by construction. Anything else has to earn the classification at match time.
  const skillTokens = new Set<string>();
  for (const phrase of km.phrases) skillTokens.add(phrase);
  for (const [abbreviation, canonical] of Object.entries(km.synonyms)) {
    skillTokens.add(stem(abbreviation));
    skillTokens.add(canonical.includes(" ") ? canonical : stem(canonical));
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

  vocabularyCache.set(km, vocabulary);
  return vocabulary;
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
    // A trailing plural on the last word still refers to the same concept, and postings write
    // it either way ("relational database" / "relational databases"). Without this the phrase
    // fails to match and its words scatter into unrelated single terms.
    const re = new RegExp(`\\b${escapeRegex(phrase)}(?:e?s)?\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower))) {
      map.set(phrase, { token: phrase, label: phrase, skill: true });
      claimed.fill(1, match.index, match.index + match[0].length);
      if (match.index === re.lastIndex) re.lastIndex += 1;
    }
  }

  // Cloned rather than reused: a module-level /g/ regex carries `lastIndex` across calls.
  const tokenRe = new RegExp(VOCABULARY_TOKEN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(lower))) {
    if (claimed[match.index]) continue;
    const raw = match[0].replace(/[./]+$/, "");
    if (!raw || vocab.stopwords.has(raw) || vocab.stopwords.has(stem(raw))) continue;

    const mapped = km.synonyms[raw] ?? raw;
    if (mapped.includes(" ")) {
      if (!map.has(mapped)) map.set(mapped, { token: mapped, label: mapped, skill: true });
      continue;
    }
    const token = stem(mapped);
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
 * "familiarity" are not. Cheap, language-agnostic, and needs no corpus.
 */
export function properNounTokens(originalText: string) {
  const proper = new Set<string>();
  const re = /[A-Za-z][A-Za-z0-9+#./-]*/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(originalText))) {
    const token = match[0];
    const before = originalText.slice(Math.max(0, match.index - 2), match.index);
    const sentenceStart = match.index === 0 || /[.!?:\n]\s*$/.test(before) || /^\s*$/.test(before);

    if (/^[A-Z0-9+#.]{2,6}$/.test(token) || (/^[A-Z]/.test(token) && !sentenceStart))
      proper.add(token.toLowerCase().replace(/[./]+$/, ""));
  }
  return proper;
}
