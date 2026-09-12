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
  return text
    .normalize("NFKD")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Punctuation a model may reasonably add or drop around a value it copied correctly. */
function stripEdgePunctuation(value: string): string {
  return value.replace(/^[\s,.;:|/\-–—()[\]]+|[\s,.;:|/\-–—()[\]]+$/g, "");
}

/**
 * Whether `value` occurs in `haystack`, where `haystack` is already normalized.
 *
 * Short values are matched whole rather than as substrings. "IT" or "Q&A" would otherwise match
 * inside unrelated words often enough to make the check meaningless, and a two-character
 * employer name is not what this feature exists to recover.
 */
export function isGrounded(value: string, normalizedSource: string): boolean {
  const candidate = normalizeForGrounding(stripEdgePunctuation(value));
  if (!candidate) return true; // An empty value asserts nothing, so there is nothing to ground.
  if (candidate.length < 3) {
    return new RegExp(`(?:^|\\W)${escapeRegExp(candidate)}(?:\\W|$)`).test(normalizedSource);
  }
  if (normalizedSource.includes(candidate)) return true;

  /**
   * Second pass with whitespace removed entirely.
   *
   * A PDF that breaks a word across lines or columns extracts as "Acme Corp\noration", which the
   * space-collapsing pass above turns into "acme corp oration" - so a value the model copied
   * *correctly* would be rejected as ungrounded. That false rejection lands hardest on exactly
   * the mangled-layout documents this feature exists to repair, and it fails silently, as a
   * dropped field rather than an error.
   *
   * Removing whitespace on both sides is a genuine loosening - "Acme Corp" would now match a
   * source containing "AcmeCorp" - but the check is still anchored to characters that are
   * present in the document, which is the property that makes fabrication detectable. A model
   * cannot reach a name that is not there by rearranging spaces.
   */
  const squashed = candidate.replace(/\s+/g, "");
  if (squashed.length < 3) return false;
  return normalizedSource.replace(/\s+/g, "").includes(squashed);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A value the model returned that does not occur in the source, with where it was found. */
export type GroundingViolation = { path: string; value: string };

/**
 * Every string in `candidate` that does not occur in `source`.
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
  const normalizedSource = normalizeForGrounding(source);
  const violations: GroundingViolation[] = [];

  const walk = (node: unknown, path: string) => {
    if (skipPaths.some((skip) => path === skip || path.endsWith(`.${skip}`))) return;

    if (typeof node === "string") {
      if (!isGrounded(node, normalizedSource)) violations.push({ path, value: node });
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
