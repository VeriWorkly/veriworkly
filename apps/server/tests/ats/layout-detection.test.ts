import { describe, expect, it, afterAll } from "vitest";

import { extractInChildProcess, stopExtractPool } from "#services/ats/extractPool";

import { buildPdf, text, ruledTable, LEFT_COLUMN, RIGHT_COLUMN } from "./fixtures/buildPdf";

/**
 * Exercises the real PDF parser in the real extraction process. These are the checks the
 * marketing copy has always claimed and the engine could never actually perform — the old
 * format rules looked for box-drawing glyphs that no extractor emits — so they are worth
 * asserting end to end rather than against a mock.
 */
describe("PDF layout detection", () => {
  afterAll(() => stopExtractPool());

  const extract = (ops: string) => extractInChildProcess("pdf", buildPdf(ops));

  it("reads a single-column resume as one linear stream", async () => {
    const ops = [...LEFT_COLUMN, ...RIGHT_COLUMN]
      .map((line, index) => text(45, 740 - index * 30, line))
      .join("\n");

    const { layout } = await extract(ops);
    expect(layout?.columnRatio).toBe(0);
    expect(layout?.tableCount).toBe(0);
  }, 60_000);

  it("flags a two-column layout whose columns share baselines", async () => {
    // Both columns written on the same baselines, which is what makes the extracted text
    // interleave: each line ends up carrying a fragment of the left column and a fragment of
    // the right, so job titles, dates, and employers run together.
    const ops = LEFT_COLUMN.flatMap((line, index) => [
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
      ...LEFT_COLUMN.map((line, index) => text(45, 720 - index * 26, line)),
      ...RIGHT_COLUMN.map((line, index) => text(340, 720 - index * 26, line)),
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
    const ops = LEFT_COLUMN.flatMap((line, index) => [
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
