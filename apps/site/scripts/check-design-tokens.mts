/**
 * Proves the three descriptions of the colour system agree:
 *
 *   1. packages/ui/src/styles/themes.css   - what the product renders
 *   2. apps/site/config/brand.ts           - what /style-guide and /brand-kit publish
 *   3. DESIGN.md                           - what the team is told
 *
 * DESIGN.md tells contributors to change these together. This makes that checkable
 * instead of aspirational. Also flags tokens that exist but were never mapped into a
 * Tailwind `@theme` block, which silently produce dead utility classes.
 *
 * Run:  npm run check:design   (from apps/site)
 * Exits non-zero on any drift, so it is safe to put in CI.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");

const THEMES = join(REPO, "packages", "ui", "src", "styles", "themes.css");
const BRAND = join(HERE, "..", "config", "brand.ts");
const DESIGN = join(REPO, "DESIGN.md");
const THEME_APPS = ["site", "studio", "blog-platform", "docs-platform"];

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** Reads the plain (non `--color-*`) custom properties out of one CSS rule block. */

const readBlock = (css: string, selector: string): Record<string, string> => {
  const start = css.indexOf(`${selector} {`);

  if (start < 0) throw new Error(`Could not find "${selector} {" in themes.css`);

  const end = css.indexOf("}", start);
  const body = css.slice(start, end);

  const out: Record<string, string> = {};

  for (const line of body.split("\n")) {
    const match = /^\s*(--[a-z-]+)\s*:\s*([^;]+);/.exec(line);

    if (match && !match[1]!.startsWith("--color-")) out[match[1]!] = norm(match[2]!);
  }

  return out;
};

const css = readFileSync(THEMES, "utf8");
const light = readBlock(css, ":root");
const dark = readBlock(css, ".dark");

interface Pair {
  light: string;
  dark: string;
}

const brandSrc = readFileSync(BRAND, "utf8");
const brand: Record<string, Pair> = {};

for (const m of brandSrc.matchAll(
  /variable:\s*"(--[a-z-]+)",\s*\n\s*light:\s*"([^"]+)",\s*\n\s*dark:\s*"([^"]+)"/g,
)) {
  brand[m[1]!] = { light: norm(m[2]!), dark: norm(m[3]!) };
}

const designSrc = readFileSync(DESIGN, "utf8");
const design: Record<string, Pair> = {};

for (const m of designSrc.matchAll(
  /^\|\s*`(--[a-z-]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm,
)) {
  design[m[1]!] = { light: norm(m[2]!), dark: norm(m[3]!) };
}

const mapped = new Set<string>();
const unmappedPerApp: Record<string, string[]> = {};

for (const app of THEME_APPS) {
  const globals = readFileSync(join(REPO, "apps", app, "app", "globals.css"), "utf8");

  const names = new Set<string>();

  for (const m of globals.matchAll(/--color-[a-z-]+:\s*var\((--[a-z-]+)\)/g)) {
    names.add(m[1]!);
    mapped.add(m[1]!);
  }

  unmappedPerApp[app] = Object.keys(light).filter((t) => !names.has(t));
}

const problems: string[] = [];

const tokens = [
  ...new Set([...Object.keys(light), ...Object.keys(brand), ...Object.keys(design)]),
].sort();

const cell = (value: string, width: number) => value.padEnd(width);

console.log(
  cell("token", 26) +
    cell("themes.css", 12) +
    cell("brand.ts", 12) +
    cell("DESIGN.md", 12) +
    "tailwind",
);

console.log("-".repeat(74));

for (const token of tokens) {
  const inCss = token in light;

  const b = brand[token];
  const d = design[token];

  if (!inCss) problems.push(`${token}: documented but absent from themes.css :root`);
  else if (!(token in dark)) problems.push(`${token}: present in :root but missing from .dark`);

  const bState = !b
    ? "absent"
    : b.light === light[token] && b.dark === dark[token]
      ? "match"
      : "MISMATCH";
  const dState = !d
    ? "absent"
    : d.light === light[token] && d.dark === dark[token]
      ? "match"
      : "MISMATCH";

  if (bState === "MISMATCH")
    problems.push(
      `${token}: brand.ts says ${b!.light} / ${b!.dark}, themes.css says ${light[token]} / ${dark[token]}`,
    );

  if (dState === "MISMATCH")
    problems.push(
      `${token}: DESIGN.md says ${d!.light} / ${d!.dark}, themes.css says ${light[token]} / ${dark[token]}`,
    );

  console.log(
    cell(token, 26) +
      cell(inCss ? "yes" : "MISSING", 12) +
      cell(bState, 12) +
      cell(dState, 12) +
      (mapped.has(token) ? "mapped" : "not mapped"),
  );
}

const neverMapped = Object.keys(light).filter((t) => !mapped.has(t));
if (neverMapped.length)
  console.log(
    `\nDefined but mapped in no app - utilities for these do not exist:\n  ${neverMapped.join("\n  ")}`,
  );

const partial = Object.entries(unmappedPerApp)
  .flatMap(([app, list]) =>
    list.filter((t) => mapped.has(t)).map((t) => `${t} missing in apps/${app}`),
  )
  .sort();

if (partial.length) problems.push(...partial.map((p) => `mapped unevenly: ${p}`));

/**
 * A token that is defined but mapped into no `@theme` block produces no Tailwind
 * utility. Referencing it in source is then silent: the class name is valid-looking,
 * emits no CSS, and the element quietly inherits its parent colour.
 *
 * That is exactly how `text-muted-foreground` reached 36 usages across /affiliate
 * while rendering uncoloured body copy. The report below already listed the token as
 * "mapped in no app" - it just never failed anything, so nobody acted on it.
 *
 * Defining a token without a utility is fine on its own (--fd-accent is consumed
 * directly by Fumadocs). Defining one *and using it as a utility* is the bug, so that
 * is what fails here.
 */
const utilityPrefixes = ["text", "bg", "border", "ring", "fill", "stroke", "from", "to", "via"];

const sourceGlobs = ["app", "components", "features", "hooks", "utils"].map((dir) =>
  join(HERE, "..", dir),
);

const collectSource = (dir: string): string[] => {
  let entries: import("node:fs").Dirent[];

  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) return collectSource(full);

    return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
  });
};

const sourceText = sourceGlobs
  .flatMap(collectSource)
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const token of neverMapped) {
  const base = token.replace(/^--/, "");

  const used = utilityPrefixes.filter((prefix) =>
    new RegExp(`(?<![\\w-])${prefix}-${base}(?![\\w-])`).test(sourceText),
  );

  if (used.length)
    problems.push(
      `unmapped token in use: --${base} is mapped in no @theme block, so ` +
        `${used.map((p) => `\`${p}-${base}\``).join(", ")} emit no CSS. ` +
        `Either map it, or use a token that is mapped.`,
    );
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);

  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("\nthemes.css, brand.ts and DESIGN.md agree on every token.");
