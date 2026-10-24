/**
 * Lighthouse, mobile preset, on the six pages the audit measured. Writes one JSON report per
 * page to `.lighthouse/` plus `.lighthouse/summary.md`, and prints the summary table.
 *
 *   npm run lighthouse:mobile -w @veriworkly/site -- http://localhost:3100
 *
 * Needs a running production build (`next start`) and a Chrome on the machine. Lighthouse
 * itself is fetched with `npx` on demand rather than added as a dependency.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LIGHTHOUSE = "lighthouse@13.5.0";
const PAGES = ["/", "/pricing", "/ats-checker", "/templates", "/changelog", "/compare/rezi"];

const baseUrl = (
  process.argv[2] ??
  process.env.LIGHTHOUSE_BASE_URL ??
  "http://localhost:3100"
).replace(/\/+$/, "");

const outDir = path.resolve(".lighthouse");
mkdirSync(outDir, { recursive: true });

interface Row {
  page: string;
  perf: number;
  seo: number;
  a11y: number;
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  lcpElement: string;
}

interface LighthouseReport {
  categories: Record<string, { score: number | null }>;
  audits: Record<
    string,
    { numericValue?: number; details?: { items?: Array<Record<string, unknown>> } }
  >;
}

const score = (report: LighthouseReport, id: string) =>
  Math.round((report.categories[id]?.score ?? 0) * 100);

const metric = (report: LighthouseReport, id: string) => report.audits[id]?.numericValue ?? NaN;

function lcpElement(report: LighthouseReport) {
  // Lighthouse 13 reports the element inside the LCP breakdown insight; older versions
  // had a dedicated audit. Walk whatever is there for the first node snippet.
  const details =
    report.audits["lcp-breakdown-insight"]?.details ??
    report.audits["largest-contentful-paint-element"]?.details;

  const queue: unknown[] = [details];

  while (queue.length) {
    const current = queue.shift();

    if (!current || typeof current !== "object") continue;

    const record = current as Record<string, unknown>;
    const node = (record.type === "node" ? record : record.node) as
      { snippet?: string } | undefined;

    if (node?.snippet) return node.snippet.replace(/\s+/g, " ").slice(0, 60);

    queue.push(...Object.values(record));
  }

  return "";
}

const rows: Row[] = [];
const failures: string[] = [];

for (const page of PAGES) {
  const name = page === "/" ? "home" : page.slice(1).replace(/\//g, "-");
  const jsonPath = path.join(outDir, `${name}.json`);

  // One command string: npx is a .cmd shim on Windows, which Node only runs through a shell.
  const command = [
    "npx",
    "--yes",
    LIGHTHOUSE,
    `"${baseUrl}${page}"`,
    "--form-factor=mobile",
    "--throttling-method=simulate",
    "--only-categories=performance,seo,accessibility",
    "--output=json",
    `"--output-path=${jsonPath}"`,
    '--chrome-flags="--headless=new --no-sandbox"',
    "--quiet",
  ].join(" ");

  const result = spawnSync(command, { stdio: "inherit", shell: true });

  if (result.status !== 0) {
    failures.push(page);
    continue;
  }

  const report = JSON.parse(readFileSync(jsonPath, "utf8")) as LighthouseReport;

  rows.push({
    page,
    perf: score(report, "performance"),
    seo: score(report, "seo"),
    a11y: score(report, "accessibility"),
    fcp: metric(report, "first-contentful-paint"),
    lcp: metric(report, "largest-contentful-paint"),
    tbt: metric(report, "total-blocking-time"),
    cls: metric(report, "cumulative-layout-shift"),
    lcpElement: lcpElement(report),
  });
}

const seconds = (ms: number) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : "n/a");
const millis = (ms: number) => (Number.isFinite(ms) ? `${Math.round(ms)} ms` : "n/a");

const table = [
  "| route | perf | SEO | a11y | FCP | LCP | TBT | CLS | LCP element |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...rows.map(
    (r) =>
      `| ${r.page} | ${r.perf} | ${r.seo} | ${r.a11y} | ${seconds(r.fcp)} | ${seconds(r.lcp)} | ${millis(r.tbt)} | ${r.cls.toFixed(3)} | \`${r.lcpElement.replace(/\|/g, "\\|")}\` |`,
  ),
  ...(failures.length ? ["", `Failed to measure: ${failures.join(", ")}`] : []),
].join("\n");

const summary = `Lighthouse mobile (simulated throttling) against ${baseUrl}\n\n${table}\n`;

writeFileSync(path.join(outDir, "summary.md"), summary);
console.log(`\n${summary}`);

if (failures.length) process.exit(1);
