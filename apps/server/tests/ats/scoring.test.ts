import { describe, expect, it } from "vitest";

import { AtsScoringService } from "../../src/services/atsScoringService";

describe("ATS deterministic scoring", () => {
  it("returns stable rule ids and never requires AI", () => {
    const report = AtsScoringService.check(
      `Jane Doe jane@example.com (555) 555-1212 linkedin.com/in/jane
      Experience Led product delivery and increased conversion by 25%.
      Education Example University Skills TypeScript React Node.js `.repeat(8),
      "Senior TypeScript product engineer",
    );

    expect(report.version).toBe("ats-v1");
    expect(report.readinessScore).toBeGreaterThan(70);
    expect(report.jobMatchScore).not.toBeNull();
    expect(report.rules.every((rule) => rule.id.startsWith("ats-v1."))).toBe(true);
  });

  it("prioritizes missing parseable content and measurable evidence", () => {
    const report = AtsScoringService.check("Short resume");

    expect(report.readinessScore).toBeLessThan(60);
    expect(report.parsingWarnings).toHaveLength(1);
    expect(report.prioritizedFixes).toContain("Provide a complete text-based resume.");
    expect(report.jobMatchScore).toBeNull();
  });
});
