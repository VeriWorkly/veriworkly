import { normalizeText } from "../text/text.js";
import { memo } from "../util/memo.js";

/**
 * Grounding checks for the AI parse-repair pass.
 *
 * The deterministic parser cannot invent an employer. A model can, and that is the property we
 * give up the moment one is allowed near the parse. This module buys it back: every value the
 * model returns must appear in the source document, so a fabricated employer is *structurally*
 * detectable rather than something we hope does not happen.
 *
 * The check is deliberately one-directional. It never asks "is this the right employer" — that
 * is a judgement, and judgements are what we are trying not to trust. It asks only "does this
 * string occur in the document the user uploaded", which is decidable. A model that copies the
 * wrong span passes; a model that hallucinates a plausible one does not, and hallucination is
 * the failure that puts a fabricated employer on a person's resume.
 */

/**
 * Source text folded to make matching survive the transformations that caused the bad parse in
 * the first place — a column-scrambled PDF splits words with newlines, ligatures arrive as
 * single glyphs, and a stacked header can leave doubled spaces between tokens.
 *
 * Case is folded too. A model that returns "acme corp" as "Acme Corp" has fixed the casing of a
 * value that is present, which is repair, not invention.
 */
export function normalizeForGrounding(text: string): string {
  // Digits of every script fold to ASCII first, so "2019" grounds in "२०१९" and back.
  return normalizeText(text)
    .normalize("NFKD")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Letters, marks, digits — and "+" and "#", which tell C, C++ and C# apart. */
const WORD = /[\p{L}\p{M}\p{N}+#]+/gu;

/** Scripts written without spaces between words, where a word run can hold a whole sentence. */
const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/** An email address or a web address: compared as a whole token, never word by word. */
const ADDRESS =
  /^(?:[^\s@]+@[^\s@]+|(?:https?:\/\/|www\.)\S+|[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+\/\S+)$/iu;

/** An address without its scheme, "www." and trailing slash: "https://www.x.dev/" is "x.dev". */
const bare = (address: string) =>
  address
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/(?<!\/)\/+$/, "");

/**
 * Whether an address occurs in the source as one of its tokens. An address is an identity, not a
 * phrase: "janedoe@acme.com" is not "jane.doe@acme.com", and "github.com/jane" is not
 * "github.com/janedoe", though their words join the same.
 */
function addressGrounded(value: string, normalized: string) {
  const target = bare(value);
  // The source as written, and as it may have been laid out: "B.Sc/M.Sc" spaced as "B.Sc / M.Sc",
  // or an address broken after its "-", "/" or "@" at a line end. Each reading only adds whole
  // tokens, so neighbouring values never merge into one the source does not hold.
  // (`normalized` has its whitespace collapsed, so a gap is one space.)
  const readings = [
    normalized,
    normalized.replace(/ ?\/ ?/g, "/"),
    normalized.replace(/([-/@]) /g, "$1"),
  ];
  return readings.some((text) =>
    text
      // An icon glyph glued to the address ("✉jane@…") separates it like a space.
      .split(/[\s|,;<>()"'\p{So}\p{Co}]+/u)
      .some(
        (token) =>
          bare(
            token
              // "Email:jane@acme.com": a label, not part of the address; "https://" is kept.
              .replace(/^\p{L}+:(?!\/\/)/u, "")
              .replace(/(?<![.:;!?])[.:;!?]+$/, ""),
          ) === target,
      ),
  );
}

/** The words of a normalised text, in order. Compute once per document and reuse. */
export function groundingWords(normalized: string): string[] {
  return normalized.match(WORD) ?? [];
}

/**
 * Whether `value` occurs in the source as a run of whole words.
 *
 * The value's letters and digits must equal a run of consecutive source words joined together.
 * Whole words, because a substring test grounded "Meta" in "metadata", "Intel" in
 * "intelligence" and "Apple" in "pineapple" — real employers a model could fabricate and have
 * accepted. Joined, because a PDF that splits a word across a line or column ("Acme Corp\noration")
 * must still ground a value copied correctly from it. Punctuation and spacing are ignored on both
 * sides, so "Q&A" matches "q & a" and "Acme Corp" matches "AcmeCorp"; order and adjacency are not,
 * so "Corporation Acme" and "Acme Globex" do not.
 *
 * `normalized` must come from `normalizeForGrounding`. Pass `words` when checking many values
 * against one document, so it is split once.
 */
export function isGrounded(
  value: string,
  normalized: string,
  words: readonly string[] = groundingWords(normalized),
): boolean {
  const folded = normalizeForGrounding(value);
  if (ADDRESS.test(folded)) return addressGrounded(folded, normalized);
  const target = groundingWords(folded).join("");
  if (!target) return true; // no letters or digits: asserts nothing, so there is nothing to ground
  // Chinese, Japanese or Thai run their words together, so a company inside a sentence is part
  // of one long "word"; there any occurrence counts, not only one on word boundaries.
  const { joined, starts } = joinedWords(words);
  const anywhere = UNSPACED.test(target);
  return occurs(
    joined,
    target,
    (at) => anywhere || (starts[at] === 1 && starts[at + target.length] === 1),
  );
}

/** The words run together, and a mark at every offset where a word starts or the run ends. */
const joinedWords = memo((words: readonly string[]) => {
  const joined = words.join("");
  const starts = new Uint8Array(joined.length + 1);
  let at = 0;
  for (const word of words) {
    starts[at] = 1;
    at += word.length;
  }
  starts[at] = 1;
  return { joined, starts };
});

/**
 * Whether `target` occurs in `text` at an offset `accept` takes, in time linear in both
 * (Knuth–Morris–Pratt). A value is model output a prompt-injected resume can steer, so a search
 * that rescans — as matching from each word does on "a a a …" — is not an option.
 */
function occurs(text: string, target: string, accept: (at: number) => boolean) {
  const fallback = new Int32Array(target.length);
  for (let i = 1, k = 0; i < target.length; i += 1) {
    while (k > 0 && target[i] !== target[k]) k = fallback[k - 1];
    if (target[i] === target[k]) k += 1;
    fallback[i] = k;
  }
  for (let i = 0, k = 0; i < text.length; i += 1) {
    while (k > 0 && text[i] !== target[k]) k = fallback[k - 1];
    if (text[i] === target[k]) k += 1;
    if (k === target.length) {
      if (accept(i - k + 1)) return true;
      k = fallback[k - 1];
    }
  }
  return false;
}

/** A value the model returned that does not occur in the source, with where it was found. */
export type GroundingViolation = { path: string; value: string };

/**
 * Every string in `candidate` that does not occur in `source`.
 *
 * `skipPaths` are left unchecked: a field name at any depth ("summary"), or a path with `[]` for
 * any index ("skills[].name").
 *
 * Walks the object generically so a field added to the repair schema is covered without anyone
 * remembering to add it here — the failure mode of a hand-listed field set is that the newest
 * field, the one least reviewed, is the one left unchecked.
 *
 * Numbers and booleans are skipped: they carry no fabricated identity, and a parsed month is
 * checked by the date logic rather than by substring.
 */
export function findGroundingViolations(
  candidate: unknown,
  source: string,
  skipPaths: readonly string[] = [],
): GroundingViolation[] {
  const normalized = normalizeForGrounding(source);
  const words = groundingWords(normalized);
  const violations: GroundingViolation[] = [];

  const walk = (node: unknown, path: string) => {
    // "skills[].name" names one field of every item; a bare "summary" names it at any depth.
    const anyIndex = path.replace(/\[\d+\]/g, "[]");
    if (
      skipPaths.some(
        (skip) =>
          path === skip ||
          anyIndex === skip ||
          path.endsWith(`.${skip}`) ||
          anyIndex.endsWith(`.${skip}`),
      )
    )
      return;

    if (typeof node === "string") {
      // A value made only of punctuation ("—", "@") asserts nothing true; it is not grounded.
      const empty = node.trim() !== "" && !/[\p{L}\p{N}]/u.test(node);
      if (empty || !isGrounded(node, normalized, words)) violations.push({ path, value: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  };

  walk(candidate, "");
  return violations;
}
