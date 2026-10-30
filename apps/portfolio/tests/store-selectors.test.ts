import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// A store selector that builds a new array or object on every call (`state.x || []`) never
// returns the same snapshot twice, so React re-renders until "Maximum update depth exceeded".
// That crashed the editor for every draft without sub-pages. Keep the fallback outside the
// selector: `usePortfolioStore((state) => state.x) ?? []`.
const root = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", "template-library", "tests"].includes(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("store selectors return stable values", () => {
  it("no usePortfolioStore selector creates a fresh [] or {} fallback", () => {
    const offenders = sourceFiles(root).flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(
          /usePortfolioStore\(\([^)]*\)\s*=>[^;]*?(\|\||\?\?)\s*(\[\]|\{\})\s*\)/g,
        ),
      ].map((match) => `${file.slice(root.length + 1)}: ${match[0]}`),
    );

    expect(offenders).toEqual([]);
  });
});
