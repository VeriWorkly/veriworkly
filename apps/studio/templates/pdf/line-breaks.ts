/**
 * Line breaking for the PDF, by the browser's rules.
 *
 * The owner's rule is that the editor preview and the downloaded PDF are the same
 * document. Both shape text with the same font files (`app/globals.css`, `fonts.ts`),
 * so a word is equally wide in both; what differed was where each engine ends a line:
 *
 * - `@react-pdf/textkit` breaks paragraphs with Knuth–Plass and gives every space a
 *   third of its width as shrink, so a line up to ~2px per space too long for its
 *   column is kept and squeezed (a 659px bullet in a 650px column stayed one line);
 *   Knuth–Plass also balances a paragraph, so even lines that fit carry other words;
 * - textkit breaks only at spaces, and the browser also after a hyphen or a dash
 *   ("hydration-|safe", "Featherstonehaugh-|Wolfeschlegelstein");
 * - an oversized token (`overflow-wrap: anywhere` in the preview) broke at textkit's
 *   syllable penalties with a "-" printed at the break; the browser breaks it at the
 *   last character that fits, with nothing added.
 *
 * So the PDF stops using textkit's breaker (see `templates/pdf/textkit.ts`) and breaks
 * every paragraph here, the way Chrome's line breaker does for the preview's
 * `white-space: normal; overflow-wrap: anywhere`: greedy, first fit, no shrinking, the
 * spaces at a line end hanging past it.
 *
 * Pure, and free of react-pdf, so it can be checked on its own
 * (`tests/contracts/pdf-line-breaks.contract.test.ts`).
 */

/** Spaces that end a line and hang past its end instead of counting toward its width. */
const HANGING_SPACE = /[ \t\n\r]/;

/**
 * Spaces after which Chrome allows a break. Everything Unicode calls a breaking
 * space; not U+00A0, U+2007 or U+202F, which exist to keep words together.
 */
function isBreakingSpace(char: string) {
  const code = char.charCodeAt(0);

  return (
    HANGING_SPACE.test(char) ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a && code !== 0x2007) ||
    code === 0x205f ||
    code === 0x3000
  );
}

/*
 * Chrome breaks ASCII by a table of its own (Blink's `kAsciiLineBreakTable`), not by
 * UAX #14. These are the pairs it breaks between, read off Chrome itself: every
 * printable ASCII pair, set at zero width.
 */

/** After any of these, a break before an opening bracket ("a,(b"). */
const BREAK_BEFORE_OPENING_AFTER = new Set('!"#%&)*+,.:;=>\\]|}~');
const OPENING = new Set("(<[{");
/** What a hyphen-minus may break before: letters and most symbols (digits: see below). */
const AFTER_HYPHEN = new Set("\"#%&'(*+-<=>@[\\^_`{|~");
/** What a question mark may break before. */
const AFTER_QUESTION = new Set("#$%&(*+-<=>@[\\^_`{|~");

/** Outside ASCII, characters Chrome breaks after: dashes, ellipsis, ZWSP, CJK commas. */
const BREAK_AFTER = new Set(["‐", "‒", "–", "…", "​", "、", "。"]);
const EM_DASH = "—";

/** CJK punctuation that never starts a line, and brackets that never end one. */
const NO_BREAK_BEFORE = new Set(")]}!?,.:;、。，．）」』】〉》！？：；");
const NO_BREAK_AFTER = new Set("([{（「『【〈《");

const LETTER = /\p{L}/u;
const DIGIT = /[0-9]/;
const ALPHANUMERIC = /[\p{L}0-9]/u;

