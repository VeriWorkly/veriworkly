import { describe, expect, it } from "vitest";
import { parseReleaseBody } from "../../src/services/github/index.js";

describe("GitHub Release Body Parser", () => {
  it("parses release notes with preamble summary, categorized headers, and multi-line bullets", () => {
    const rawMarkdown = `
This release introduces the profile-core workspace package and major UI updates.

### What's Changed
* **@veriworkly/profile-core (new package)**: Shared workspace package containing the canonical MasterProfile Zod schema, normalizer (\`normalizeMasterProfile\`), validator (\`validateMasterProfile\`), v1-to-v2 migration pipeline, and document projections (\`projectToResume\`, \`projectToCoverLetter\`, \`projectToPortfolio\`).
  Common helpers for phone formatting, sanitization, and primitive coercion are also included.
  Studio, Portfolio, and the server now all import from this single source.
* Three new cover letter templates: Minimalist, Executive, and ATS Essential

### Improvements
* Server profileImportService rewritten to use projectToResume from profile-core
* SectionVisibilitySettings panel rewritten with drag-to-reorder

### Bug Fixes
* Fixed corrupt master profile crash in editor

## New Contributors
* @newdev made their first contribution in https://github.com/VeriWorkly/veriworkly/pull/100

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/v3.23.0...v3.24.0
    `;

    const result = parseReleaseBody(rawMarkdown);

    expect(result.summary).toBe(
      "This release introduces the profile-core workspace package and major UI updates.",
    );
    expect(result.added.length).toBe(2);
    expect(result.added[0]).toContain("@veriworkly/profile-core (new package)");
    expect(result.added[0]).toContain("Common helpers for phone formatting");
    expect(result.added[0]).toContain("Studio, Portfolio, and the server now all import");
    expect(result.added[1]).toContain("Three new cover letter templates");

    expect(result.improved.length).toBe(2);
    expect(result.improved[0]).toContain("Server profileImportService rewritten");

    expect(result.fixed.length).toBe(1);
    expect(result.fixed[0]).toBe("Fixed corrupt master profile crash in editor");

    // Should skip contributors and full changelog
    expect(result.added.some((i) => i.includes("made their first contribution"))).toBe(false);
    expect(result.added.some((i) => i.includes("Full Changelog"))).toBe(false);
  });

  it("handles null or empty body", () => {
    const result = parseReleaseBody(null);
    expect(result).toEqual({
      summary: null,
      added: [],
      improved: [],
      fixed: [],
      breaking: [],
      security: [],
    });
  });
});
