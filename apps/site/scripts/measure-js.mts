/**
 * Initial JavaScript per prerendered route, gzipped, read from a finished `next build`:
 * every module <script src> (noModule polyfills excluded) in the route's HTML, resolved under .next/static, gzip -9 summed.
 * Also flags framer's layout projection (`layoutId`) in the loaded chunks.
 *
 *   npx tsx scripts/measure-js.mts [route ...]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/",
      "/privacy",
      "/about",
      "/pricing",
      "/ats-checker",
      "/templates",
      "/affiliate",
      "/ambassador",
      "/compare/rezi",
    ];

const appDir = join(".next", "server", "app");
const rows: string[] = [
  "| route | initial JS (gz) | chunks | framer projection |",
  "| --- | ---: | ---: | --- |",
];

for (const route of ROUTES) {
  const file = join(appDir, route === "/" ? "index.html" : `${route.slice(1)}.html`);

  if (!existsSync(file)) {
    rows.push(`| ${route} | not prerendered | | |`);
    continue;
  }

  const html = readFileSync(file, "utf8");
  // noModule scripts are the legacy polyfills; browsers that run modules never fetch them.
  const srcs = [
    ...new Set(
      [...html.matchAll(/<script([^>]*)src="\/_next\/([^"]+)"([^>]*)>/g)]
        .filter((m) => !/nomodule/i.test(m[1]! + m[3]!))
        .map((m) => m[2]!),
    ),
  ];

  let bytes = 0;
  let projection = false;

  for (const src of srcs) {
    const path = join(".next", decodeURIComponent(src.split("?")[0]!));
    if (!existsSync(path)) continue;

    const body = readFileSync(path);
    bytes += gzipSync(body, { level: 9 }).length;
    if (body.includes("layoutId")) projection = true;
  }

  rows.push(
    `| ${route} | ${(bytes / 1024).toFixed(1)} KB | ${srcs.length} | ${projection ? "yes" : "no"} |`,
  );
}

console.log(rows.join("\n"));
