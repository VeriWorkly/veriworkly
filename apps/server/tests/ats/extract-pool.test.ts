import { afterAll, describe, expect, it } from "vitest";

import { extractInChildProcess, stopExtractPool } from "#services/ats/extractPool";

import {
  buildPdf,
  LEFT_COLUMN,
  RIGHT_COLUMN,
  text,
} from "../../../../packages/ats-engine/tests/fixtures/buildPdf";

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

  it("reports a corrupt file as unreadable and keeps serving", async () => {
    await expect(
      extractInChildProcess("pdf", Buffer.from("%PDF-1.4 garbage")),
    ).rejects.toMatchObject({ statusCode: 400 });

    const after = await extractInChildProcess("text", Buffer.from("still alive"));
    expect(after.text).toBe("still alive");
  }, 60_000);
});
