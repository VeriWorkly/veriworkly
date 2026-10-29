/** Initial gzipped JS per prerendered route after `next build`. `--check` exits 1 when a route is over its budget. Run: npx tsx scripts/measure-js.mts [--check] [route ...] */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// KB gzip. Set a few KB above the measured size so a regression fails CI; lower them as pages shrink.
const BUDGETS: Record<string, number> = {
  "/": 232,
  "/ats-checker": 194,
  "/affiliate": 218,
  "/ambassador": 216,
};
const DEFAULT_BUDGET = 188;

// Routes rendered per request on purpose, with the reason. Any other route without prerendered HTML fails --check:
// it has turned dynamic by accident, and its JS can no longer be measured here.
const DYNAMIC_ROUTES: Record<string, string> = {};

const args = process.argv.slice(2);
const check = args.includes("--check");
const requested = args.filter((arg) => arg !== "--check");
const ROUTES = requested.length
  ? requested
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
  "| route | initial JS (gz) | budget | chunks |",
  "| --- | ---: | ---: | ---: |",
];
const over: string[] = [];

for (const route of ROUTES) {
  const file = join(appDir, route === "/" ? "index.html" : `${route.slice(1)}.html`);
  const budget = BUDGETS[route] ?? DEFAULT_BUDGET;

  if (!existsSync(file)) {
    const reason = DYNAMIC_ROUTES[route];
    if (!reason) over.push(`${route} is not prerendered`);
    rows.push(
      `| ${route} | ${reason ? `dynamic: ${reason}` : "not prerendered ❌"} | ${budget} KB | |`,
    );
    continue;
  }

  const html = readFileSync(file, "utf8");
  // noModule scripts are polyfills that browsers running modules never fetch.
  const srcs = [
    ...new Set(
      [...html.matchAll(/<script([^>]*)src="\/_next\/([^"]+)"([^>]*)>/g)]
        .filter((m) => !/nomodule/i.test(m[1]! + m[3]!))
        .map((m) => m[2]!),
    ),
  ];

  let bytes = 0;
  for (const src of srcs) {
    const path = join(".next", decodeURIComponent(src.split("?")[0]!));
    if (existsSync(path)) bytes += gzipSync(readFileSync(path), { level: 9 }).length;
  }

  const kb = bytes / 1024;
  if (kb > budget) over.push(`${route} ${kb.toFixed(1)} KB > ${budget} KB`);
  rows.push(
    `| ${route} | ${kb.toFixed(1)} KB${kb > budget ? " ❌" : ""} | ${budget} KB | ${srcs.length} |`,
  );
}

console.log(rows.join("\n"));

if (check && over.length) {
  console.error(`\nOver budget or not prerendered:\n${over.join("\n")}`);
  process.exit(1);
}
