import { describe, expect, it, vi } from "vitest";

vi.mock("#services/ats/enginePolicy", async () => {
  const { DEFAULT_POLICY } = await import("@veriworkly/ats-engine");
  return { getAtsEnginePolicy: () => DEFAULT_POLICY };
});

const { ATS_DOCUMENT_FORMAT } = await import("@veriworkly/ats-engine");
const { AtsScoringService } = await import("#services/ats/scoring");
const { ApiError } = await import("#lib/errors");
const { atsCheckSchema } = await import("#validators/atsValidator");

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

describe("file advice through the check request", () => {
  const text = [
    "Jane Doe",
    "jane.doe@example.com | (415) 555-0142",
    "Experience",
    "Senior Engineer, Acme Corporation",
    "Jan 2020 - Present",
    "- Built the payments ledger in Go, cutting failures 40%.",
  ].join("\n");

  it("keeps the uploaded file's name and size, and the 0.3 layout fields", () => {
    const input = atsCheckSchema.parse({
      resume: text,
      layout: { columnRatio: 0, tableCount: 0, pageCount: 1, trackedChanges: 3, comments: 1 },
      file: { name: "Resume_final_v3 (2).docx", bytes: 48_000 },
    });
    expect(input.layout).toMatchObject({ trackedChanges: 3, comments: 1 });
    expect(input.file).toEqual({ name: "Resume_final_v3 (2).docx", bytes: 48_000 });
  });

  it("refuses an oversized name or a negative size", () => {
    expect(() => atsCheckSchema.parse({ resume: text, file: { name: "x".repeat(256) } })).toThrow();
    expect(() => atsCheckSchema.parse({ resume: text, file: { bytes: -1 } })).toThrow();
  });

  it("returns the advice they produce, and the same score without them", () => {
    const layout = { columnRatio: 0, tableCount: 0, pageCount: 1, trackedChanges: 3 };
    const withFile = AtsScoringService.check(text, {
      layout,
      file: { name: "Resume_final_v3 (2).docx", bytes: 48_000 },
    });
    const ids = withFile.advice.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["file.name", "file.trackedChanges"]));
    expect(withFile.readinessScore).toBe(AtsScoringService.check(text, { layout }).readinessScore);
  });
});
