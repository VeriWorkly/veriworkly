import { join } from "node:path";

import { createElement } from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";
import { layoutPages, type LayoutNode } from "@/tests/utils/pdf";

import { canBreakBefore, findLineStarts } from "@/templates/pdf/line-breaks";
import { linebreaker } from "@/templates/pdf/textkit";

/** The text split wherever `canBreakBefore` allows, joined with "|". */
function opportunities(text: string) {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    if (index > 0 && canBreakBefore(text, index)) out += "|";
    out += text[index];
  }
  return out;
}

describe("the PDF breaks lines where Chrome does", () => {
  // Each case is what Chrome 14x printed for the text set at zero width (every
  // opportunity taken), read with Range rects. A change here must be re-read off Chrome.
  it.each([
    ["ab-cd", "ab-|cd"],
    ["hydration-safe rendering", "hydration-|safe |rendering"],
    ["a-1", "a-|1"],
    ["2019-2023", "2019-|2023"],
    ["-1", "-1"],
    ["(-1", "(-1"],
    ["x -1", "x |-1"],
    ["--1", "-|-1"],
    ["a -b", "a |-|b"],
    ["ab/cd/ef", "ab/cd/ef"],
    ["e.g. x", "e.g. |x"],
    ["a.b,c:d;e", "a.b,c:d;e"],
    ["a?b!c", "a?|b!c"],
    ["a(b)c[d]e", "a(b)c[d]e"],
    ["a,(b", "a,|(b"],
    ["a  )b", "a  |)b"],
    ["( foo", "( |foo"],
    ["Node.js/TypeScript", "Node.js/TypeScript"],
    ["C++/C#", "C++/C#"],
    [
      "https://enterprise-example.com/people/bart-x",
      "https://enterprise-|example.com/people/bart-|x",
    ],
    ["2019–2023", "2019–|2023"],
    ["––", "––"],
    ["a—b", "a|—|b"],
    ["a…b", "a…|b"],
    ["a b", "a b"],
    ["a b", "a b"],
    ["a b", "a |b"],
    ["a​b", "a​|b"],
    ["a‑b", "a‑b"],
    ["a‐b", "a‐|b"],
    ["“ab” cd", "“ab” |cd"],
    ["a一b", "a|一|b"],
    ["a、b", "a、|b"],
  ])("%j", (text, expected) => {
    expect(opportunities(text)).toBe(expected);
  });
});

describe("findLineStarts", () => {
  const advances = (text: string) => Array.from(text, () => 1);

  it("fills each line first, not balancing the paragraph, and never shrinks a space", () => {
    const text = "aaa bbb ccc ddd";
    // "aaa bbb" is 7 wide: at 6.99 it does not fit, however little it is over.
    expect(findLineStarts({ text, advances: advances(text), widths: [7] })).toEqual([8]);
    expect(findLineStarts({ text, advances: advances(text), widths: [6.99] })).toEqual([4, 8, 12]);
  });

  it("hangs the spaces a line ends on", () => {
    const text = "aaa    bbb";
    expect(findLineStarts({ text, advances: advances(text), widths: [3] })).toEqual([7]);
  });

  it("cuts a word too wide for a line of its own at the last character that fits", () => {
    const text = "aa bbbbbbbbbb-ccc dd";
    // Chrome: "aa |bbbbbb|bbbb-|ccc dd" at six characters a line.
    expect(findLineStarts({ text, advances: advances(text), widths: [6] })).toEqual([3, 9, 14]);
  });

  it("uses each line's own width, the last one repeating", () => {
    const text = "aa bb cc dd";
    expect(findLineStarts({ text, advances: advances(text), widths: [2, 5] })).toEqual([3, 9]);
  });
});

