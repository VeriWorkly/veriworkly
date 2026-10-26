import { afterAll, describe, expect, it, vi } from "vitest";

import { extractInChildProcess, stopExtractPool } from "#services/ats/extractPool";

import { buildPdf, LEFT_COLUMN, RIGHT_COLUMN, text } from "./fixtures/buildPdf.js";

/**
 * The real pool forking the real child — the package's compiled `node/child.js` — with no
 * TypeScript loader anywhere. The forked file used to be a `.ts` sibling, which failed to start
 * on Node 22 and under `tsx watch` alike, so every one of these failed outside a production
 * build.
 */
describe("extractPool", () => {
  afterAll(() => stopExtractPool());

  it("extracts text from plain text buffer using real child process", async () => {
    const content = "John Doe\nSoftware Engineer with 5 years experience in TypeScript and Node.js";
    const result = await extractInChildProcess("text", Buffer.from(content));
    expect(result.text).toBe(content);
    // Plain text carries no geometry, so the child reports none.
    expect(result.layout).toBeUndefined();
  });

  it("extracts a PDF's text and layout in the child", async () => {
    const ops = LEFT_COLUMN.flatMap((line: string, index: number) => [
      text(45, 720 - index * 26, line),
      text(340, 720 - index * 26, RIGHT_COLUMN[index]!),
    ]).join("\n");

    const result = await extractInChildProcess("pdf", buildPdf(ops));

    expect(result.text.length).toBeGreaterThan(100);
    expect(result.layout?.columnRatio).toBeGreaterThanOrEqual(0.4);
    expect(result.layout?.pageCount).toBe(1);
  }, 60_000);

  // One file that hangs the child used to fail every upload queued behind it, with "took too long"
  // and their upload charged. Only that file fails now; a fresh child takes the rest.
  it("fails only the job that timed out, and serves the one queued behind it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const slow = extractInChildProcess("text", Buffer.from("the file that hangs"));
      const next = extractInChildProcess("text", Buffer.from("the file behind it"));
      vi.advanceTimersByTime(20_001);
      await expect(slow).rejects.toMatchObject({ statusCode: 408 });
      vi.useRealTimers();
      expect((await next).text).toBe("the file behind it");
    } finally {
      vi.useRealTimers();
    }
  }, 60_000);

  it("reports a corrupt file as unreadable and keeps serving", async () => {
    await expect(
      extractInChildProcess("pdf", Buffer.from("%PDF-1.4 garbage")),
    ).rejects.toMatchObject({ statusCode: 400 });

    const after = await extractInChildProcess("text", Buffer.from("still alive"));
    expect(after.text).toBe("still alive");
  }, 60_000);

  /**
   * V-033: `--max-old-space-size` caps the V8 heap only; the pixels pdf.js decodes live outside
   * it. The child watches its own resident memory and exits past the cap, and the job it was on
   * fails as a file too complex to read. A 1 MB cap is crossed by any Node process at startup,
   * so the real watchdog fires on a real child here without a 500 MB fixture.
   */
  it("kills a child past the memory cap and fails that job with 422, then keeps serving", async () => {
    process.env.ATS_EXTRACT_MAX_RSS_MB = "1";
    stopExtractPool();
    try {
      await expect(
        extractInChildProcess("text", Buffer.from("a file the child never finishes")),
      ).rejects.toMatchObject({ statusCode: 422, message: "This file is too complex to read." });
    } finally {
      delete process.env.ATS_EXTRACT_MAX_RSS_MB;
      stopExtractPool();
    }

    const after = await extractInChildProcess("text", Buffer.from("still alive"));
    expect(after.text).toBe("still alive");
  }, 60_000);
});
