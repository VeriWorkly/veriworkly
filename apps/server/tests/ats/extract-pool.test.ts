import { describe, expect, it } from "vitest";
import { extractInChildProcess, stopExtractPool } from "#services/ats/extractPool";

describe("extractPool", () => {
  it("extracts text from plain text buffer using real child process", async () => {
    const content = "John Doe\nSoftware Engineer with 5 years experience in TypeScript and Node.js";
    const result = await extractInChildProcess("text", Buffer.from(content));
    expect(result.text).toBe(content);
    // Plain text carries no geometry, so the child reports none.
    expect(result.layout).toBeUndefined();
    stopExtractPool();
  });
});
