import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY, type AtsRequirement } from "../src/index.js";
import { main } from "../src/cli/main.js";
import { BUILT_IN_LOCALES, localizePolicy, withLocales } from "../src/locales/index.js";
import { degreeLevel } from "../src/parser/education.js";
import { AtsPolicyError } from "../src/policy/errors.js";
import { policyRegex } from "../src/policy/regex.js";

const NOW = new Date("2026-10-01T00:00:00Z");
const P = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);

const resume = ({
  roles,
  education = "",
  extra = "",
}: {
  roles: string;
  education?: string;
  extra?: string;
}) =>
  [
    "Jane Doe",
    "jane@example.com | +1 415 555 0142",
    "Experience",
    roles,
    ...(education ? ["Education", education] : []),
    "Skills",
    "Go, Python, Kubernetes",
    ...(extra ? [extra] : []),
  ].join("\n");

const TEN_YEARS = "Senior Engineer, Acme Corp Jan 2016 - Present\n- Built payment services in Go";
const ONE_YEAR = "Engineer, Acme Corp Jan 2025 - Present\n- Built payment services in Go";
const FOUR_YEARS = "Engineer, Acme Corp Jan 2022 - Present\n- Built payment services in Go";
const BACHELOR = "B.S. Computer Science, State University 2015";

const one = (line: string, text: string, policy = DEFAULT_POLICY) =>
  AtsScoringService.check(text, policy, { jobDescription: `Requirements\n- ${line}`, now: NOW })
    .requirements[0] as AtsRequirement;

/** Time one pattern on hostile inputs: long runs of spaces, digits, letters and separators. */
const HOSTILE = [
  " ".repeat(50_000),
  `1${" ".repeat(50_000)}x`,
  `,${" ".repeat(50_000)}ms`,
  `ms${" ".repeat(50_000)}`,
  `between${" ".repeat(50_000)}1`,
  `1${" ".repeat(50_000)}to`,
  "1".repeat(50_000),
  "a".repeat(50_000),
  ", ms ".repeat(10_000),
  "between 1 and ".repeat(4_000),
  "1 to ".repeat(10_000),
  "ms 1".repeat(12_500),
];
const expectLinear = (pattern: string) => {
  for (const text of HOSTILE) {
    const start = performance.now();
    expect([...text.matchAll(policyRegex(pattern, "gi"))].length).toBeGreaterThanOrEqual(0);
    expect(performance.now() - start, JSON.stringify(text.slice(0, 20))).toBeLessThan(250);
  }
};

describe("R1 a degree or years offered as alternatives is met by either", () => {
  const OR = "Bachelor's degree or 4+ years of relevant experience";

  it("is met by the years alone", () => {
    expect(one(OR, resume({ roles: TEN_YEARS })).status).toBe("met");
  });

  it("is met by the degree alone", () => {
    expect(one(OR, resume({ roles: ONE_YEAR, education: BACHELOR })).status).toBe("met");
  });

  it("is missing with neither", () => {
    expect(one(OR, resume({ roles: ONE_YEAR })).status).toBe("missing");
  });

  it("reads the years first too", () => {
    expect(
      one(
        "5+ years of experience or a Master's degree",
        resume({ roles: ONE_YEAR, education: "M.S. Computer Science, State University 2024" }),
      ).status,
    ).toBe("met");
  });

  it("keeps an alternative inside the degree's field as an AND with the years", () => {
    const line = "Bachelor's in CS or related field and 4+ years of experience";
    expect(one(line, resume({ roles: TEN_YEARS })).status).not.toBe("met");
    expect(one(line, resume({ roles: ONE_YEAR, education: BACHELOR })).status).not.toBe("met");
  });
});

