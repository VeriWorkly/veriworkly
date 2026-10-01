// Browser and edge smoke test. Run after `npm run build`.
//
// Browser: every runtime-agnostic subpath must bundle for `platform: "browser"`, which fails on
// any Node built-in. Edge: the core, bundled, must score a resume inside a bare V8 context —
// no `process`, `Buffer`, `require` or file system, as in a Workers/Edge runtime.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const { exports } = JSON.parse(readFileSync("package.json", "utf8"));
const BROWSER = [
  ".",
  "./document",
  "./format",
  "./job",
  "./locales",
  "./ai",
  "./ai/openai-compatible",
  "./ai/anthropic",
  "./ai/testing",
];

for (const subpath of BROWSER) {
  await build({
    stdin: { contents: `export * from "${exports[subpath].import}";`, resolveDir: process.cwd() },
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
  });
  console.log(`browser  ${subpath}`);
}

const core = await build({
  stdin: {
    contents: `import { AtsScoringService, DEFAULT_POLICY } from "${exports["."].import}";
      globalThis.report = AtsScoringService.check(
        "Jane Doe\\njane@example.com\\nExperience\\nEngineer at Acme 2019 - 2022\\n- Built services",
        DEFAULT_POLICY,
        { now: new Date("2026-01-01") },
      );`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "iife",
  platform: "browser",
  write: false,
  logLevel: "silent",
});
const sandbox = { TextEncoder, TextDecoder, URL, console };
runInNewContext(core.outputFiles[0].text, sandbox);
if (typeof sandbox.report?.readinessScore !== "number") throw new Error("edge smoke: no report");
console.log(`edge     . (readiness ${sandbox.report.readinessScore})`);
