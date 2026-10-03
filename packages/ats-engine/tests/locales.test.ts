import { describe, expect, it } from "vitest";

import { AtsPolicyError, AtsScoringService, DEFAULT_POLICY, type AtsReport } from "../src/index.js";
import {
  BUILT_IN_LOCALES,
  atsLanguagePackJsonSchema,
  de,
  withLocales,
} from "../src/locales/index.js";
import { fieldChecks } from "./fixtures/accuracy.js";
import { LOCALE_FIXTURES, type LocaleFixture } from "./fixtures/locale-resumes.js";

const NOW = new Date("2026-10-01T00:00:00Z");
const POLICY = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
const check = (text: string, options: Parameters<typeof AtsScoringService.check>[2] = {}) =>
  AtsScoringService.check(text, POLICY, { now: NOW, ...options });

const fieldAccuracy = (report: AtsReport, fixture: LocaleFixture) => {
  const checks = fieldChecks(report, fixture);
  return { correct: checks.filter((check) => check.ok).length, total: checks.length };
};

describe.each(Object.entries(LOCALE_FIXTURES))("the %s fixture set", (_, fixtures) => {
  it("is read with the expected locale", () => {
    for (const fixture of fixtures)
      expect(check(fixture.text).locale, fixture.id).toEqual(fixture.locale);
  });

  it("meets the field-accuracy target of 0.95", () => {
    let correct = 0;
    let total = 0;
    const misses: string[] = [];
    for (const fixture of fixtures) {
      const report = check(fixture.text);
      const score = fieldAccuracy(report, fixture);
      correct += score.correct;
      total += score.total;
      if (score.correct < score.total)
        misses.push(`${fixture.id}: ${JSON.stringify(report.parsed)}`);
    }
    expect(correct / total, misses.join("\n")).toBeGreaterThanOrEqual(0.95);
  });

  it("finds every section heading it has", () => {
    for (const fixture of fixtures)
      expect(
        check(fixture.text)
          .failedChecks.map((rule) => rule.id)
          .filter((id) => id.includes("structure")),
        fixture.id,
      ).toEqual([]);
  });
});

describe("detection", () => {
  it("leaves an English resume to the base vocabulary", () => {
    const report = check(
      "Jane Doe\njane@example.com | (415) 555-0199\nExperience\nEngineer, Acme 2020 - 2022",
    );
    expect(report.locale).toEqual({ languages: [], region: null });
  });

  it("does not read an English resume as German for a German company name", () => {
    const report = check(
      "Jane Doe\njane@example.com\nExperience\nEngineer, Müller und Söhne GmbH 2020 - 2022\n- Built the billing platform for the team",
    );
    expect(report.locale.languages).toEqual([]);
  });

  it("takes the region from a +CC phone number over the language's default", () => {
    expect(
      check(LOCALE_FIXTURES.de[0].text.replace("+49 30 12345678", "+91 98765 43210")).locale,
    ).toEqual({
      languages: ["de"],
      region: "IN",
    });
  });

  it("reads with exactly the locale a host asks for", () => {
    const report = check(LOCALE_FIXTURES["en-IN"][1].text, { region: "IN" });
    expect(report.locale).toEqual({ languages: [], region: "IN" });
    // The region's credentials and date order now apply.
    expect(report.parsed.education[1]).toMatchObject({ isced: 6 });
    expect(report.parsed.roles[0].start).toEqual({ year: 2018, month: 4 });
    expect(check(LOCALE_FIXTURES.de[0].text, { languages: [] }).locale.languages).toEqual([]);
  });

  it("keeps German stopwords out of an English posting's keywords", () => {
    const report = check("Jane Doe\nArt director.", {
      jobDescription: "Requirements\nArt direction and die-cut packaging design",
    });
    expect(report.missingKeywords.join(" ")).toContain("die");
  });
});

describe("region conventions", () => {
  const dob = "\nGeburtsdatum: 04.05.1990";
  const ruleIds = (report: AtsReport) => report.rules.map((rule) => rule.id);

  it("does not judge a German resume for stating a date of birth", () => {
    const report = check(LOCALE_FIXTURES.de[0].text + dob);
    expect(ruleIds(report)).not.toContain("ats-v2.privacy.dateOfBirth");
  });

  it("warns about it in the US, and weighs it lightly when the country is unknown", () => {
    const text =
      "Jane Doe\njane@example.com | +1 415 555 0199\nExperience\nEngineer, Acme 2020 - 2022\nDate of birth: 04/05/1990";
    const us = check(text).rules.find((rule) => rule.id === "ats-v2.privacy.dateOfBirth");
    expect(us).toMatchObject({ passed: false, severity: "warning", scoreImpact: 6 });
    const unknown = check(text.replace("+1 415 555 0199", "jane2@example.com")).rules.find(
      (rule) => rule.id === "ats-v2.privacy.dateOfBirth",
    );
    expect(unknown).toMatchObject({ passed: false, severity: "info", scoreImpact: 2 });
  });

  it("weighs a photo by region, and only when the file was measured", () => {
    const layout = { columnRatio: 0, tableCount: 0, pageCount: 1, imageCount: 1 };
    const photo = (text: string, withLayout = true) =>
      check(text, withLayout ? { layout } : {}).rules.find(
        (rule) => rule.id === "ats-v2.format.photo",
      );
    expect(photo(LOCALE_FIXTURES.de[0].text)).toBeUndefined();
    expect(
      photo("Jane Doe\n+1 415 555 0199\nExperience\nEngineer, Acme 2020 - 2022"),
    ).toMatchObject({
      passed: false,
      scoreImpact: 6,
    });
    expect(photo("Jane Doe\n+1 415 555 0199", false)).toBeUndefined();
  });
});

describe("packs", () => {
  it("are validated when attached, naming the bad field", () => {
    const broken = { ...de, id: "xx", sections: { experience: String.raw`^erfahrung\-x` } };
    expect(() => withLocales(DEFAULT_POLICY, { languages: [broken] })).toThrow(AtsPolicyError);
  });

  it("need a way to be recognised", () => {
    expect(() =>
      withLocales(DEFAULT_POLICY, { languages: [{ id: "xx", name: "X", status: "community" }] }),
    ).toThrow(AtsPolicyError);
  });

  it("replace an attached pack with the same id", () => {
    const twice = withLocales(withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES), { languages: [de] });
    expect(twice.locales.languages.map((pack) => pack.id)).toEqual(["de", "hi"]);
  });

  it("publish a JSON Schema for contributors", () => {
    expect(atsLanguagePackJsonSchema).toMatchObject({ type: "object" });
  });

  it("leave a policy without packs exactly as fast and as it was", () => {
    const report = AtsScoringService.check(
      "Jane Doe\nExperience\nEngineer, Acme 2020 - 2022",
      DEFAULT_POLICY,
      {
        now: NOW,
      },
    );
    expect(report.locale).toEqual({ languages: [], region: null });
  });
});
