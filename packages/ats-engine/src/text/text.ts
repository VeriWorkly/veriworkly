import { stripHiddenCharacters } from "./characters.js";

/**
 * Shared text primitives.
 *
 * Grammar rather than vocabulary: tokenisation, stemming, regex escaping, template filling. None
 * of it names an English word, so none of it belongs in the policy — the word lists these operate
 * over all do.
 */

/**
 * A list marker at the start of a line: any symbol glyph (•, ●, ▪, the Word Symbol-font , ➢,
 * ✓, -, *), a list number ("1.", "2)"), or Word's lettered "o" bullet. Opening brackets, quotes,
 * currency signs and "+" are excluded so "(Contract) Engineer", "$2M revenue" and "+1 415…" are
 * not mistaken for bullets. A "." starts real words too (".NET", ".js"), so it is a marker only
 * with whitespace after it.
 */
const MARKER = String.raw`(?:[^\p{L}\p{N}\s(\[{"'“‘$€£₹+.]|\.(?=\s)|\d{1,2}[.)](?=\s)|o(?=\s))`;
export const BULLET = new RegExp(`^\\s*${MARKER}`, "u");
/** Every leading marker and the space after it, for stripping. */
export const BULLET_PREFIX = new RegExp(`^\\s*(?:${MARKER}\\s*)+`, "u");

/**
 * What a word is made of, in any script: letters, the combining marks that belong to them
 * (Devanagari vowel signs are marks, not letters) and digits. For use inside a `u`-flag class.
 */
export const WORD_CHARS = String.raw`\p{L}\p{M}\p{N}`;

/**
 * `\b(?:a|b|c)\b` for words in any script.
 *
 * JavaScript's `\b` is ASCII-only even under the `u` flag, so `\bmanaged\b` holds but
 * `\bleitete\b` fails beside "ü" and `\bअनुभव\b` never matches at all. The lookarounds use the
 * Unicode classes instead; `_` stays a word character, as it is for `\b`. Entries are joined
 * unescaped, so a list may carry small patterns (`sr\.?`). Compile with the `u` flag.
 */
export function wordListPattern(list: readonly string[]) {
  return `(?<![${WORD_CHARS}_])(?:${list.join("|")})(?![${WORD_CHARS}_])`;
}

export function wordListRegex(list: readonly string[], flags = "i") {
  return new RegExp(wordListPattern(list), `${flags}u`);
}

/**
 * The first `max` UTF-16 units, one fewer when the cut would fall inside a surrogate pair: half an
 * emoji is a lone surrogate, which is not text and fails to encode downstream.
 */
export function cut(text: string, max: number) {
  return /[\uD800-\uDBFF]/.test(text.charAt(max - 1)) ? text.slice(0, max - 1) : text.slice(0, max);
}

/**
 * The zero of every decimal-digit block resumes are written in besides ASCII: Arabic-Indic and
 * its extended form, N'Ko, the Indic scripts, Sinhala, Thai, Lao, Tibetan, Myanmar, Khmer and
 * Mongolian. Fullwidth and mathematical digits need no entry; NFKC already folds those.
 */
const DIGIT_ZEROS = [
  0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66,
  0x0de6, 0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810,
];

function asciiDigit(digit: string) {
  const code = digit.codePointAt(0)!;
  const zero = DIGIT_ZEROS.find((start) => code >= start && code < start + 10);
  return zero === undefined ? digit : String(code - zero);
}

/**
 * Text in the one form every pattern in the engine and its policy is written against.
 *
 * NFKC folds what PDF extraction and word processors leave behind — the "ﬁ" ligature that
 * turned "ofﬁce" into a word no pattern knew, fullwidth letters, non-breaking spaces — and
 * composes accented letters so "é" is one code point however it was typed. Decimal digits of
 * every script read as ASCII, so "२०१९ - २०२२" is a date range and "+९१ …" a phone number.
 * Characters that are invisible and do nothing (zero-width spaces, tag characters) are removed,
 * so the words read are the words a person sees; `prepareResume` counts them first.
 */
export function normalizeText(text: string) {
  return stripHiddenCharacters(text.normalize("NFKC").replace(/\p{Nd}/gu, asciiDigit));
}

/** The words a length or density check counts: three or more characters, starting with a letter. */
export function words(text: string) {
  return text.toLowerCase().match(/\p{L}[\p{L}\p{M}\p{N}+#.-]{2,}/gu) ?? [];
}

/**
 * Permissive vocabulary tokenizer, used with `exec` so match offsets are available for phrase
 * masking. Preserves leading-dot frameworks (.net), slash-delimited concepts (ci/cd, tcp/ip),
 * symbols (c++, c#), and domain terms (node.js, next.js) without dropping 2-letter tokens like
 * js, ai, ml, ux. Trailing "." and "/" picked up from sentence ends are stripped at the call
 * site so "JavaScript." and "JavaScript" fold together. Any script: run on lower-cased text.
 */
export const VOCABULARY_TOKEN = /(?:\.[\p{L}\p{M}\p{N}+#]+|\p{L}[\p{L}\p{M}\p{N}+#./-]*)/gu;

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One suffix rule: a word longer than `minLength` ending in `suffix` ends in `replacement`. */
export type StemRule = { suffix: string; minLength: number; replacement: string; unless?: string };

/**
 * Conservative suffix stripper — good enough to fold "managed/manages/managing" together without
 * a stemmer dependency. The first rule that applies wins. The rules are the policy's
 * (`keywordMatch.stemming`), English by default.
 */
export function stem(word: string, rules: readonly StemRule[]): string {
  for (const { suffix, minLength, replacement, unless } of rules)
    if (word.length > minLength && word.endsWith(suffix) && !(unless && word.endsWith(unless)))
      return word.slice(0, -suffix.length) + replacement;
  return word;
}

export function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
