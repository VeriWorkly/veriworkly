import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Framer is loaded per page through <MotionIsland> (LazyMotion + MotionConfig), not from the
 * root layout. Two ways that breaks silently: a component imports the full `motion` (which
 * re-bundles every feature), or a page renders `m.*` components without an island (they then
 * never animate, and anything starting at opacity 0 stays invisible).
 */

const root = join(__dirname, "..", "..");

function files(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full, ext);
    return name.endsWith(ext) ? [full] : [];
  });
}

const sources = ["features", "components", "providers", "app"].flatMap((dir) =>
  files(join(root, dir), ".tsx"),
);

const MOTION_FEATURES = [
  "@/features/landing",
  "@/features/affiliate",
  "@/features/ambassador",
  "@/features/ats-checker",
  "@/features/ats-engine",
  "@/features/marketing/cta",
];

describe("framer stays inside motion islands", () => {
  it("no component imports the full motion component", () => {
    const offenders = sources.filter((file) =>
      /import \{[^}]*\bmotion\b[^}]*\} from "framer-motion"/.test(readFileSync(file, "utf8")),
    );

    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });

  it("every page that renders animated features wraps them in <MotionIsland>", () => {
    const pages = files(join(root, "app"), "page.tsx");
    const missing = pages.filter((file) => {
      const source = readFileSync(file, "utf8");
      // Data modules (`/data/`) carry no components.
      const animated = MOTION_FEATURES.some((path) =>
        new RegExp(`from "${path}(?![^"]*/data/)`).test(source),
      );

      return animated && !/<(Layout)?MotionIsland/.test(source);
    });

    expect(missing.map((file) => relative(root, file))).toEqual([]);
  });
});
