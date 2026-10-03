// Bundle size per public subpath, minified and gzipped, against a budget. Run after `npm run build`.
// A budget is the size when it was set plus headroom; raise it in the same change that earns it.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const { exports } = JSON.parse(readFileSync("package.json", "utf8"));

/** Gzipped KB. */
const BUDGETS = {
  ".": 160,
  "./document": 3,
  "./format": 1.5,
  "./job": 3,
  "./locales": 145,
  "./ai": 140,
  "./ai/openai-compatible": 2,
  "./ai/anthropic": 2,
  "./ai/testing": 1.5,
  // The zip reader is a port of JSZip's, so the expansion budget reads exactly what mammoth will.
  "./node": 10,
};

let failed = false;
for (const [subpath, budget] of Object.entries(BUDGETS)) {
  const result = await build({
    stdin: { contents: `export * from "${exports[subpath].import}";`, resolveDir: process.cwd() },
    bundle: true,
    minify: true,
    format: "esm",
    platform: subpath === "./node" ? "node" : "neutral",
    mainFields: ["module", "main"],
    external: ["pdfjs-dist", "pdf-parse", "mammoth", "node:*"],
    write: false,
    logLevel: "silent",
  });
  const kb = gzipSync(result.outputFiles[0].contents).length / 1024;
  const over = kb > budget;
  failed ||= over;
  console.log(
    `${over ? "OVER" : "ok  "}  ${subpath.padEnd(24)} ${kb.toFixed(1).padStart(6)} KB gz / ${budget} KB`,
  );
}
process.exitCode = failed ? 1 : 0;
