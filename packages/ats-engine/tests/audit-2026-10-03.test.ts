import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";
import { readHiddenCharacters, stripHiddenCharacters } from "../src/text/characters.js";

const NOW = new Date("2026-10-01T00:00:00Z");

const document = {
  format: "ats-resume@1" as const,
  basics: { name: "Jane Doe", email: "jane@example.com" },
  sections: [
    {
      kind: "experience" as const,
      title: "Experience",
      items: [{ title: "Engineer", employer: "Acme", start: "2020-01", end: "2025-01" }],
    },
  ],
};

const check = (input: unknown) =>
  AtsScoringService.check(input as typeof document, DEFAULT_POLICY, { now: NOW });

describe("2026-10-03 audit regressions", () => {
  it("ignores invisible characters in unknown structured fields", () => {
    const clean = check(document);
    const extra = check({ ...document, ignored: "\u200b" });
    const invisible = (report: typeof clean) =>
      report.rules.find((rule) => rule.id === "ats-v2.integrity.invisibleCharacters");

    expect(invisible(extra)).toEqual(invisible(clean));
    expect(extra.readinessScore).toBe(clean.readinessScore);
  });

  it("does not credit a structured role whose date range runs backwards", () => {
    const report = check({
      ...document,
      sections: [
        {
          ...document.sections[0],
          items: [{ title: "Engineer", employer: "Acme", start: "2025-01", end: "2020-01" }],
        },
      ],
    });

    expect(report.parsed.roles[0]).toMatchObject({ start: null, end: null, current: false });
    expect(report.rules.find((rule) => rule.id === "ats-v2.parse.roleCompleteness")).toMatchObject({
      passed: false,
    });
  });

  it("counts and strips a consecutive Latin ZWJ/ZWNJ run", () => {
    const text = "a\u200d\u200cb";

    expect(readHiddenCharacters(text).count).toBe(2);
    expect(stripHiddenCharacters(text)).toBe("ab");
  });
});
