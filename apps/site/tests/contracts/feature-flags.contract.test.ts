import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { parseBoolean } from "@/lib/feature-flags";

const appDir = join(__dirname, "..", "..", "app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === "page.tsx" ? [full] : [];
  });
}

describe("program flags", () => {
  it("are re-read at runtime on every page that reads them, not baked at build", () => {
    const baked = pages(appDir).filter((file) => {
      const source = readFileSync(file, "utf8");
      const readsFlags = source.includes("@/lib/feature-flags");
      const dynamic =
        /await connection\(\)|dynamic = "force-dynamic"|export const revalidate = \d+;/.test(
          source,
        );

      return readsFlags && !dynamic;
    });

    expect(baked.map((file) => relative(appDir, file))).toEqual([]);

    // A flag flipped on the API must reach these pages within five minutes.
    for (const file of pages(appDir)) {
      const source = readFileSync(file, "utf8");
      const seconds = /export const revalidate = (d+);/.exec(source)?.[1];
      if (source.includes("@/lib/feature-flags") && seconds)
        expect(Number(seconds), relative(appDir, file)).toBeLessThanOrEqual(300);
    }
  });

  it("treat an empty variable as unset (W-053)", () => {
    expect(parseBoolean("", true)).toBe(true);
    expect(parseBoolean("  ", false)).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
    expect(parseBoolean("true", false)).toBe(true);
    expect(parseBoolean("0", true)).toBe(false);
  });
});
