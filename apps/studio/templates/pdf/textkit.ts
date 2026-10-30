/**
 * `@react-pdf/textkit`, with the browser's line breaker in place of Knuth–Plass.
 *
 * `@react-pdf/layout` builds its text engine from textkit's exports and offers no way
 * to pass a line breaker in, so every bundler that builds the PDF resolves
 * `@react-pdf/textkit` to this module instead (`turbopack.resolveAlias` and the webpack
 * `resolve.alias` in `next.config.ts`, `resolve.alias` in the vitest configs). Everything but
 * `linebreaker` is textkit's own. Why the breaker had to change: `templates/pdf/line-breaks.ts`.
 *
 * The original is imported by its file path, which no alias matches.
 */
import type { AttributedString, LayoutOptions, Run } from "@react-pdf/textkit";

import textkitLayoutEngine from "@react-pdf/textkit/lib/textkit.js";

import { findLineStarts } from "./line-breaks";

export * from "@react-pdf/textkit/lib/textkit.js";

type GlyphFont = { hasGlyphForCodePoint?: (codePoint: number) => boolean } | null | undefined;

/** Spaces, line breaks and format characters carry no ink; they stay for breaking and bidi. */
const INKLESS = /^[\p{White_Space}\p{Cf}]$/u;

/**
 * Whether some font in the run's stack draws `char`, or every part of its decomposition
 * (textkit decomposes complex scripts to fit a font that has only the parts). A stack whose
 * fonts cannot say is trusted.
 */
function drawable(char: string, fonts: GlyphFont[]) {
  const checkable = fonts.filter((font) => typeof font?.hasGlyphForCodePoint === "function");
  if (checkable.length === 0 || INKLESS.test(char)) return true;

  const has = (point: number) => checkable.some((font) => font!.hasGlyphForCodePoint!(point));
  if (has(char.codePointAt(0)!)) return true;

  const parts = [...char.normalize("NFD")];
  return parts.length > 1 && parts.every((part) => has(part.codePointAt(0)!));
}

/**
 * The paragraph without the characters no font in its stack has. textkit would lay them out
 * as `.notdef`: no ink, but written into the text layer, where a parser reads junk ("NN")
 * inside the user's name (S-366). The export warns first that they will be blank, and now
 * they are. Attachment runs (inline images) are kept whole.
 */
function withoutUndrawable(paragraph: AttributedString): AttributedString {
  let string = "";
  let changed = false;

  const runs = paragraph.runs.map((run) => {
    const start = string.length;
    const text = paragraph.string.slice(run.start, run.end);
    const fonts = (run.attributes?.font ?? []) as GlyphFont[];

    if (run.attributes?.attachment) {
      string += text;
    } else {
      for (const char of text) {
        if (drawable(char, fonts)) string += char;
        else changed = true;
      }
    }

    if (run.start !== start) changed = true;
    return { ...run, start, end: string.length };
  });

  return changed ? { ...paragraph, string, runs } : paragraph;
}

/** textkit's layout engine, given only the text its fonts can draw. */
export default function layoutEngine(...engineArgs: Parameters<typeof textkitLayoutEngine>) {
  const layout = textkitLayoutEngine(...engineArgs);

  return (paragraph: AttributedString, ...rest: unknown[]) =>
    (layout as (paragraph: AttributedString, ...rest: unknown[]) => ReturnType<typeof layout>)(
      withoutUndrawable(paragraph),
      ...rest,
    );
}

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/**
 * Where each code point of a run's text starts, as a UTF-16 offset into the run, with the
 * run's length last.
 *
 * textkit counts a glyph's place in its run in code points (`glyphIndices`, and
 * `stringIndices`, which has one entry per code point), while run bounds and the paragraph
 * string are UTF-16. The two part at the first astral character — an emoji, a 𝐁𝐨𝐥𝐝 math
 * letter — and read as UTF-16, every advance and cut point after one landed a unit early for
 * each astral character before it.
 */
function codePointStarts(paragraph: AttributedString, run: Run): number[] {
  const starts: number[] = [];
  let offset = 0;

  for (const char of paragraph.string.slice(run.start, run.end)) {
    starts.push(offset);
    offset += char.length;
  }

  starts.push(offset);
  return starts;
}

/** The code point a run-relative UTF-16 offset starts (or falls inside). */
function codePointAt(starts: number[], offset: number) {
  let low = 0;
  let high = starts.length - 1;

  while (low < high) {
    const middle = (low + high + 1) >> 1;

    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }

  return low;
}

