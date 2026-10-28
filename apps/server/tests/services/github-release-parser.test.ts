import { describe, expect, it } from "vitest";
import {
  parseReleaseBody,
  samePullRequests,
  unionPullRequests,
  reparseStoredRelease,
  assignPullRequestsToReleases,
  pruneReassignedPullRequests,
} from "../../src/services/github/index.js";

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
      pullRequests: [],
    });
  });

  it("keeps rules, the intro and the PR list out of the change lists", () => {
    // The shape of the real v3.22.0 and v3.29.0 release bodies.
    const rawMarkdown = `
## 🚀 v3.22.0

This release adds profile imports and multi-page portfolios.

---

## Highlights

* LinkedIn and GitHub profile imports

---

## New Features

* **Multi-page portfolios**: Portfolios can now have multiple pages.

---

## Full Changelog

* **#191** — [Feature] [Server/Studio]: add ambassador program
* **#190** — [Refactor] [Server/Studio]: modularize affiliate service

## 🔀 Pull Requests

- **#221** - \`[Chore] [Site]: move to @veriworkly/ats-engine 0.16.0\` by @Gautam25Raj

---
`;

    const result = parseReleaseBody(rawMarkdown);

    expect(result.summary).toBe("This release adds profile imports and multi-page portfolios.");
    expect(result.added).toEqual([
      "LinkedIn and GitHub profile imports",
      "**Multi-page portfolios**: Portfolios can now have multiple pages.",
    ]);
    expect(result.pullRequests).toEqual([
      { number: 191, title: "[Feature] [Server/Studio]: add ambassador program" },
      { number: 190, title: "[Refactor] [Server/Studio]: modularize affiliate service" },
      { number: 221, title: "[Chore] [Site]: move to @veriworkly/ats-engine 0.16.0" },
    ]);
  });

  it("repairs a stored release that was parsed before rules and PR lists were understood", () => {
    const body = `
## v1.0.0

Intro.

---

## Highlights

* Exports

## Full Changelog

* **#12** — [Fix] [Site]: tidy footer
`;
    const repoUrl = "https://github.com/acme/app";
    const author = { login: "dev", avatarUrl: "a.png", htmlUrl: "https://github.com/dev" };

    // What the old parser stored for this body.
    const stored = {
      summary: "---",
      added: ["Exports ---", "**#12** — [Fix] [Site]: tidy footer"],
      improved: [],
      fixed: [],
      breaking: [],
      security: [],
      prRefs: [{ number: 11, title: "Earlier PR", url: `${repoUrl}/pull/11`, author }],
    };

    const update = reparseStoredRelease(body, stored, repoUrl);

    expect(update?.summary).toBe("Intro.");
    expect(update?.added).toEqual(["Exports"]);
    expect(update?.prRefs).toEqual([
      { number: 12, title: "[Fix] [Site]: tidy footer", url: `${repoUrl}/pull/12`, author: null },
      stored.prRefs[0],
    ]);

    // Already clean: nothing to write.
    expect(reparseStoredRelease(body, update!, repoUrl)).toBeNull();
  });

  it("assigns every merged PR to the release it shipped in", () => {
    const author = (login: string) => ({ login, avatarUrl: `${login}.png`, htmlUrl: login });
    const pr = (number: number, mergedAt: string, headRef = "feat/x", baseRef = "master") => ({
      number,
      title: `PR ${number}`,
      url: `https://github.com/acme/app/pull/${number}`,
      author: author(`dev${number}`),
      mergedAt,
      headRef,
      baseRef,
    });

    const assigned = assignPullRequestsToReleases(
      [
        { id: "v1-1-0", publishedAt: "2026-02-01T00:00:00Z", listed: [4] },
        { id: "v1-0-0", publishedAt: "2026-01-01T00:00:00Z", listed: [] },
      ],
      [
        pr(1, "2025-12-20T00:00:00Z"), // before v1.0.0
        pr(2, "2026-01-15T00:00:00Z"), // between the two
        pr(3, "2025-12-21T00:00:00Z", "master", "dev"), // "sync dev from master": left out
        pr(4, "2025-12-22T00:00:00Z"), // merged early, but v1.1.0's notes name it
        pr(5, "2026-03-01T00:00:00Z"), // not released yet
      ],
    );

    expect(assigned.get("v1-0-0")?.map((ref) => ref.number)).toEqual([1]);
    expect(assigned.get("v1-1-0")?.map((ref) => ref.number)).toEqual([4, 2]);
    expect(assigned.get("v1-1-0")?.[0]?.author?.login).toBe("dev4");
  });

  it("V-339: guesses a release only for PRs merged into the default branch, and a release's own list wins", () => {
    const pr = (number: number, mergedAt: string, baseRef = "master") => ({
      number,
      title: `PR ${number}`,
      url: `https://github.com/acme/app/pull/${number}`,
      author: null,
      mergedAt,
      headRef: `feat/${number}`,
      baseRef,
    });

    const assigned = assignPullRequestsToReleases(
      [
        { id: "v1-0-0", publishedAt: "2026-01-01T00:00:00Z", listed: [] },
        { id: "v1-1-0", publishedAt: "2026-02-01T00:00:00Z", listed: [8] },
      ],
      [
        // Merged into a long-lived feature branch: it shipped whenever that branch did.
        pr(7, "2025-12-20T00:00:00Z", "feat/big-rework"),
        // Also merged into the feature branch, but v1.1.0's notes name it.
        pr(8, "2025-12-21T00:00:00Z", "feat/big-rework"),
      ],
    );
    expect(assigned.get("v1-0-0")).toEqual([]);
    expect(assigned.get("v1-1-0")?.map((ref) => ref.number)).toEqual([8]);

    // A stored guess that another release's notes now claim is dropped from this one.
    const stored = [
      { number: 8, title: "PR 8" },
      { number: 6, title: "PR 6" },
    ];
    expect(
      pruneReassignedPullRequests(stored, {
        listedHere: new Set<number>(),
        listedElsewhere: new Set([8]),
      }).map((ref) => ref.number),
    ).toEqual([6]);
    // Named by this release too: it stays.
    expect(
      pruneReassignedPullRequests(stored, {
        listedHere: new Set([8]),
        listedElsewhere: new Set([8]),
      }).map((ref) => ref.number),
    ).toEqual([8, 6]);
  });

  it("fills missing authors without dropping refs, and compares lists by content", () => {
    const withAuthor = {
      number: 7,
      title: "T",
      url: "u7",
      author: { login: "dev", avatarUrl: "a", htmlUrl: "h" },
    };

    const merged = unionPullRequests(
      [
        { number: 7, title: "T", url: "u7", author: null },
        { number: 3, title: "Old" },
      ],
      [withAuthor],
    );

    expect(merged.map((ref) => ref.number)).toEqual([7, 3]);
    expect(merged[0]?.author?.login).toBe("dev");

    // jsonb hands keys back in its own order; that alone is not a change.
    const fromDb = JSON.parse('{"url":"u7","title":"T","author":{"login":"dev"},"number":7}');
    expect(samePullRequests([fromDb], [withAuthor])).toBe(true);
    expect(samePullRequests([fromDb], [{ ...withAuthor, author: null }])).toBe(false);
  });
});

