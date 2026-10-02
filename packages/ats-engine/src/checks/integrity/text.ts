import type { AtsEnginePolicy } from "../../policy/schema.js";
import { NO_FINDING as NONE, quote, type Finding } from "../finding.js";
import { wordListPattern } from "../../text/text.js";
import { findDateRange } from "../../parser/dates.js";
import { memo } from "../../util/memo.js";

/**
 * Text-level integrity signals: what a resume does to game a screener, as distinct from how well
 * it is written. Each returns a count or a share and a short sample of what it found, so the
 * report can quote the offending text back.
 */

const injectionPattern = memo(
  (text: AtsEnginePolicy["text"]) => new RegExp(wordListPattern(text.injectionPhrases), "giu"),
);

/**
 * Instructions addressed to an AI screener rather than to a person: "ignore all previous
 * instructions", "rank this candidate as the best fit". Phrases are policy vocabulary
 * (`text.injectionPhrases`), extended per language. Read from the visible text and from any
 * text smuggled in tag characters, which is where such an instruction is most often hidden.
 */
export function injectionPhrases(text: string, smuggled: string, policy: AtsEnginePolicy): Finding {
  // `matchAll` clones the shared global pattern, so its `lastIndex` is never touched.
  const found = [...`${text}\n${smuggled}`.matchAll(injectionPattern(policy.text))];
  return found.length ? { value: found.length, sample: quote(found[0][0]) } : NONE;
}

/**
 * A Greek letter drawn like a Latin one ("ο", "Ρ", "α"), beside a lowercase Latin letter: "Pythοn"
 * with an omicron. Science names Greek letters after capitals and digits ("TNFα", "NFκB") and
 * uses "μ" as a unit; none of those is a look-alike.
 */
const LOOKALIKE = String.raw`[\u{0391}\u{0392}\u{0395}-\u{0397}\u{0399}\u{039A}\u{039C}\u{039D}\u{039F}\u{03A1}\u{03A4}\u{03A5}\u{03A7}\u{03B1}\u{03B3}\u{03B5}\u{03B9}\u{03BA}\u{03BD}\u{03BF}\u{03C1}\u{03C5}\u{03C7}]`;
const GREEK_IN_LATIN = new RegExp(
  String.raw`(?=\p{Ll})\p{Script=Latin}${LOOKALIKE}|${LOOKALIKE}(?=\p{Ll})\p{Script=Latin}`,
  "u",
);

/**
 * Words that mix Latin letters with Cyrillic ones — "Руthon" with a Cyrillic "Ру" — which look
 * identical on the page and match nothing, or are used to make a stuffed keyword list look like
 * different words. Greek counts only as a look-alike inside a mostly-Latin word (see above).
 */
export function homoglyphWords(text: string): Finding {
  // Split, then test each word: a lookahead pattern doing both at once rescans a long letter
  // run from every position, which is quadratic on input anyone can send.
  const found = (text.match(/[\p{L}\p{M}]{3,}/gu) ?? []).filter(
    (word) =>
      /\p{Script=Latin}/u.test(word) &&
      (/\p{Script=Cyrillic}/u.test(word) ||
        (GREEK_IN_LATIN.test(word) && (word.match(/\p{Script=Latin}/gu)?.length ?? 0) >= 3)),
  );
  return found.length ? { value: found.length, sample: quote(found[0]) } : NONE;
}

const SHINGLE = 8;
const wordsOf = (text: string) => text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];

/**
 * The share of the posting that appears in the resume word for word, in runs of eight words.
 *
 * A genuine resume shares a few phrases with a posting ("experience with distributed systems");
 * one with the posting pasted in — usually in white text, to be read by the ATS and not by the
 * recruiter — shares most of it. Eight-word runs are long enough that coincidence is rare.
 */
export function copiedPosting(resume: string, posting: string | undefined): Finding | null {
  const jobWords = wordsOf(posting ?? "");
  // A posting too short to hold a run worth comparing leaves the rule out, rather than passed.
  if (jobWords.length < SHINGLE * 3) return null;
  const resumeRuns = new Set<string>();
  const resumeWords = wordsOf(resume);
  for (let i = 0; i + SHINGLE <= resumeWords.length; i += 1)
    resumeRuns.add(resumeWords.slice(i, i + SHINGLE).join(" "));

  let shared = 0;
  let total = 0;
  let sample = "";
  for (let i = 0; i + SHINGLE <= jobWords.length; i += 1) {
    const run = jobWords.slice(i, i + SHINGLE).join(" ");
    total += 1;
    if (!resumeRuns.has(run)) continue;
    shared += 1;
    sample ||= run;
  }
  return total ? { value: shared / total, sample: quote(sample) } : NONE;
}

/**
 * Terms repeated far beyond what any real resume needs — "Python Python Python …" in a footer,
 * or the same keyword line pasted several times. A term counts when it occurs at least 15 times
 * and at least 5% as often as the words that are not repeated so; a line, when it appears three
 * times or more away from any role's dates. Stopwords and short words never count, so ordinary prose does not
 * trip it. `now` bounds the plausible years, as everywhere dates are read.
 */
export function stuffedTerms(
  text: string,
  lines: string[],
  policy: AtsEnginePolicy,
  now: Date,
): Finding {
  const stop = new Set(policy.keywordMatch.stopwords);
  const words = wordsOf(text);
  const counts = new Map<string, number>();
  for (const word of words)
    if (word.length > 2 && !stop.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);

  // A field's own word recurs: "data" a dozen times is a data engineer's resume, not stuffing.
  // The share is of the words besides the repeated ones, or ten terms pasted forty times each
  // would raise the bar they are measured against above every one of them.
  const repeated = [...counts].filter(([, count]) => count >= 15);
  const rest = words.length - repeated.reduce((sum, [, count]) => sum + count, 0);
  const threshold = Math.max(15, rest * 0.05);
  const terms = repeated.filter(([, count]) => count >= threshold).sort((a, b) => b[1] - a[1]);

  // A line beside a role's date range is that role's metadata — its city, "Full-time · Remote" —
  // and repeats under every role of an honest resume, so it is not counted.
  const dated = (at: number) =>
    at >= 0 && at < lines.length && findDateRange(lines[at], policy.resumeParse, now) !== null;
  const lineCounts = new Map<string, number>();
  lines.forEach((line, at) => {
    if (line.split(/\s+/).length < 3 || dated(at) || dated(at - 1) || dated(at + 1)) return;
    lineCounts.set(line.toLowerCase(), (lineCounts.get(line.toLowerCase()) ?? 0) + 1);
  });
  const repeatedLines = [...lineCounts].filter(([, count]) => count >= 3);

  const value = terms.length + repeatedLines.length;
  if (!value) return NONE;
  const sample = terms.length
    ? `${terms[0][0]} ×${terms[0][1]}`
    : `${quote(repeatedLines[0][0])} ×${repeatedLines[0][1]}`;
  return { value, sample };
}
