import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { main } from "../src/cli/main.js";
import { buildDocx } from "./fixtures/buildDocx.js";
import { buildPdf, LEFT_COLUMN, RIGHT_COLUMN, text } from "./fixtures/buildPdf.js";

const dir = mkdtempSync(join(tmpdir(), "ats-cli-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const RESUME = [
  "Jane Doe",
  "jane.doe@example.com | (415) 555-0199",
  "",
  "Experience",
  "Senior Engineer, Acme Corporation",
  "Jan 2020 - Present",
  "- Built payment systems in TypeScript, cutting failures 40%.",
  "",
  "Education",
  "BSc Computer Science, State University, 2015",
  "",
  "Skills",
  "TypeScript, Go, PostgreSQL",
].join("\n");

function file(name: string, content: string | Buffer) {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

let out: string[];
let err: string[];

beforeEach(() => {
  out = [];
  err = [];
  vi.spyOn(console, "log").mockImplementation((line: string) => void out.push(line));
  vi.spyOn(console, "error").mockImplementation((line: string) => void err.push(line));
});

describe("ats-engine check", () => {
  it("prints the score, what an ATS reads, and the failed checks", async () => {
    expect(await main(["check", file("resume.txt", RESUME)])).toBe(0);

    const printed = out.join("\n");
    expect(printed).toMatch(/^Readiness {2}\d+\/100/);
    expect(printed).toContain("Name     Jane Doe");
    expect(printed).toContain("Email    jane.doe@example.com");
    expect(printed).toMatch(/Role {5}Senior Engineer, Acme Corporation \(Jan 2020 – Present\)/);
  });

  it("prints the text as read with --text, and the region it was read in", async () => {
    expect(await main(["check", file("text.txt", RESUME), "--text", "--region", "US"])).toBe(0);
    const printed = out.join("\n");
    expect(printed).toContain("Read as    US");
    expect(printed).toContain(
      "Text as read:\nJane Doe\njane.doe@example.com | (415) 555-0199\nExperience",
    );
  });

  it("matches against a job description, including a saved HTML page", async () => {
    const job = file(
      "job.html",
      `<html><body><script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        title: "Platform Engineer",
        description:
          "<p>Run our platform on Kubernetes. TypeScript and Go required.</p>" +
          "<ul><li>Own the deploy pipeline and on-call rotation</li>" +
          "<li>Design services for payments at scale</li>" +
          "<li>Mentor engineers across two product teams</li>" +
          "<li>Drive incident reviews and reliability work</li></ul>",
      })}</script><nav>Login</nav></body></html>`,
    );
    expect(await main(["check", file("r2.txt", RESUME), "--job", job, "--json"])).toBe(0);

    const report = JSON.parse(out.join("\n"));
    expect(report.jobMatchScore).toEqual(expect.any(Number));
    expect(report.missingKeywords).toContain("kubernetes");
  });

  it("reads PDF and DOCX files, measuring a PDF's layout", async () => {
    const ops = LEFT_COLUMN.flatMap((line: string, index: number) => [
      text(45, 720 - index * 26, line),
      text(340, 720 - index * 26, RIGHT_COLUMN[index]!),
    ]).join("\n");
    expect(await main(["check", file("two-column.pdf", buildPdf(ops)), "--json"])).toBe(0);
    const pdfReport = JSON.parse(out.join("\n"));
    const columnRule = pdfReport.rules.find((rule: { id: string }) => /column/i.test(rule.id));
    expect(columnRule?.passed).toBe(false);

    out = [];
    expect(
      await main(["check", file("resume.docx", buildDocx(RESUME.split("\n"))), "--json"]),
    ).toBe(0);
    expect(JSON.parse(out.join("\n")).parsed.name).toBe("Jane Doe");
  }, 60_000);

  it("gates on --min-score with exit code 2", async () => {
    const resume = file("r3.txt", RESUME);
    expect(await main(["check", resume, "--min-score", "100"])).toBe(2);
    expect(await main(["check", resume, "--min-score", "0"])).toBe(0);
  });

  it.each([
    [["check"], /exactly one resume file/],
    [["check", "a.pages"], /Unsupported resume file type/],
    [["check", "missing.txt"], /ENOENT|no such file/i],
    [["check", "x.txt", "--min-score", "abc"], /--min-score/],
    [["frobnicate"], null],
  ])("exits 1 on %j", async (argv, message) => {
    expect(await main(argv as string[])).toBe(1);
    if (message) expect(err.join("\n")).toMatch(message);
  });

  it("refuses a file with no readable text, the way an ATS would", async () => {
    expect(await main(["check", file("blank.txt", "   ")])).toBe(1);
    expect(err.join("\n")).toMatch(/enough readable text/);
  });

  it("prints usage for --help", async () => {
    expect(await main(["--help"])).toBe(0);
    expect(await main(["check", "--help"])).toBe(0);
    expect(out.join("\n")).toContain("Usage: ats-engine check");
  });
});
