import { describe, expect, it } from "vitest";

import {
  AtsPolicyError,
  AtsScoringService,
  DEFAULT_POLICY,
  parseAtsPolicy,
  parseResume,
  prepareResume,
  type AtsEnginePolicy,
} from "../src/index.js";
import { normalizeText, wordListRegex, words } from "../src/text/text.js";
import { properNounTokens } from "../src/matching/vocabulary.js";

/**
 * The Unicode core: text in any script reads the way ASCII English always has. Nothing here
 * needs a language pack — these are the grammar-level guarantees every locale builds on.
 */

const NOW = new Date("2026-10-01T00:00:00Z");
const nameOf = (text: string) => parseResume(text.split("\n"), DEFAULT_POLICY, NOW).name;
const withPolicy = (patch: (json: AtsEnginePolicy) => void): AtsEnginePolicy => {
  const json = structuredClone(DEFAULT_POLICY);
  patch(json);
  return parseAtsPolicy(json);
};

describe("normalisation", () => {
  it("folds what PDF extraction leaves behind", () => {
    expect(normalizeText("ofﬁce ﬂow")).toBe("office flow");
    expect(normalizeText("ＴｙｐｅＳｃｒｉｐｔ ２０２０")).toBe("TypeScript 2020");
    expect(normalizeText("Jane\u{00A0}Doe")).toBe("Jane Doe");
  });

  it("reads the digits of every script as ASCII", () => {
    expect(normalizeText("२०१९ - २०२२")).toBe("2019 - 2022");
    expect(normalizeText("٢٠١٩")).toBe("2019");
    expect(normalizeText("৯৮৭৬৫")).toBe("98765");
  });

  it("is what the engine scores", () => {
    expect(prepareResume("Senior Engineer ２０２０ - ２０２２").text).toBe(
      "Senior Engineer 2020 - 2022",
    );
  });

  it("reads a date range written in Devanagari digits", () => {
    const parsed = parseResume(
      "Jane Doe\nEXPERIENCE\nEngineer, Acme २०१९ - २०२२".split("\n").map(normalizeText),
      DEFAULT_POLICY,
      NOW,
    );
    expect(parsed.roles[0]).toMatchObject({ start: { year: 2019 }, end: { year: 2022 } });
  });
});

describe("word counting", () => {
  it("counts words in any script", () => {
    // Three code units or more, as for English: "के" (two) is left out like "of".
    expect(words("सॉफ्टवेयर इंजीनियर के रूप में अनुभव")).toHaveLength(5);
    expect(words("Erfahrung für Kunden über Jahre")).toHaveLength(5);
  });

  it("counts English exactly as before", () => {
    expect(words("Built a CI/CD pipeline in Go for 3 teams")).toEqual([
      "built",
      "pipeline",
      "for",
      "teams",
    ]);
  });

  it("gives a Hindi resume a word count", () => {
    const report = AtsScoringService.check(
      "राहुल शर्मा\nसॉफ्टवेयर इंजीनियर के रूप में पाँच वर्षों का अनुभव।",
      DEFAULT_POLICY,
      { now: NOW },
    );
    expect(report.wordCount).toBeGreaterThan(0);
  });
});

describe("names", () => {
  it.each([
    ["Jürgen Müller\njuergen@example.com", "Jürgen Müller"],
    ["Ludwig van Beethoven\nludwig@example.com", "Ludwig van Beethoven"],
    ["María de la Cruz\nmaria@example.com", "María de la Cruz"],
    ["Ahmad bin Ismail\nahmad@example.com", "Ahmad bin Ismail"],
    ["Jane Doe, PhD\njane@example.com", "Jane Doe"],
    ["Raj Patel, M.D., CPA\nraj@example.com", "Raj Patel"],
    ["राहुल शर्मा\nrahul@example.com", "राहुल शर्मा"],
    ["Suharto\nsuharto@example.com", "Suharto"],
    ["RESUME\nJane Doe\njane@example.com", "Jane Doe"],
    ["Curriculum Vitae\nJane Doe", "Jane Doe"],
    ["JANE DOE\njane@example.com", "JANE DOE"],
  ])("reads %j as %j", (text, name) => {
    expect(nameOf(text)).toBe(name);
  });

  it.each([
    ["a headline, when the name is in an image", "Senior Software Engineer\njane@example.com"],
    ["a lone word below the first line", "jane@example.com\nExperience\nEngineer"],
    ["a section heading", "EXPERIENCE\nEngineer, Acme 2020 - 2022"],
    ["a particle at either end", "van Beethoven\nludwig@example.com"],
  ])("does not read %s as a name", (_, text) => {
    expect(nameOf(text)).toBe("");
  });
});