/** Ideographs, kana and Hangul: a line may break between any two. */
function isIdeographic(char: string) {
  const code = char.charCodeAt(0);

  return (
    (code >= 0x2e80 && code <= 0x2fff) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

const isAscii = (char: string) => char.charCodeAt(0) < 0x80;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** Whether a line may start at `index` (a UTF-16 offset, `0 < index < text.length`). */
export function canBreakBefore(text: string, index: number): boolean {
  const previous = text[index - 1];
  const current = text[index];

  if (previous === undefined || current === undefined) return false;
  if (isLowSurrogate(text.charCodeAt(index))) return false;
  if (isBreakingSpace(current)) return false;
  if (isBreakingSpace(previous)) return true;

  if (previous === "-") {
    if (AFTER_HYPHEN.has(current) || LETTER.test(current)) return true;
    // "a-1" and "2019-2023" break; "-1", "(-1" and "--1" keep the sign with its number.
    if (DIGIT.test(current)) return ALPHANUMERIC.test(text[index - 2] ?? "");
    return false;
  }

  if (previous === "?") return AFTER_QUESTION.has(current) || ALPHANUMERIC.test(current);

  if (isAscii(previous) && isAscii(current)) {
    return OPENING.has(current) && BREAK_BEFORE_OPENING_AFTER.has(previous);
  }

  if (BREAK_AFTER.has(previous)) return current !== previous;
  if (current === EM_DASH) return previous !== EM_DASH;
  if (previous === EM_DASH) return true;

  if (isIdeographic(previous) || isIdeographic(current)) {
    return !NO_BREAK_BEFORE.has(current) && !NO_BREAK_AFTER.has(previous);
  }

  return false;
}

/**
 * Float noise between two sums of the same advances, in the units of the widths
 * (points in the PDF) — not slack. Chrome keeps a line only when its text fits.
 */
const EPSILON = 1e-6;

export interface LineBreakInput {
  text: string;
  /** Each UTF-16 unit's advance; a glyph's whole advance sits on its first unit. */
  advances: ArrayLike<number>;
  /** Available width per line; the last entry repeats for the lines after it. */
  widths: number[];
  /**
   * Offsets a line may be cut at when a single word does not fit
   * (`overflow-wrap: anywhere`): grapheme boundaries that are also glyph boundaries.
   * Every offset when absent.
   */
  isCuttable?: (index: number) => boolean;
}

/**
 * Where each line after the first starts: greedy first fit, like the browser.
 *
 * A line takes words while their text, without the spaces it ends on, fits. A word
 * too wide for a line of its own is cut at the last offset that fits, and never
 * before at least one character is on the line.
 */
export function findLineStarts({ text, advances, widths, isCuttable }: LineBreakInput): number[] {
  const length = text.length;
  const offsets = new Float64Array(length + 1);

  for (let index = 0; index < length; index += 1) {
    offsets[index + 1] = offsets[index] + (advances[index] || 0);
  }

  const opportunities: number[] = [];
  for (let index = 1; index < length; index += 1) {
    if (canBreakBefore(text, index)) opportunities.push(index);
  }

  /** End of the text before `end`, less the spaces a line hangs. */
  const trimmedEnd = (start: number, end: number) => {
    let index = end;
    while (index > start && HANGING_SPACE.test(text[index - 1])) index -= 1;
    return index;
  };
  const fits = (start: number, end: number, width: number) =>
    offsets[trimmedEnd(start, end)] - offsets[start] <= width + EPSILON;

  const starts: number[] = [];
  let start = 0;
  let next = 0; // first opportunity after `start`

  while (start < length) {
    const width = widths[Math.min(starts.length, widths.length - 1)] ?? Infinity;

    if (fits(start, length, width)) break;

    while (next < opportunities.length && opportunities[next] <= start) next += 1;

    let end = -1;
    let cursor = next;
    while (cursor < opportunities.length && fits(start, opportunities[cursor], width)) {
      end = opportunities[cursor];
      cursor += 1;
    }

    if (end === -1) {
      // Not even the first word fits: cut it at the last offset that does.
      const wordEnd = next < opportunities.length ? opportunities[next] : length;
      end = cutWord(start, wordEnd, width, offsets, isCuttable);
    }

    starts.push(end);
    start = end;
  }

  return starts;
}

function cutWord(
  start: number,
  wordEnd: number,
  width: number,
  offsets: Float64Array,
  isCuttable: ((index: number) => boolean) | undefined,
) {
  let end = -1;

  for (let index = start + 1; index < wordEnd; index += 1) {
    if (isCuttable && !isCuttable(index)) continue;
    if (offsets[index] - offsets[start] > width + EPSILON) break;
    end = index;
  }

  if (end !== -1) return end;

  // A single character wider than the line still takes the line.
  for (let index = start + 1; index < wordEnd; index += 1) {
    if (!isCuttable || isCuttable(index)) return index;
  }

  return wordEnd;
}
