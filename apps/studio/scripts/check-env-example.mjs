// Lists every environment variable the studio reads that `.env.example` does not document, and
// every variable `.env.example` documents that no studio code reads.
// Run from apps/studio: `node scripts/check-env-example.mjs` (exit 1 when either list is not empty).
// `tests/contracts/env-example.contract.test.ts` runs the same check in CI.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read by the code but never set in `.env`: the runtime's own, inlined by `next.config.ts` `env`,
 * or set on the test command line.
 */
export const ENV_EXAMPLE_EXEMPT = new Set([
  "NODE_ENV",
  "TZ",
  "SHOT",
  "SHOT_FIXTURE",
  "PARITY_ORIGIN",
  "STUDIO_VERSION",
]);

const SOURCE_EXTENSIONS = /\.(ts|tsx|mts|mjs|js)$/;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".next", "audit", "public"]);
const ENV_READ = /process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(path);

    return SOURCE_EXTENSIONS.test(entry.name) ? [path] : [];
  });
}

/** Every variable read through `process.env` (dot or quoted-bracket access), with the files that read it. */
export function envReads(studioDir) {
  const reads = new Map();

  for (const file of sourceFiles(studioDir)) {
    for (const match of readFileSync(file, "utf8").matchAll(ENV_READ)) {
      const name = match[1] ?? match[2];
      reads.set(name, [...(reads.get(name) ?? []), file]);
    }
  }

  return reads;
}

/** Names in `.env.example`, commented-out entries included: those document an optional variable. */
export function documentedEnvNames(envExample) {
  return new Set([...envExample.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));
}

export function findUndocumentedEnvReads(studioDir) {
  const documented = documentedEnvNames(readFileSync(join(studioDir, ".env.example"), "utf8"));

  return [...envReads(studioDir).keys()]
    .filter((name) => !documented.has(name) && !ENV_EXAMPLE_EXEMPT.has(name))
    .sort();
}

/** Names `.env.example` documents that no studio code reads: an operator would set them for nothing. */
export function findUnreadEnvExampleEntries(studioDir) {
  const reads = envReads(studioDir);

  return [...documentedEnvNames(readFileSync(join(studioDir, ".env.example"), "utf8"))]
    .filter((name) => !reads.has(name))
    .sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const missing = findUndocumentedEnvReads(studioDir);
  const unread = findUnreadEnvExampleEntries(studioDir);

  if (missing.length > 0) {
    console.error(`Read by the studio but missing from .env.example: ${missing.join(", ")}`);
  }
  if (unread.length > 0) {
    console.error(`In .env.example but read by no studio code: ${unread.join(", ")}`);
  }
  if (missing.length > 0 || unread.length > 0) process.exit(1);

  console.log(".env.example lists exactly the variables the studio reads.");
}
