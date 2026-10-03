import { describe, expect, it } from "vitest";

import {
  detectResumeFormat,
  extractResume,
  MAX_EXTRACTED_CHARS,
  normalizeExtractedText,
} from "../src/node/extract.js";
import { measureColumns } from "../src/node/layout.js";
import { buildDocx } from "./fixtures/buildDocx.js";
import { buildPdf, LEFT_COLUMN, RIGHT_COLUMN, ruledTable, text } from "./fixtures/buildPdf.js";

/**
 * Exercises the real PDF parser on generated PDFs. These are the checks the
 * marketing copy has always claimed and the engine could never actually perform — the old
 * format rules looked for box-drawing glyphs that no extractor emits — so they are worth
 * asserting end to end rather than against a mock.
 */
describe("PDF layout detection", () => {
  const extract = (ops: string) => extractResume(buildPdf(ops), "pdf");

  it("reads a single-column resume as one linear stream", async () => {
    const ops = [...LEFT_COLUMN, ...RIGHT_COLUMN]
      .map((line: string, index: number) => text(45, 740 - index * 30, line))
      .join("\n");

    const { layout } = await extract(ops);
    expect(layout?.columnRatio).toBe(0);
    expect(layout?.tableCount).toBe(0);
  }, 60_000);

  it("flags a two-column layout whose columns share baselines", async () => {
    // Both columns written on the same baselines, which is what makes the extracted text
    // interleave: each line ends up carrying a fragment of the left column and a fragment of
    // the right, so job titles, dates, and employers run together.
    const ops = LEFT_COLUMN.flatMap((line: string, index: number) => [
      text(45, 720 - index * 26, line),
      text(340, 720 - index * 26, RIGHT_COLUMN[index]),
    ]).join("\n");

    const { text: extracted, layout } = await extract(ops);

    // Two balanced columns put half the page's text on the far side of the gutter.
    expect(layout?.columnRatio).toBeGreaterThanOrEqual(0.4);
    // The scramble the ratio stands for, visible in the text itself.
    expect(extracted.split("\n")[0]).toContain("Certifications");
  }, 60_000);

  /**
   * The case the previous text-based detector could not see at all.
   *
   * Visually this is the same two-column page, but the content stream emits the whole left
   * column before the right, so the extracted characters come out in a perfectly linear order
   * and nothing in the text betrays the layout. It is still a two-column resume, and an ATS
   * that maps fields by position still reads it wrong. Measuring the page's geometry rather
   * than its character stream is what makes it visible.
   */
  it("flags a two-column layout even when the text still extracts in reading order", async () => {
    const ops = [
      ...LEFT_COLUMN.map((line: string, index: number) => text(45, 720 - index * 26, line)),
      ...RIGHT_COLUMN.map((line: string, index: number) => text(340, 720 - index * 26, line)),
    ].join("\n");

    const { text: extracted, layout } = await extract(ops);

    expect(layout?.columnRatio).toBeGreaterThanOrEqual(0.4);
    // Proof the text alone gives nothing away: the first line reads as ordinary prose.
    expect(extracted.split("\n")[0]).not.toContain("Certifications");
  }, 60_000);

  it("does not mistake right-aligned dates for a second column", async () => {
    // The commonest single-column resume shape: content on the left, a date pinned right. There
    // is a real vertical channel between them, but almost no text lives on the far side of it,
    // so the balance term keeps this well inside the passing band.
    const ops = LEFT_COLUMN.flatMap((line: string, index: number) => [
      text(45, 720 - index * 26, line),
      text(470, 720 - index * 26, "2021"),
    ]).join("\n");

    const ratio = (await extract(ops)).layout?.columnRatio;
    expect(ratio).not.toBeNull();
    expect(ratio).toBeLessThan(0.34);
  }, 60_000);

  it("counts ruled table grids from the page's drawing operators", async () => {
    const { layout } = await extract(ruledTable(4, 3));
    expect(layout?.tableCount).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it("reports the table count even when the document is too short to measure columns", async () => {
    const { layout } = await extract(ruledTable(2, 2));

    // Null rather than zero: not measurable is not the same as measured and clean, and the
    // column rule is dropped from the report rather than passing by default.
    expect(layout?.columnRatio).toBeNull();
    expect(layout?.tableCount).toBeGreaterThanOrEqual(1);
  }, 60_000);
});

describe("resume extraction", () => {
  it("reads a DOCX's paragraphs as lines", async () => {
    const docx = buildDocx(["Jane Doe", "Senior Engineer, Acme & Co", "2019 - 2023"]);
    const { text: extracted, layout } = await extractResume(docx, "docx");

    expect(extracted.split(/\n+/)).toEqual([
      "Jane Doe",
      "Senior Engineer, Acme & Co",
      "2019 - 2023",
    ]);
    // No page geometry, so columns stay unmeasured; what the XML says is measured.
    expect(layout).toEqual({
      columnRatio: null,
      tableCount: 0,
      pageCount: 0,
      imageCount: 0,
      hiddenTextChars: 0,
      hiddenTextSample: "",
    });
  });

  it("decodes plain text as UTF-8 and reports no layout", async () => {
    const result = await extractResume(
      Buffer.from("Zoë Müller\nIngenieurin  \t bei\u0000 Acme"),
      "text",
    );
    // A run of blanks with a tab in it stays one tab: the parser's column-gap signal.
    expect(result).toEqual({ text: "Zoë Müller\nIngenieurin\tbei Acme" });
  });

  it("leaves the caller's buffer intact, so the same bytes can be read again", async () => {
    // pdf.js detaches the memory it is handed. A pass that shared the caller's bytes broke the
    // second pass (geometry came back null) and anything the caller did with the buffer after.
    const pdf = buildPdf(ruledTable(4, 3));
    const first = await extractResume(pdf, "pdf");
    const second = await extractResume(pdf, "pdf");
    expect(second).toEqual(first);
    expect(first.layout?.pageCount).toBe(1);
  }, 60_000);

  it("rejects a file that is not the format it claims", async () => {
    await expect(extractResume(Buffer.from("not a zip"), "docx")).rejects.toThrow();
  });
});

describe("normalizeExtractedText", () => {
  it("collapses blank runs and caps the length", () => {
    expect(normalizeExtractedText("  a\n\n\n\nb  ")).toBe("a\n\nb");
    expect(normalizeExtractedText("x".repeat(MAX_EXTRACTED_CHARS + 10))).toHaveLength(
      MAX_EXTRACTED_CHARS,
    );
  });
});

describe("detectResumeFormat", () => {
  it.each([
    ["cv.PDF", "", "pdf"],
    ["upload", "application/pdf", "pdf"],
    ["cv.docx", "", "docx"],
    ["notes.md", "", "text"],
    ["resume.json", "", "text"],
    ["x", "text/plain", "text"],
    ["cv.doc", "application/msword", null],
    ["cv.pages", "", null],
  ])("%s (%s) is %s", (name, mime, format) => {
    expect(detectResumeFormat(name, mime)).toBe(format);
  });
});

describe("measureColumns", () => {
  const run = (left: number, right: number, mass = 10) => ({ left, right, mass });

  it("reports nothing for a page too sparse to judge", () => {
    expect(measureColumns([run(0, 100)], 600)).toBeNull();
  });

  it("finds a balanced gutter", () => {
    const runs = Array.from({ length: 12 }, (_, index) =>
      index % 2 ? run(320, 560) : run(40, 280),
    );
    expect(measureColumns(runs, 600)).toBeCloseTo(0.5);
  });

  it("finds no gutter when lines span the page", () => {
    const runs = Array.from({ length: 12 }, () => run(40, 560));
    expect(measureColumns(runs, 600)).toBe(0);
  });
});