/**
 * V-065: everything after the first bullet that did not start with [A-Z#] used to be glued onto
 * the previous bullet, and GitHub's own "What's Changed" list all landed in `added`.
 */
describe("GitHub Release Body Parser, real-world markdown (V-065)", () => {
  it("splits GitHub's generated notes by PR kind, drops the suffix and records the PR numbers", () => {
    const rawMarkdown = `## What's Changed
* [Feature] [Studio]: add cover letter templates by @Gautam25Raj in https://github.com/VeriWorkly/veriworkly/pull/230
* fix(server): stop double-charging credits by @dev-two in https://github.com/VeriWorkly/veriworkly/pull/231
* [Refactor] [Server]: split billing service by @Gautam25Raj in https://github.com/VeriWorkly/veriworkly/pull/232
* [Security] [Server]: hash share passwords with scrypt by @Gautam25Raj in https://github.com/VeriWorkly/veriworkly/pull/234
* Bump zod from 3.25.0 to 3.25.76 by @dependabot[bot] in https://github.com/VeriWorkly/veriworkly/pull/233

## New Contributors
* @dev-two made their first contribution in https://github.com/VeriWorkly/veriworkly/pull/231

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/v3.30.0...v3.31.0
`;

    const result = parseReleaseBody(rawMarkdown);

    expect(result.added).toEqual(["[Feature] [Studio]: add cover letter templates"]);
    expect(result.fixed).toEqual(["fix(server): stop double-charging credits"]);
    expect(result.improved).toEqual(["[Refactor] [Server]: split billing service"]);
    expect(result.security).toEqual(["[Security] [Server]: hash share passwords with scrypt"]);
    expect(result.pullRequests.map((pr) => pr.number)).toEqual([230, 231, 232, 234, 233]);
    expect(result.pullRequests[0]).toEqual({
      number: 230,
      title: "[Feature] [Studio]: add cover letter templates",
    });
  });

  it("keeps code fences, tables, images, bold sub-headers and <details> out of the bullets", () => {
    const rawMarkdown = [
      "## v3.31.0",
      "",
      "Faster studio and a new billing page.",
      "",
      "![banner](https://user-images.githubusercontent.com/1/banner.png)",
      "",
      "### ✨ Features",
      "",
      "- **Billing page**: see invoices and credit packs",
      "  in one place.",
      "- multi-currency pricing",
      "  - INR and USD at launch",
      "  - EUR later",
      "- 2FA for admin accounts",
      "",
      "**Studio**",
      "",
      "- autosave now waits for typing to pause",
      "",
      "### 🐛 Fixes",
      "",
      "- Fixed the export crash:",
      "",
      "```bash",
      "npm run db:generate",
      "- not a bullet",
      "```",
      "",
      "- 404 on shared links with trailing slashes",
      "",
      "| Endpoint | Before | After |",
      "| --- | --- | --- |",
      "| /documents | 900 ms | 120 ms |",
      "",
      "The share page also loads faster now.",
      "",
      "<details>",
      "<summary>Internal notes</summary>",
      "",
      "- moved the queue to redis",
      "",
      "</details>",
      "",
      "### Breaking changes",
      "",
      "1. `POST /sync` now answers 202",
      "2) the old `/v0` routes are gone",
    ].join("\n");

    const result = parseReleaseBody(rawMarkdown);

    expect(result.summary).toBe("Faster studio and a new billing page.");
    expect(result.added).toEqual([
      "**Billing page**: see invoices and credit packs in one place.",
      "multi-currency pricing: INR and USD at launch; EUR later",
      "2FA for admin accounts",
      "autosave now waits for typing to pause",
    ]);
    expect(result.fixed).toEqual([
      "Fixed the export crash:",
      "404 on shared links with trailing slashes",
      "The share page also loads faster now.",
    ]);
    expect(result.breaking).toEqual([
      "`POST /sync` now answers 202",
      "the old `/v0` routes are gone",
    ]);
    expect(result.improved).toEqual([]);
  });

  it("files a bold sub-header's bullets under the category it names", () => {
    const result = parseReleaseBody(
      [
        "## Release notes",
        "",
        "**Bug fixes**",
        "- crash on save",
        "",
        "**Security**",
        "- rotate keys",
      ].join("\n"),
    );

    expect(result.fixed).toEqual(["crash on save"]);
    expect(result.security).toEqual(["rotate keys"]);
    expect(result.added).toEqual([]);
  });

  it("CRLF bodies parse the same as LF ones", () => {
    const lf = "### Fixed\n- one\n  wrapped\n- two\n";
    expect(parseReleaseBody(lf.replace(/\n/g, "\r\n"))).toEqual(parseReleaseBody(lf));
    expect(parseReleaseBody(lf).fixed).toEqual(["one wrapped", "two"]);
  });
});
