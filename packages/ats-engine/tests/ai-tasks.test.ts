import { describe, expect, it } from "vitest";

import { createAtsAi } from "../src/ai/index.js";
import { createRedaction } from "../src/ai/redact.js";
import { scriptedProvider } from "../src/ai/testing/index.js";
import { DEFAULT_POLICY } from "../src/policy/default.js";
import { AtsScoringService } from "../src/scoring/engine.js";
import type { AtsReport } from "../src/types.js";

const route = { model: "m", maxTokens: 100 };
const routes = { analyze: route, repairParse: route, convertResume: route };

const RESUME = [
  "Jane Doe",
  "jane.doe@example.com | (415) 555-0199 | linkedin.com/in/janedoe",
  "",
  "Experience",
  "Senior Engineer, Acme Corporation",
  "Jan 2020 - Present",
  "- Built payment systems in TypeScript, cutting failures 40%.",
].join("\n");
const JOB = "We need TypeScript, Kubernetes and payments experience.";

function report(): AtsReport {
  return AtsScoringService.check(RESUME, DEFAULT_POLICY, { jobDescription: JOB });
}

const insights = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    explanation: "",
    missingEvidence: [],
    keywordOpportunities: [],
    recommendedImprovements: [],
    priorityOrder: [],
    ...overrides,
  });

function userMessage(provider: ReturnType<typeof scriptedProvider>) {
  return JSON.parse(provider.calls[0]!.messages[0]!.content) as {
    deterministicReport: AtsReport;
    resume: string;
    jobDescription: string | null;
  };
}

describe("analyze", () => {
  it("withholds contact details from the model and restores them in the reply", async () => {
    const parsed = report().parsed;
    expect(parsed.email).toBe("jane.doe@example.com"); // the fixture parses as intended

    const provider = scriptedProvider(
      insights({ recommendedImprovements: ["Put [NAME] and [EMAIL_1] at the top."] }),
    );
    const ai = createAtsAi({ provider, routes });
    const outcome = await ai.analyze({ resumeText: RESUME, report: report(), jobDescription: JOB });

    const sent = provider.calls[0]!.messages[0]!.content;
    for (const detail of ["Jane Doe", "jane.doe@example.com", parsed.phone])
      expect(sent).not.toContain(detail);
    expect(userMessage(provider).resume).toContain("[EMAIL_1]");
    expect(userMessage(provider).deterministicReport.parsed.name).toBe("[NAME]");
    expect(outcome.result.recommendedImprovements).toEqual([
      "Put Jane Doe and jane.doe@example.com at the top.",
    ]);
  });

  it("sends contact details when redaction is switched off", async () => {
    const provider = scriptedProvider(insights());
    const ai = createAtsAi({ provider, routes, redact: { analyze: false } });
    await ai.analyze({ resumeText: RESUME, report: report() });
    expect(userMessage(provider).resume).toBe(RESUME);
  });

  it("keeps keyword suggestions that point at the posting and drops the rest", async () => {
    const provider = scriptedProvider(
      insights({
        keywordOpportunities: [
          "Kubernetes",
          "Add Kubernetes to your skills section",
          "payments experience",
          "Blockchain",
        ],
      }),
    );
    const ai = createAtsAi({ provider, routes });
    const outcome = await ai.analyze({ resumeText: RESUME, report: report(), jobDescription: JOB });

    expect(outcome.result.keywordOpportunities).toEqual([
      "Kubernetes",
      "Add Kubernetes to your skills section",
      "payments experience",
    ]);
    expect(outcome.rejected).toEqual([{ path: "keywordOpportunities[3]", value: "Blockchain" }]);
  });

  it("does not filter keyword suggestions when there is no posting to check them against", async () => {
    const provider = scriptedProvider(insights({ keywordOpportunities: ["Blockchain"] }));
    const ai = createAtsAi({ provider, routes });
    const outcome = await ai.analyze({ resumeText: RESUME, report: report() });

    expect(outcome.result.keywordOpportunities).toEqual(["Blockchain"]);
    expect(userMessage(provider).jobDescription).toBeNull();
  });

  it("caps the job description it sends", async () => {
    const provider = scriptedProvider(insights());
    const ai = createAtsAi({ provider, routes });
    await ai.analyze({ resumeText: RESUME, report: report(), jobDescription: "x".repeat(30_000) });
    expect(userMessage(provider).jobDescription).toHaveLength(20_000);
  });
});

