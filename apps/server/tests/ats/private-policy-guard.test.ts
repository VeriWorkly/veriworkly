import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * V-210 / owner decision 12: the production ATS keyword weights once reached this public
 * repository through a test fixture. This guard reads the private policy (never committed) and
 * fails if any test or fixture file carries one of its tuning numbers under the same key.
 *
 * It reports the file, line and key only, never the value: an equal value printed here would be
 * the private one. With no private policy on this machine (CI, a fresh worktree) it warns loudly,
 * and reports itself skipped instead of passing silently. `VERIWORKLY_PRIVATE_DIR` points it at another checkout's `.private`.
 *
 * What counts as a tuning number: every numeric field of `keywordMatch` that is a single value
 * (the per-section keyword weights), compared under its key whatever the value; and the numbers
 * inside lists (rule weights, band thresholds, stemming and seniority settings) when they are not
 * whole numbers, compared under their key. Whole numbers inside lists (a rule weight of 10) are too
 * common to tell apart from an invented one, and number words and month numbers are facts.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const PRIVATE_DIR = process.env.VERIWORKLY_PRIVATE_DIR || path.join(REPO_ROOT, ".private");
const POLICY_PATH = path.join(PRIVATE_DIR, "ats-engine-policy.json");

const FACT_PATHS = [
  /^keywordMatch\.numberWords\./,
  /^resumeParse\.months\./,
  /^resumeParse\.seasons\./,
];
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".private",
  ".turbo",
  "audit",
]);
const SCANNED = /\.(?:[cm]?[jt]sx?|json)$/;

type Tuning = { key: string; values: Set<number>; anyValue: boolean };

/** Key name → the private values that must never appear under it. */
function tuningNumbers(policy: unknown): Map<string, Tuning> {
  const byKey = new Map<string, Tuning>();

  const walk = (node: unknown, at: string, inList: boolean) => {
    if (Array.isArray(node)) return node.forEach((item) => walk(item, `${at}[]`, true));
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node))
        walk(value, at ? `${at}.${key}` : key, inList);
      return;
    }
    if (typeof node !== "number" || FACT_PATHS.some((pattern) => pattern.test(at))) return;

    const key = at.slice(at.lastIndexOf(".") + 1).replace(/\[\]$/, "");
    const scalarWeight = !inList && at.startsWith("keywordMatch.");
    if (!scalarWeight && Number.isInteger(node)) return;

    const entry = byKey.get(key) ?? { key, values: new Set<number>(), anyValue: false };
    entry.values.add(node);
    entry.anyValue ||= scalarWeight;
    byKey.set(key, entry);
  };

  walk(policy, "", false);
  return byKey;
}

/** Test and fixture files: anything under a tests/ or fixtures/ folder, or named *.test / *.spec. */
function fixtureFiles(dir: string, inTests = false, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const testsDir = inTests || /^(?:tests?|__tests__|fixtures|__fixtures__)$/.test(name);
      fixtureFiles(full, testsDir, found);
    } else if (SCANNED.test(name) && (inTests || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name))) {
      found.push(full);
    }
  }
  return found;
}

/**
 * `key: n`, `key = n`, `"key": n`, and `key: [n, n, …]` / `key = [n, …]`. Matched over the whole
 * file, so an array written across several lines is read too.
 */
const KEYED = /["']?([A-Za-z_$][\w$]*)["']?\s*[:=]\s*(\[[^\]]*\]|-?\d+(?:\.\d+)?(?![\w.]))/g;
const ARRAY_NUMBER = /(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g;

/** Every number the text assigns to a key, array entries included, with its 1-based line. */
function numbersByKey(text: string): Array<[string, number, number]> {
  const lineAt = (offset: number) => text.slice(0, offset).split("\n").length;
  const found: Array<[string, number, number]> = [];
  for (const match of text.matchAll(KEYED)) {
    const valueStart = (match.index ?? 0) + match[0].length - match[2].length;
    if (!match[2].startsWith("[")) {
      found.push([match[1], Number(match[2]), lineAt(valueStart)]);
      continue;
    }
    for (const value of match[2].matchAll(ARRAY_NUMBER))
      found.push([match[1], Number(value[0]), lineAt(valueStart + (value.index ?? 0))]);
  }
  return found;
}

describe("V-210 guard pattern", () => {
  it("reads key: n, key = n, quoted keys and array entries", () => {
    expect(numbersByKey(`  requiredWeight: 2.5, "preferredWeight": 0.4`)).toEqual([
      ["requiredWeight", 2.5, 1],
      ["preferredWeight", 0.4, 1],
    ]);
    expect(numbersByKey("const generalTermWeight = 0.3;")).toEqual([["generalTermWeight", 0.3, 1]]);
    expect(numbersByKey("  weights: [1.25, 0.5, 3],")).toEqual([
      ["weights", 1.25, 1],
      ["weights", 0.5, 1],
      ["weights", 3, 1],
    ]);
    expect(numbersByKey("if (a === 2) b = c;")).toEqual([]);
  });

  it("reads a multi-line array and reports the line each number is on", () => {
    const text = ["const policy = {", "  weights: [", "    1.25,", "    0.5,", "  ],", "};"].join(
      "\n",
    );
    expect(numbersByKey(text)).toEqual([
      ["weights", 1.25, 3],
      ["weights", 0.5, 4],
    ]);
  });
});

describe("V-210 no private ATS tuning number in a test or fixture", () => {
  it("compares every test and fixture file with the private policy", (context) => {
    if (!existsSync(POLICY_PATH)) {
      console.warn(
        [
          "",
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
          `!! V-210 guard NOT RUN: no private ATS policy at ${POLICY_PATH}.`,
          "!! Test fixtures were not compared with the production weights. Run this suite on",
          "!! a checkout that has .private/ (or set VERIWORKLY_PRIVATE_DIR) before a release.",
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
          "",
        ].join("\n"),
      );
      // Shown as skipped in every reporter's summary as well, so it is never a quiet pass.
      context.skip("V-210 guard not run: no private ATS policy on this machine");
      return;
    }

    const tuning = tuningNumbers(JSON.parse(readFileSync(POLICY_PATH, "utf8")));
    expect(tuning.size).toBeGreaterThan(0);

    const leaks: string[] = [];

    for (const file of fixtureFiles(REPO_ROOT)) {
      for (const [key, value, line] of numbersByKey(readFileSync(file, "utf8"))) {
        const entry = tuning.get(key);
        if (!entry || !entry.values.has(value)) continue;
        if (!entry.anyValue && Number.isInteger(value)) continue;
        // Location and key only: the value equals the private one.
        leaks.push(`${path.relative(REPO_ROOT, file)}:${line} ${key}`);
      }
    }

    expect(leaks, "test fixtures carrying a private ATS tuning number (change them)").toEqual([]);
  });
});