/** Each UTF-16 unit's advance, and which offsets start a glyph. */
function measure(paragraph: AttributedString) {
  const length = paragraph.string.length;
  const advances = new Float64Array(length);
  const glyphStarts = new Uint8Array(length + 1);

  glyphStarts[length] = 1;

  for (const run of paragraph.runs) {
    const positions = run.positions ?? [];
    const glyphCount = run.glyphs?.length ?? positions.length;
    const starts = codePointStarts(paragraph, run);

    glyphStarts[run.start] = 1;

    for (let glyph = 0; glyph < glyphCount; glyph += 1) {
      const codePoint = run.glyphIndices?.[glyph] ?? glyph;
      if (codePoint >= starts.length - 1) continue;

      const index = run.start + starts[codePoint];
      if (index >= length) continue;

      advances[index] += positions[glyph]?.xAdvance ?? 0;
      glyphStarts[index] = 1;
    }
  }

  return { advances, glyphStarts };
}

function graphemeStarts(text: string) {
  const starts = new Uint8Array(text.length + 1);

  if (!graphemes) return starts.fill(1);

  for (const { index } of graphemes.segment(text)) starts[index] = 1;
  starts[text.length] = 1;

  return starts;
}

/** The first glyph at or after a run-relative code point. */
function glyphAt(run: Run, codePoint: number) {
  const glyphIndices = run.glyphIndices;
  const glyphCount = run.glyphs?.length ?? run.positions?.length ?? 0;

  if (!glyphIndices) return Math.min(codePoint, glyphCount);

  const found = glyphIndices.findIndex((index) => index >= codePoint);
  return found === -1 ? glyphCount : found;
}

/**
 * One run cut to `[start, end)` of the paragraph, rebased to `start`. Lines are only
 * ever cut where a glyph starts (`findLineStarts` is told so), so no glyph is split.
 * `start` and `end` are UTF-16 offsets; the glyph and string indices stay in code points.
 */
function sliceRun(paragraph: AttributedString, run: Run, start: number, end: number): Run {
  const from = Math.max(start, run.start) - run.start;
  const to = Math.min(end, run.end) - run.start;
  const starts = codePointStarts(paragraph, run);
  const fromCodePoint = codePointAt(starts, from);
  const toCodePoint = codePointAt(starts, to);
  const firstGlyph = glyphAt(run, fromCodePoint);
  const lastGlyph = glyphAt(run, toCodePoint);
  const stringIndices = (run.stringIndices ?? []).slice(fromCodePoint, toCodePoint);
  const base = stringIndices[0] ?? 0;

  return {
    ...run,
    start: run.start + from - start,
    end: run.start + to - start,
    glyphs: run.glyphs?.slice(firstGlyph, lastGlyph),
    positions: run.positions?.slice(firstGlyph, lastGlyph),
    glyphIndices: run.glyphIndices
      ?.slice(firstGlyph, lastGlyph)
      .map((index) => index - fromCodePoint),
    stringIndices: stringIndices.map((index) => index - base),
  };
}

function sliceParagraph(paragraph: AttributedString, start: number, end: number) {
  const runs = paragraph.runs
    .filter((run) => run.start < end && run.end > start)
    .map((run) => sliceRun(paragraph, run, start, end));

  return { ...paragraph, string: paragraph.string.slice(start, end), runs };
}

/**
 * Breaks a paragraph into lines by the browser's rules (`findLineStarts`). Same
 * signature as textkit's: `availableWidths` holds one width per line, the last
 * repeating, and each line keeps the spaces it ends on — the typesetter hangs them.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- textkit's signature
export const linebreaker = (_options: LayoutOptions) => {
  return (paragraph: AttributedString, availableWidths: number[]): AttributedString[] => {
    const text = paragraph.string;

    if (text.length === 0) return [paragraph];

    const { advances, glyphStarts } = measure(paragraph);
    const graphemeBoundaries = graphemeStarts(text);
    const starts = findLineStarts({
      text,
      advances,
      widths: availableWidths,
      isCuttable: (index) => glyphStarts[index] === 1 && graphemeBoundaries[index] === 1,
    });

    const bounds = [0, ...starts, text.length];
    return bounds.slice(1).map((end, line) => sliceParagraph(paragraph, bounds[line], end));
  };
};
