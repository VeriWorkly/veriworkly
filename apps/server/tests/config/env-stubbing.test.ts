import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Both vitest configs set `unstubEnvs: true`, which undoes every `vi.stubEnv` before the next
 * test. That only protects variables set through `vi.stubEnv`: a plain `process.env.X = ...` or
 * `delete process.env.X` outlives its test and changes what the next test in the worker sees.
 * The integration suite's own `applyServerEnv` (tests/integration/env.ts) writes through a
 * `target` parameter and is the one intended exception.
 */
const TESTS_ROOT = path.resolve(__dirname, "..");

const DIRECT_WRITE = [
  // `=`, `??=`, `||=` and `&&=` on one variable.
  /process\.env(\.[A-Za-z_]\w*|\[[^\]]+\])\s*(?:\?\?|\|\||&&)?=(?!=)/,
  /delete\s+process\.env/,
  /process\.env\s*=(?!=)/,
  /Object\.(?:assign|defineProperty|defineProperties)\(\s*process\.env/,
  /Reflect\.(?:set|deleteProperty|defineProperty)\(\s*process\.env/,
];

function testSources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return testSources(full);
    return entry.name.endsWith(".ts") && full !== __filename ? [full] : [];
  });
}

describe("tests change the environment only through vi.stubEnv", () => {
  it("has no direct process.env writes in any test file", () => {
    const offenders = testSources(TESTS_ROOT).flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .flatMap((line, index) =>
          DIRECT_WRITE.some((pattern) => pattern.test(line))
            ? [`${path.relative(TESTS_ROOT, file)}:${index + 1}: ${line.trim()}`]
            : [],
        ),
    );

    expect(offenders).toEqual([]);
  });
});
