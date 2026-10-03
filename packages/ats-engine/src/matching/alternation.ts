import type { AtsEnginePolicy } from "../policy/schema.js";
import { memo } from "../util/memo.js";
import { wordListPattern } from "../text/text.js";
import { canonicalize, type Vocabulary } from "./vocabulary.js";

const isTermChar = (char: string) => /[\p{L}\p{M}\p{N}+#./-]/u.test(char);

/**
 * Caps how many alternatives one "or" can bind together. A real posting offers a handful;
 * anything longer is prose that happens to contain a comma list, and grouping all of it would
 * make a single match satisfy a dozen unrelated requirements.
 */
const MAX_ALTERNATION_MEMBERS = 8;

/** The comma-separated run immediately preceding an "or": "React, Vue, " -> [react, vue]. */
function trailingList(text: string) {
  const tokens: string[] = [];
  let index = text.length;

  // Step over an Oxford comma. "React, Vue, or Angular" leaves a trailing comma right before
  // the "or"; without this the backward scan hits it immediately and returns nothing, silently
  // reducing the commonest three-way alternative to three separate requirements.
  while (index > 0 && /\s/.test(text[index - 1])) index -= 1;
  if (index > 0 && text[index - 1] === ",") index -= 1;

  while (tokens.length < MAX_ALTERNATION_MEMBERS) {
    while (index > 0 && /\s/.test(text[index - 1])) index -= 1;
    const end = index;
    while (index > 0 && isTermChar(text[index - 1])) index -= 1;
    if (index === end) break;

    tokens.unshift(text.slice(index, end));

    let comma = index;
    while (comma > 0 && /\s/.test(text[comma - 1])) comma -= 1;
    if (comma === 0 || text[comma - 1] !== ",") break;
    index = comma - 1;
  }

  return tokens;
}

/** The single term immediately following an "or": " Angular and more" -> [angular]. */
function leadingList(text: string) {
  let index = 0;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  const start = index;
  while (index < text.length && isTermChar(text[index])) index += 1;
  return start === index ? [] : [text.slice(start, index)];
}

/**
 * Groups terms a posting offers as alternatives — "Go or Java", "React, Vue, or Angular" —
 * so the group is satisfied by any one member and counts once toward the total.
 *
 * Without this, every posting that names a substitute penalises the candidate for not holding
 * both sides of a choice it explicitly said was a choice. Scanned per line, because alternation
 * is a within-sentence relationship; a term appearing on its own elsewhere joins the same group
 * through the union-find, which is what makes chained lists collapse correctly.
 *
 * The policy's `alternationWords` ("or", "oder") are the only separators honoured. A slash would
 * be ambiguous against tokens that legally contain one — ci/cd, tcp/ip, a/b — and splitting
 * those would do more harm than the extra coverage is worth.
 *
 * Returns the union-find root of a term, and the separator word that grouped it, so the
 * missing-keyword label can read "Go oder Java" for a German posting.
 */
export function alternationGroups(
  lines: string[],
  km: AtsEnginePolicy["keywordMatch"],
  vocab: Vocabulary,
) {
  const separatorOf = new Map<string, string>();
  const parent = new Map<string, string>();
  const find = (token: string): string => {
    const seen = parent.get(token);
    if (seen === undefined || seen === token) return token;
    const root = find(seen);
    parent.set(token, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const [rootA, rootB] = [find(a), find(b)];
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  /**
   * A term joins at most one alternation group — the first that names it.
   *
   * Without this the union-find chains transitively across the whole posting, and any word that
   * turns up beside two different "or"s silently welds their requirements together. Measured:
   * a posting asking for "Java or equivalent" and "Python or equivalent" scored a Java-only
   * resume at 100 and dropped Python from the missing list entirely, because "equivalent"
   * bridged them. Treating "Java or Kotlin" and "Kotlin or Swift" as two separate choices rather
   * than one three-way choice is also simply the more faithful reading.
   */
  const grouped = new Set<string>();

  for (const line of lines) {
    // Split first, then scan outwards from each "or" by hand. The obvious regex for this —
    // a comma-list followed by "or" — nests a quantifier inside a repetition, and on a line
    // holding a long comma-separated list with no "or" in it the engine backtracks through
    // every possible split at every start position. Measured at 546 ms for one such job
    // description against 10 ms for a normal one, on an endpoint that is free, unauthenticated,
    // and single-threaded. The hand-rolled scan below is linear and needs no such care.
    // The capture keeps the separators: [text, "or", text, "oder", text].
    const parts = line.split(splitterOf(km));
    if (parts.length < 3) continue;

    for (let i = 2; i < parts.length; i += 2) {
      const members = [...trailingList(parts[i - 2]), ...leadingList(parts[i])]
        .map((word) => canonicalize(word, km, vocab))
        .filter((token): token is string => token !== null && !grouped.has(token));

      for (const member of members) {
        grouped.add(member);
        separatorOf.set(member, parts[i - 1].toLowerCase());
      }
      for (let member = 1; member < members.length; member += 1) union(members[0], members[member]);
    }
  }

  return { find, separatorOf: (token: string) => separatorOf.get(token) };
}

const splitterOf = memo(
  (km: AtsEnginePolicy["keywordMatch"]) =>
    new RegExp(`(${wordListPattern(km.alternationWords)})`, "iu"),
);