describe("R2 the lowest degree named stands only when the degrees are alternatives", () => {
  it("asks for the Master's when a certificate is asked beside it", () => {
    expect(
      one(
        "Master's degree in Education and a certificate in Special Education",
        resume({ roles: TEN_YEARS, education: "B.A. Psychology, State University 2015" }),
      ),
    ).toMatchObject({ status: "missing", detail: expect.stringMatching(/Master's/) });
  });

  it.each(["Bachelor's or Master's degree in Computer Science", "BS/MS in Computer Science"])(
    "still reads %j as its lowest level",
    (line) => {
      expect(one(line, resume({ roles: TEN_YEARS, education: BACHELOR })).status).toBe("met");
    },
  );
});

describe("R3 a resume lists its languages only on a line that reads as a list of them", () => {
  it.each(["Launched checkout in the Chinese market", "Led UI polish for the checkout"])(
    "leaves a language unverifiable beside %j",
    (line) => {
      expect(one("Fluent in English", resume({ roles: `${TEN_YEARS}\n- ${line}` }), P).status).toBe(
        "unverifiable",
      );
    },
  );

  it.each(["Languages: German (native)", "Languages\nGerman (native)", "Native German speaker"])(
    "is missing a language the list %j leaves off",
    (extra) => {
      expect(one("Fluent in French", resume({ roles: TEN_YEARS, extra })).status).toBe("missing");
    },
  );

  it("stays linear on hostile resume lines", () => {
    for (const line of [" ".repeat(40_000), "a: ".repeat(13_000), `${" ".repeat(40_000)}German`]) {
      const start = performance.now();
      one("Fluent in French", resume({ roles: TEN_YEARS, extra: line }), P);
      expect(performance.now() - start).toBeLessThan(2_000);
    }
  });
});

describe("R4 a bare two-letter degree is told from a state code by what follows it", () => {
  const isced = (line: string) => degreeLevel(line, DEFAULT_POLICY)?.isced ?? null;

  it.each([
    ["Stanford University, MS in Computer Science, 2016", 7],
    ["Stanford University, MS Computer Science, 2016", 7],
    ["University of Chicago, MA Economics, 2015", 7],
    ["Georgia Tech, BS Mechanical Engineering, 2012", 6],
    ["Harvard, MA (Economics), 2015", 7],
    ["B.S. Computer Science, Boston University, Boston MA, 2015", 6],
    ["BS Biology, Tufts University, Medford MA 2016", 6],
    // No state is "BS" or "BA", so those read as degrees wherever they stand, as they always did.
    ["Northeastern University, BS, Computer Science", 6],
    ["Oberlin College, BA, 2014", 6],
    ["BA 2016", 6],
  ])("reads %j at level %i", (line, level) => {
    expect(isced(line)).toBe(level);
  });

  it.each([
    "Tufts University - Medford, MA",
    "Boston, MA 02115",
    "Boston, MA, 2015",
    "Jackson State University, Jackson, MS",
  ])("reads no degree in %j", (line) => {
    expect(isced(line)).toBeNull();
  });

  it("stays linear on hostile input", () => {
    for (const pattern of Object.values(DEFAULT_POLICY.resumeParse.degrees))
      if (pattern) expectLinear(pattern);
  });
});

describe("R5 a range of years joined by a word asks for its lower end", () => {
  it.each(["3 to 5 years of experience with Go", "Between 3 and 5 years of experience with Go"])(
    "reads %j as 3 years",
    (line) => {
      expect(one(line, resume({ roles: FOUR_YEARS }))).toMatchObject({
        status: "met",
        detail: expect.stringMatching(/, 3 asked$/),
      });
    },
  );

  it("does not read a version number beside the years as a range", () => {
    expect(one("Python 3 and 5 years of experience", resume({ roles: FOUR_YEARS })).detail).toMatch(
      /, 5 asked$/,
    );
  });

  it("stays linear on hostile input", () => {
    for (const pattern of localizePolicy(P, "x", { languages: ["de", "hi"], region: "DE" }).policy
      .keywordMatch.requirements.yearsPatterns)
      expectLinear(pattern);
  });
});

describe("R6 an unknown region is an error, not silently ignored", () => {
  it("throws naming the region and the attached ones", () => {
    expect(() => localizePolicy(P, "x", { region: "FR" })).toThrow(AtsPolicyError);
    const message = (() => {
      try {
        localizePolicy(P, "x", { region: "FR" });
      } catch (error) {
        return (error as Error).message;
      }
    })();
    for (const id of ["FR", "DE", "IN", "US"]) expect(message).toContain(id);
    expect(() =>
      AtsScoringService.check(resume({ roles: TEN_YEARS }), P, { region: "FR", now: NOW }),
    ).toThrow(AtsPolicyError);
  });

  it("still accepts an attached region in any case", () => {
    expect(localizePolicy(P, "x", { region: "de" }).locale.region).toBe("DE");
  });

  it("is a usage error in the CLI", async () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (line: string) => void errors.push(line);
    try {
      expect(await main(["check", "resume.txt", "--region", "FR"])).toBe(1);
    } finally {
      console.error = original;
    }
    expect(errors.join("\n")).toMatch(/region.*FR/i);
  });
});

/** Found by the final review. */
describe("final review", () => {
  it("keeps an alternative inside the field of study out of the degree-or-years choice", () => {
    const line =
      "Bachelor's degree in Computer Science, Engineering or a related field, and 3+ years of experience";
    expect(one(line, resume({ roles: ONE_YEAR, education: BACHELOR })).status).toBe("partial");
    const de = localizePolicy(P, "", { languages: ["de"] }).policy;
    expect(
      one(
        "Studium der Informatik oder Mathematik und mindestens 5 Jahre Berufserfahrung",
        resume({ roles: ONE_YEAR, education: "B.Sc. Informatik, TU München 2024" }),
        de,
      ).status,
    ).not.toBe("met");
  });

  it.each([
    "B.S. Computer Science, Boston College, Chestnut Hill, MA Sep 2014 - May 2018",
    "Boston University, Boston, MA USA",
  ])("reads no Master's in the state of %j", (line) => {
    expect(degreeLevel(line, DEFAULT_POLICY)?.isced ?? 0).toBeLessThan(7);
  });

  it("does not take a location for a Master's requirement", () => {
    const req = one(
      "Must be based in Boston, MA or willing to relocate",
      resume({ roles: TEN_YEARS }),
    );
    expect(req.detail ?? "").not.toMatch(/Master/);
  });
});