describe("redaction", () => {
  const parsed = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "415 555 0199",
    links: [],
    roles: [],
  };

  it("does not sweep date ranges that look like phone numbers", () => {
    const redaction = createRedaction(parsed, "2019 - 2023");
    expect(redaction.apply("Acme, 2019 - 2023")).toBe("Acme, 2019 - 2023");
  });

  it("catches email addresses the parser did not extract", () => {
    const redaction = createRedaction(parsed, "Refs: boss@corp.example.org");
    expect(redaction.apply("Refs: boss@corp.example.org")).toBe("Refs: [EMAIL_2]");
  });

  it("never replaces a value too short to be safe", () => {
    const redaction = createRedaction({ ...parsed, name: "Al" }, "");
    expect(redaction.apply("Algorithms")).toBe("Algorithms");
  });

  it("round-trips nested values", () => {
    const redaction = createRedaction(parsed, "");
    const value = { a: ["Jane Doe", { b: "call 415 555 0199" }], n: 3 };
    expect(redaction.restore(redaction.apply(value))).toEqual(value);
  });
});

describe("repairParse", () => {
  const SOURCE = "Jane Doe\nSenior Engineer, Acme Corporation\nJan 2020 - Present\n";
  const empty = AtsScoringService.check("x", DEFAULT_POLICY).parsed;

  it("fills empty fields with grounded values and reports the ungrounded ones", async () => {
    const provider = scriptedProvider(
      JSON.stringify({
        name: "Jane Doe",
        roles: [
          {
            title: "Senior Engineer",
            employer: "Initech",
            start: { year: 2020, month: 1 },
            end: null,
            current: true,
          },
        ],
      }),
    );
    const ai = createAtsAi({ provider, routes });
    const outcome = await ai.repairParse({ resumeText: SOURCE, report: { parsed: empty } });

    expect(outcome.result.name).toBe("Jane Doe");
    expect(outcome.result.provenance.name).toBe("ai");
    expect(outcome.result.roles[0]).toMatchObject({ title: "Senior Engineer", employer: "" });
    expect(outcome.rejected).toEqual([{ path: "roles[0].employer", value: "Initech" }]);
  });

  it("sends the document as data inside a JSON envelope, without redaction", async () => {
    const provider = scriptedProvider(JSON.stringify({ name: "Jane Doe" }));
    const ai = createAtsAi({ provider, routes });
    await ai.repairParse({ resumeText: SOURCE, report: { parsed: empty } });

    const sent = JSON.parse(provider.calls[0]!.messages[0]!.content);
    expect(sent.resume).toBe(SOURCE);
  });
});

describe("convertResume", () => {
  it("blanks identity values that do not occur in the source and keeps the rest", async () => {
    const provider = scriptedProvider(
      JSON.stringify({
        basics: {
          fullName: "Jane Doe",
          email: "jane@fabricated.example",
          phone: "+1 415 555 0199",
        },
        experience: [
          {
            company: "Acme Corporation",
            role: "Staff Engineer",
            startDate: "2020-01",
            highlights: ["Reworded bullet"],
          },
        ],
      }),
    );
    const ai = createAtsAi({ provider, routes });
    const outcome = await ai.convertResume({ resumeText: RESUME });

    expect(outcome.result.basics).toMatchObject({
      fullName: "Jane Doe",
      email: "",
      phone: "+1 415 555 0199", // normalised downstream, so exempt
    });
    expect(outcome.result.experience[0]).toMatchObject({
      company: "Acme Corporation",
      role: "", // "Staff" is not in the document
      startDate: "2020-01",
      highlights: ["Reworded bullet"],
    });
    expect(outcome.rejected.map((violation) => violation.path)).toEqual([
      "basics.email",
      "experience[0].role",
    ]);
  });
});
