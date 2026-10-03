import { describe, expect, it, vi } from "vitest";

vi.mock("#services/ats/enginePolicy", async () => {
  const { DEFAULT_POLICY } = await import("@veriworkly/ats-engine");
  return { getAtsEnginePolicy: () => DEFAULT_POLICY };
});

const { ATS_DOCUMENT_FORMAT } = await import("@veriworkly/ats-engine");
const { AtsScoringService } = await import("#services/ats/scoring");
const { ApiError } = await import("#lib/errors");

describe("AtsScoringService (server wrapper)", () => {
  it("turns an invalid structured document into a 400 naming the field", () => {
    const broken = { format: ATS_DOCUMENT_FORMAT, basics: { name: 42 }, sections: [] };

    expect(() => AtsScoringService.prepare(broken)).toThrow(ApiError);
    try {
      AtsScoringService.prepare(broken);
    } catch (error) {
      expect((error as InstanceType<typeof ApiError>).statusCode).toBe(400);
      expect((error as Error).message).toContain("basics.name");
    }
  });

  it("scores a structured document from its fields", () => {
    const report = AtsScoringService.check({
      format: ATS_DOCUMENT_FORMAT,
      basics: { name: "Jane Doe", email: "jane@example.com" },
      sections: [
        {
          kind: "experience",
          title: "Experience",
          items: [{ title: "Engineer", employer: "Acme", start: "2020-01", current: true }],
        },
      ],
    });

    expect(report.parsed.roles[0]).toMatchObject({ employer: "Acme", current: true });
    expect(report.parsed.provenance.roles).toBe("structured");
  });

  it("accepts a prepared resume without reading it again", () => {
    const prepared = AtsScoringService.prepare("Jane Doe\njane@example.com\nExperience");
    expect(AtsScoringService.check(prepared)).toEqual(
      AtsScoringService.check("Jane Doe\njane@example.com\nExperience"),
    );
  });
});
