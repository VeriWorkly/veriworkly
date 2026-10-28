/**
 * Type-checks every TypeScript sample in the ATS Engine docs against the installed
 * `@veriworkly/ats-engine`, so a page cannot show an import, an option or a field the engine does
 * not have. The engine's own repository does the same for its README (`npm run smoke`).
 *
 * Checked: fenced blocks whose language is `ts`, `typescript` or `tsx`, under `content/ats-engine`.
 * Each block is its own ES module, compiled with `strict` and `exactOptionalPropertyTypes`, with
 * top-level await; `tsx` blocks compile as React JSX. Two inputs are declared for every sample, so
 * pages need not read a file first: `resumeText` and `postingText`, both strings.
 *
 * A block with a `title` (```ts title="score.ts") is written under that file name, next to the
 * other titled blocks of the same page, so one sample can import another the way the page shows
 * it (`import { scoreText } from "./score"`). Put `nocheck` in a fence's meta (```ts nocheck) for
 * a fragment that is not meant to compile on its own.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(appRoot, "content/ats-engine");
// Inside the app, so `@veriworkly/ats-engine`, `next` and `react` resolve from its node_modules.
const workDir = path.join(appRoot, ".engine-samples");

const PRELUDE = "declare const resumeText: string;\ndeclare const postingText: string;\n";
const LANGUAGES = { ts: "ts", typescript: "ts", tsx: "tsx" };

function listPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listPages(entryPath);
    return /\.mdx?$/.test(entry.name) ? [entryPath] : [];
  });
}

function extractSamples(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const samples = [];
  let open = null;

  lines.forEach((line, index) => {
    const fence = line.match(/^\s*(`{3,}|~{3,})(\S*)\s*(.*)$/);

    if (!open) {
      const language = fence && LANGUAGES[fence[2]];
      if (language && !/\bnocheck\b/.test(fence[3])) {
        const title = fence[3].match(/\btitle="([^"]+)"/)?.[1];
        open = { marker: fence[1], start: index + 2, body: [], language, title };
      } else if (fence) {
        open = { marker: fence[1], skip: true };
      }
      return;
    }

    if (fence && fence[1].startsWith(open.marker) && fence[2] === "") {
      if (!open.skip) {
        const { start, body, language, title } = open;
        samples.push({ filePath, start, code: body.join("\n"), language, title });
      }
      open = null;
      return;
    }

    if (!open.skip) open.body.push(line.replace(/\s*\/\/ \[!code[^\]]*\]$/, ""));
  });

  return samples;
}

const pages = listPages(contentDir);

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

const fileToSample = new Map();
const preludeLines = PRELUDE.split("\n").length - 1;
let sampleCount = 0;
let setupErrors = 0;

pages.forEach((page, pageIndex) => {
  const pageDir = path.join(workDir, `page-${pageIndex}`);

  extractSamples(page).forEach((sample, index) => {
    sampleCount++;

    const extension = sample.language === "tsx" ? ".tsx" : ".mts";
    const name = sample.title ?? `sample-${index}${extension}`;
    const samplePath = path.normalize(path.join(pageDir, name));

    if (sample.title && sample.language === "tsx" && !sample.title.endsWith(".tsx")) {
      console.error(
        `${path.relative(appRoot, page)}:${sample.start - 1}: a tsx sample's title must end in .tsx`,
      );
      setupErrors++;
      return;
    }
    if (!samplePath.startsWith(pageDir + path.sep) || fileToSample.has(samplePath)) {
      console.error(
        `${path.relative(appRoot, page)}:${sample.start - 1}: sample title "${name}" is reused or leaves the page`,
      );
      setupErrors++;
      return;
    }

    fs.mkdirSync(path.dirname(samplePath), { recursive: true });
    fs.writeFileSync(samplePath, `${PRELUDE}${sample.code}\nexport {};\n`);
    fileToSample.set(samplePath, sample);
  });
});

const program = ts.createProgram([...fileToSample.keys()], {
  noEmit: true,
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: false,
  // How a bundled app (Next.js, a Worker) resolves the package and `next/server`.
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2023,
  jsx: ts.JsxEmit.ReactJSX,
  lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  types: ["node"],
  skipLibCheck: true,
});

const diagnostics = ts.getPreEmitDiagnostics(program);
let failures = setupErrors;

for (const diagnostic of diagnostics) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  const sample = diagnostic.file && fileToSample.get(path.normalize(diagnostic.file.fileName));

  if (!sample || diagnostic.start === undefined) {
    console.error(`error: ${message}`);
    failures++;
    continue;
  }

  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const pageLine = sample.start + line - preludeLines;
  const where = `${path.relative(appRoot, sample.filePath)}:${pageLine}`;

  console.error(`${where}: ${message}`);
  failures++;
}

fs.rmSync(workDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} error(s) in ${sampleCount} ATS Engine docs samples.`);
  process.exit(1);
}

console.log(`All ${sampleCount} ATS Engine docs samples type-check.`);
