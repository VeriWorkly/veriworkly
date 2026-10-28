import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * V-033: pdf.js decodes an image of any size unless `maxImageSize` is set, and the decoded pixels
 * sit outside the child's V8 heap cap. `@veriworkly/ats-engine` 0.22.0 caps them (4096²); the RSS
 * watchdog in `extractPool.ts` stays as the backstop. A downgrade below 0.22 drops the cap.
 */
describe("V-033 the ATS engine the server resolves", () => {
  it("is 0.22.0 or later, the first release that caps decoded image pixels", () => {
    const require = createRequire(import.meta.url);
    // The package's `exports` hide package.json, so it is found next to the resolved entry.
    let dir = dirname(require.resolve("@veriworkly/ats-engine"));
    while (dir !== dirname(dir)) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        if (pkg.name === "@veriworkly/ats-engine") {
          const [major, minor] = String(pkg.version).split(".").map(Number);
          expect(major > 0 || minor >= 22, `resolved ${pkg.version}`).toBe(true);
          return;
        }
      } catch {
        // No package.json at this level; keep walking up.
      }
      dir = dirname(dir);
    }
    throw new Error("@veriworkly/ats-engine package.json not found");
  });
});