describe("the textkit line breaker", () => {
  it("keeps every character, in order, and the spaces each line ends on", () => {
    const text = "Built React and TypeScript workflows";
    const glyphs = Array.from(text, (char) => ({ codePoints: [char.charCodeAt(0)] }));
    const paragraph = {
      string: text,
      runs: [
        {
          start: 0,
          end: text.length,
          attributes: {},
          glyphs,
          positions: glyphs.map(() => ({ xAdvance: 1, yAdvance: 0, xOffset: 0, yOffset: 0 })),
          glyphIndices: glyphs.map((_, index) => index),
          stringIndices: glyphs.map((_, index) => index),
        },
      ],
    };

    const lines = linebreaker({})(paragraph as never, [16]);

    expect(lines.map((line) => line.string)).toEqual([
      "Built React and ",
      "TypeScript ",
      "workflows",
    ]);
    for (const line of lines) {
      const [run] = line.runs;
      expect(run.start).toBe(0);
      expect(run.end).toBe(line.string.length);
      expect(run.glyphs).toHaveLength(line.string.length);
      expect(run.glyphIndices).toEqual(Array.from(line.string, (_, index) => index));
    }
  });

  /**
   * A paragraph shaped as textkit shapes it: one glyph per code point, `glyphIndices` and
   * `stringIndices` counted in code points (textkit's `resolve`), run bounds in UTF-16.
   */
  function shaped(parts: string[], advanceOf: (char: string) => number) {
    let start = 0;
    const runs = parts.map((part) => {
      const chars = Array.from(part);
      const run = {
        start,
        end: start + part.length,
        attributes: {},
        glyphs: chars.map((char) => ({ codePoints: [char.codePointAt(0)!] })),
        positions: chars.map((char) => ({
          xAdvance: advanceOf(char),
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0,
        })),
        glyphIndices: chars.map((_, index) => index),
        stringIndices: chars.map((_, index) => index),
      };

      start = run.end;
      return run;
    });

    return { string: parts.join(""), runs };
  }

  /** Each line's text, read back from its glyphs, and its run indices. */
  function readLines(lines: ReturnType<ReturnType<typeof linebreaker>>) {
    return lines.map((line) => ({
      string: line.string,
      fromGlyphs: line.runs
        .flatMap((run) => run.glyphs ?? [])
        .map((glyph) => String.fromCodePoint(...glyph.codePoints))
        .join(""),
      glyphIndices: line.runs.map((run) => run.glyphIndices),
      stringIndices: line.runs.map((run) => run.stringIndices),
    }));
  }

  it("measures the text after an emoji by the emoji's own width, in every run after it", () => {
    // 😀 is two UTF-16 units and one glyph, 10 wide; every other glyph is 1 wide.
    const paragraph = shaped(["x😀 abc def", " ghi"], (char) => (char === "😀" ? 10 : 1));

    // "x😀 abc def" is 19 wide, one past 18, so "def" starts the second line. Read as UTF-16,
    // the "f" took no width at all and the line kept it.
    const lines = readLines(linebreaker({})(paragraph as never, [18]));

    expect(lines.map((line) => line.string)).toEqual(["x😀 abc ", "def ghi"]);
    for (const line of lines) expect(line.fromGlyphs).toBe(line.string);
    // The second line is the end of the first run and all of the second, each rebased to 0.
    expect(lines[1].glyphIndices).toEqual([
      [0, 1, 2],
      [0, 1, 2, 3],
    ]);

    // At 19 it fits, with its space hanging, and not a character more.
    expect(linebreaker({})(paragraph as never, [19]).map((line) => line.string)).toEqual([
      "x😀 abc def ",
      "ghi",
    ]);
  });

  it("cuts a word of 𝐁𝐨𝐥𝐝 math letters at the last one that fits, never inside one", () => {
    // Eight code points, sixteen UTF-16 units: read as UTF-16 the cuts fell mid-letter.
    const paragraph = shaped(["𝐁𝐨𝐥𝐝𝐁𝐨𝐥𝐝"], () => 1);
    const lines = readLines(linebreaker({})(paragraph as never, [3]));

    expect(lines.map((line) => line.string)).toEqual(["𝐁𝐨𝐥", "𝐝𝐁𝐨", "𝐥𝐝"]);
    for (const line of lines) {
      expect(line.fromGlyphs).toBe(line.string);
      expect(line.glyphIndices).toEqual([Array.from(line.string, (_, index) => index)]);
      expect(line.stringIndices).toEqual([Array.from(line.string, (_, index) => index)]);
    }
  });

  it("keeps the words after mixed emoji and math letters on the line their widths allow", () => {
    const paragraph = shaped(["🚀 𝐒𝐡𝐢𝐩𝐩𝐞𝐝 v2 to prod"], () => 1);
    // "🚀 𝐒𝐡𝐢𝐩𝐩𝐞𝐝 v2 " is 12 wide with its hanging space: "to" no longer fits at 12.
    const lines = readLines(linebreaker({})(paragraph as never, [12]));

    expect(lines.map((line) => line.string)).toEqual(["🚀 𝐒𝐡𝐢𝐩𝐩𝐞𝐝 v2 ", "to prod"]);
    for (const line of lines) expect(line.fromGlyphs).toBe(line.string);
  });
});

describe("the PDF renderer runs the replacement line breaker, not textkit's own", () => {
  const REPLACEMENT = join(`${__dirname}/../..`, "templates", "pdf", "textkit.ts");
  const URL_TEXT = "https://enterprise-example.com/people/bart-x";

  /** Each text node's lines, as the PDF draws them. */
  function textLines(node: LayoutNode): string[][] {
    const lines = (node as LayoutNode & { lines?: { string?: string }[] }).lines;

    if (lines) return [lines.map((line) => line.string ?? "")];
    return (node.children ?? []).flatMap(textLines);
  }

  async function linesAt(width: number) {
    const document = () =>
      createElement(
        Document,
        null,
        createElement(
          Page,
          { size: "A4" },
          createElement(
            View,
            { style: { width } },
            createElement(Text, { style: { fontFamily: "Geist", fontSize: 10 } }, URL_TEXT),
          ),
        ),
      );

    return (await layoutPages(document, {})).flatMap(textLines);
  }

  // textkit's Knuth–Plass breaker, given no hyphenation points, set the URL on one line far
  // wider than its box at every one of these widths. A bundler that lost the alias would
  // fall back to it without an error; these lines are what Chrome draws instead.
  it("breaks a long URL after its hyphen, as Chrome does", async () => {
    expect(await linesAt(160)).toEqual([["https://enterprise-", "example.com/people/bart-x"]]);
  });

  it("cuts a segment too wide for any line at the last character that fits", async () => {
    expect(await linesAt(100)).toEqual([["https://enterprise-", "example.com/people", "/bart-x"]]);
  });

  it("every bundler that builds the PDF resolves textkit to the replacement", () => {
    expect(
      join(
        `${__dirname}/../..`,
        nextConfig.turbopack?.resolveAlias?.["@react-pdf/textkit"] as string,
      ),
    ).toBe(REPLACEMENT);

    const webpack = nextConfig.webpack?.({ resolve: { alias: { kept: "yes" } } }, {} as never) as {
      resolve: { alias: Record<string, unknown> };
    };

    expect(webpack.resolve.alias).toEqual({ kept: "yes", "@react-pdf/textkit$": REPLACEMENT });
  });
});
