import type { AtsEnginePolicy } from "../policy/schema.js";
import { despaceLines, isBareSectionHeading } from "./sections.js";

/**
 * The first word of a wrapped line's continuation: entirely lowercase. "iOS Engineer" and "eBay"
 * are lowercase-initial too, and they start lines of their own.
 */
const CONTINUATION = /^\p{Ll}+(?![\p{L}\p{N}])/u;

/**
 * Lines broken only because the page ran out of width, joined back into the line they belong to.
 *
 * Text extracted from a PDF breaks every paragraph and every long bullet where the page wrapped
 * it, and a line-based reader then counts one bullet as two — the second of which never opens
 * with an action verb, carries the number the first lacks, or reads as a header beside a date.
 * A continuation is recognised by two things a new line almost never has together: the line
 * before it runs near the full width of the text, without ending a sentence, and it opens with a
 * lowercase word. A wrap at a hyphen ("real-" / "time") is rejoined without a space. A line
 * that is a section heading by itself ("experience", "skills") is never a continuation: glued
 * onto the line above, the section it opens was lost.
 */
function joinWrapped(lines: string[], policy: AtsEnginePolicy): string[] {
  const lengths = lines.map((line) => line.length).sort((a, b) => a - b);
  const fullWidth = Math.max(40, (lengths[Math.floor(lengths.length * 0.9)] ?? 0) * 0.6);

  const joined: string[] = [];
  for (const line of lines) {
    const last = joined.length - 1;
    const previous = joined[last];
    if (
      previous !== undefined &&
      previous.length >= fullWidth &&
      !/[.!?]$/.test(previous) &&
      CONTINUATION.test(line) &&
      !isBareSectionHeading(line, policy)
    )
      joined[last] = previous.endsWith("-") ? previous + line : `${previous} ${line}`;
    else joined.push(line);
  }
  return joined;
}

/**
 * A resume's trimmed, non-empty lines, read the way a person reads them: wrapped lines rejoined
 * and letter-spaced ones read back as words. `spaced` counts the latter for the letter-spacing
 * rule. Run once per resume: the wrap threshold is measured on the lines it is given.
 */
export function readResumeLines(lines: string[], policy: AtsEnginePolicy) {
  return despaceLines(
    joinWrapped(lines.map((line) => line.trim()).filter(Boolean), policy),
    policy,
  );
}
