/**
 * `ats-engine check <resume> [--job <file>] [--policy <file>] [--json] [--min-score <n>]`
 *
 * Scores a resume file (PDF, DOCX, text, or a JSON resume document) with the bundled default
 * policy, or with `--policy`. `--min-score` makes it usable as a CI gate: the exit code is 2 when the
 * readiness score falls below it.
 */

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parseArgs } from "node:util";

import { categoryLabel, formatRoleDates, formatTenure, scoreTone } from "../format/index.js";
import {
  AtsScoringService,
  DEFAULT_POLICY,
  parseAtsPolicy,
  type AtsReport,
  type AtsResumeInput,
} from "../index.js";
import { jobTextFromHtml, normalizeJobText } from "../job/index.js";
import { BUILT_IN_LOCALES, withLocales } from "../locales/index.js";
import { detectResumeFormat, extractResume, type AtsExtraction } from "../node/extract.js";

const USAGE = `Usage: ats-engine check <resume> [options]

Scores a resume (.pdf, .docx, .txt, .md, or a .json resume document).

Options:
  --job <file>        Job description to match against (.txt, or a saved .html page)
  --policy <file>     Engine policy JSON (default: the bundled default policy)
  --json              Print the full report as JSON
  --min-score <n>     Exit with code 2 when the readiness score is below n
  --region <code>     Read the resume as from this country (US, DE, IN); default: inferred
  --text              Also print the text as an ATS reads it, line by line
  -h, --help          Show this help`;

class UsageError extends Error {}

async function readResume(
  path: string,
): Promise<{ input: AtsResumeInput } & Partial<AtsExtraction>> {
  const format = detectResumeFormat(path);
  if (!format) throw new UsageError(`Unsupported resume file type: ${extname(path) || path}`);
  const data = await readFile(path);
  if (extname(path).toLowerCase() === ".json") return { input: JSON.parse(data.toString("utf8")) };
  const { text, layout } = await extractResume(data, format);
  if (text.length < 50)
    throw new UsageError(
      format === "pdf"
        ? "The PDF has no readable text layer (a scan or a flattened image). An ATS cannot read it either."
        : "The file does not contain enough readable text.",
    );
  return { input: text, layout };
}

async function readJob(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  // Normalised exactly as the server normalises a fetched job, so both score the same text.
  return /\.html?$/i.test(path) ? jobTextFromHtml(content) : normalizeJobText(content);
}

function render(report: AtsReport): string {
  const tone = { good: "good", warn: "needs work", bad: "weak" }[scoreTone(report.readinessScore)];
  const { parsed } = report;
  const lines = [
    `Readiness  ${report.readinessScore}/100 (${tone}) — ${report.checksPassed}/${report.checksTotal} checks passed`,
  ];
  if (report.jobMatchScore !== null) {
    lines.push(`Job match  ${report.jobMatchScore}/100`);
    if (report.missingKeywords.length)
      lines.push(`  Missing keywords: ${report.missingKeywords.slice(0, 15).join(", ")}`);
  }

  const read = [...report.locale.languages, report.locale.region].filter(Boolean);
  if (read.length) lines.push(`Read as    ${read.join(", ")}`);

  lines.push("", "What an ATS reads:");
  lines.push(`  Name     ${parsed.name || "—"}`);
  lines.push(`  Email    ${parsed.email || "—"}`);
  lines.push(`  Phone    ${parsed.phone || "—"}`);
  for (const role of parsed.roles.slice(0, 8)) {
    // A role read without dates prints none, not "(null)".
    const dates = formatRoleDates(role);
    lines.push(
      `  Role     ${[role.title, role.employer].filter(Boolean).join(", ") || "—"}${dates ? ` (${dates})` : ""}`,
    );
  }
  if (!parsed.roles.length) lines.push("  Roles    none found");
  if (parsed.monthsOfExperience)
    lines.push(`  Tenure   ${formatTenure(parsed.monthsOfExperience)}`);
  if (parsed.skills.length) lines.push(`  Skills   ${parsed.skills.slice(0, 20).join(", ")}`);

  if (report.failedChecks.length) {
    lines.push("", "Failed checks:");
    for (const rule of report.failedChecks)
      lines.push(
        `  [${rule.severity}] ${categoryLabel(rule.category)}: ${rule.evidence}`,
        `      Fix: ${rule.fix}`,
      );
  }
  return lines.join("\n");
}

async function check(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      job: { type: "string" },
      policy: { type: "string" },
      json: { type: "boolean", default: false },
      "min-score": { type: "string" },
      region: { type: "string" },
      text: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  if (positionals.length !== 1) throw new UsageError("Give exactly one resume file.");

  const minScore = values["min-score"] === undefined ? null : Number(values["min-score"]);
  if (minScore !== null && !(minScore >= 0 && minScore <= 100))
    throw new UsageError("--min-score must be a number from 0 to 100.");

  // The bundled language and region packs ride on whichever policy is used.
  const policy = withLocales(
    values.policy
      ? parseAtsPolicy(JSON.parse(await readFile(values.policy, "utf8")))
      : DEFAULT_POLICY,
    BUILT_IN_LOCALES,
  );
  const regions = policy.locales.regions.map((pack) => pack.id);
  if (values.region !== undefined && !regions.includes(values.region.toUpperCase()))
    throw new UsageError(`Unknown --region "${values.region}"; use one of ${regions.join(", ")}.`);
  const { input, layout } = await readResume(positionals[0]!);
  const jobDescription = values.job ? await readJob(values.job) : undefined;
  const report = AtsScoringService.check(input, policy, {
    jobDescription,
    layout,
    region: values.region,
    includeLines: values.text,
  });

  console.log(values.json ? JSON.stringify(report, null, 2) : render(report));
  // The reading order, for seeing what a multi-column layout became.
  if (values.text && !values.json)
    console.log(["", "Text as read:", ...(report.lines ?? [])].join("\n"));
  return minScore !== null && report.readinessScore < minScore ? 2 : 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === "check") return await check(rest);
    console.log(USAGE);
    return command === undefined || command === "-h" || command === "--help" ? 0 : 1;
  } catch (error) {
    console.error(`ats-engine: ${error instanceof Error ? error.message : String(error)}`);
    if (!(error instanceof UsageError) && process.env.DEBUG) console.error(error);
    return 1;
  }
}
