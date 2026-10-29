import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(join(__dirname, "..", "..", file), "utf8").replace(/\r\n/g, "\n");

/** The body of a component-level function (`const name = async` or `async function name`). */
function functionBody(source: string, name: string) {
  const start = source.search(new RegExp(`(const ${name} = async|async function ${name}\\()`));
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  return source.slice(start, source.slice(start).search(/\n {2}\};?\n/) + start);
}

describe("paid requests are replayed, not charged twice", () => {
  it("S-383 LinkedIn import sends a request id that a retry of the same text reuses", () => {
    const body = functionBody(
      read("components/dashboard/modals/ImportProfileModal.tsx"),
      "runLinkedinImport",
    );

    expect(body).toMatch(/requestId: requestIdFor\(\s*pendingLinkedinImportRef,/);
    expect(body).toContain("settleRequestId(pendingLinkedinImportRef, error)");
  });

  it("S-382 a prepared conversion keeps its request id, so preparing the same text again is free", () => {
    const body = functionBody(read("features/ats/AtsWorkspace.tsx"), "convertResume");

    expect(body).toContain("requestId: requestIdFor(pendingConversionRef, resume)");
    // Only a failed request spends the id; a success is kept for the server's replay.
    expect(body).not.toMatch(/settleRequestId\(pendingConversionRef\);/);
    expect(body).toContain("settleRequestId(pendingConversionRef, cause)");
  });
});
