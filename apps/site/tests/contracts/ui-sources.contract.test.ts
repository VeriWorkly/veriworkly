import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * globals.css lists the @veriworkly/ui component files Tailwind scans, instead of the whole
 * package. A component the site starts importing without a matching @source line renders
 * with its utility classes missing, and nothing else would fail.
 */

const siteRoot = join(__dirname, "..", "..");
const uiComponents = resolve(siteRoot, "..", "..", "packages", "ui", "src", "components");

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full, ext);
    return ext.test(name) ? [full] : [];
  });
}

const css = readFileSync(join(siteRoot, "app", "globals.css"), "utf8");
const sourced = new Set(
  [...css.matchAll(/@source "([^"]+)";/g)].map((m) => resolve(siteRoot, "app", m[1]!)),
);

const usedNames = new Set(
  ["app", "features", "components", "providers"]
    .flatMap((dir) => files(join(siteRoot, dir), /\.tsx?$/))
    .flatMap((file) =>
      [
        ...readFileSync(file, "utf8").matchAll(/import \{([^}]*)\} from "@veriworkly\/ui"/g),
      ].flatMap((m) => m[1]!.split(",").map((s) => s.replace(/^\s*type\s+/, "").trim())),
    )
    .filter((name) => /^[A-Z]/.test(name)),
);

describe("Tailwind scans every @veriworkly/ui component the site renders", () => {
  it("each imported component's file has an @source line in globals.css", () => {
    const definedIn = new Map<string, string>();

    for (const file of files(uiComponents, /\.tsx$/)) {
      for (const m of readFileSync(file, "utf8").matchAll(/export (?:const|function) ([A-Z]\w*)/g))
        definedIn.set(m[1]!, file);
    }

    const missing = [...usedNames]
      .filter((name) => definedIn.has(name) && !sourced.has(definedIn.get(name)!))
      .map((name) => `${name} (${relative(uiComponents, definedIn.get(name)!)})`);

    expect(usedNames.size).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });
});