describe("word boundaries in any script", () => {
  it("finds whole words that \\b cannot see", () => {
    const verbs = wordListRegex(["führte", "अनुभव"]);
    expect(verbs.test("Ich führte das Team")).toBe(true);
    expect(verbs.test("Ich habe es geführte")).toBe(false);
    expect(verbs.test("पाँच वर्षों का अनुभव।")).toBe(true);
    // What the ASCII boundary did with the same words.
    expect(/\b(?:führte|अनुभव)\b/iu.test("पाँच वर्षों का अनुभव।")).toBe(false);
  });

  it("does not match a word list entry inside a longer word", () => {
    const policy = withPolicy((json) => {
      json.resumeParse.titleWords = ["leiter"];
    });
    const parsed = parseResume(
      "Jane Doe\nEXPERIENCE\nAcme, Teamleiterin 2019 - 2022".split("\n"),
      policy,
      NOW,
    );
    // "Teamleiterin" holds "leiter" but is not it, so the first part stays the title.
    expect(parsed.roles[0]).toMatchObject({ title: "Acme", employer: "Teamleiterin" });
  });
});

describe("proper nouns", () => {
  it("reads capitals as a signal in English", () => {
    expect(properNounTokens("Experience with Kubernetes and payments.")).toEqual(
      new Set(["kubernetes"]),
    );
  });

  it("ignores a leading capital where every noun has one, keeping acronyms and inner capitals", () => {
    const tokens = properNounTokens("Erfahrung mit Kubernetes, AWS und PostgreSQL im Team.", true);
    expect(tokens).toEqual(new Set(["aws", "postgresql"]));
  });
});

describe("alternatives", () => {
  it("labels a missing choice with the posting's own word", () => {
    const policy = withPolicy((json) => {
      json.keywordMatch.alternationWords = ["or", "oder"];
    });
    const report = AtsScoringService.check("Jane Doe\nPython developer.", policy, {
      jobDescription: "Requirements\nErfahrung mit Go oder Java",
      now: NOW,
    });
    expect(report.missingKeywords).toContain("go oder java");
  });
});

describe("policy patterns", () => {
  it("compiles every pattern in Unicode mode, so \\p classes work", () => {
    const policy = withPolicy((json) => {
      json.resumeParse.sections.experience = String.raw`^(?:berufserfahrung|experience)(?!\p{L})`;
    });
    const parsed = parseResume(
      "Jane Doe\nBerufserfahrung\nEngineer, Acme 2019 - 2022\nSKILLS\nGo".split("\n"),
      policy,
      NOW,
    );
    expect(parsed.roles).toHaveLength(1);
  });

  it("names a pattern that only the old non-Unicode engine accepted", () => {
    expect(() =>
      withPolicy((json) => {
        json.resumeParse.sections.skills = String.raw`^skills\-and\-tools`;
      }),
    ).toThrow(AtsPolicyError);
    try {
      withPolicy((json) => {
        json.resumeParse.sections.skills = String.raw`^skills\-and\-tools`;
      });
    } catch (error) {
      expect(JSON.stringify((error as AtsPolicyError).issues)).toContain("Unicode mode");
    }
  });

  it("stems with the policy's rules", () => {
    const policy = withPolicy((json) => {
      json.keywordMatch.stemming = [];
    });
    const report = AtsScoringService.check("Jane Doe\nManaging payments.", policy, {
      jobDescription: "Requirements\nmanaged payments",
      now: NOW,
    });
    expect(report.missingKeywords).toContain("managed");
  });
});
