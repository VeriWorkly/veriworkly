import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ChangelogEntryCard, {
  plainSummary,
} from "@/features/changelog/components/list/ChangelogEntryCard";
import type { ChangelogEntry } from "@/features/changelog/services/changelog-backend";

// @veriworkly/ui loads next/font at import, which only works inside a Next build.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

const SUMMARY =
  "Fixes **export** in `studio` by @Gautam25Raj (#123), see [the docs](https://docs.veriworkly.com) and https://github.com/VeriWorkly/veriworkly/pull/456.";

const entry: ChangelogEntry = {
  id: "v3-31-0",
  version: "3.31.0",
  title: "v3.31.0 - Export fixes",
  summary: SUMMARY,
  type: "minor",
  publishedAt: "2026-10-01T00:00:00Z",
  githubUrl: null,
  added: [],
  improved: [],
  fixed: ["one"],
  breaking: [],
  security: [],
  tags: [],
  prRefs: [],
};

/** The card is one link; a link inside it is split by the HTML parser and breaks hydration (W-101). */
describe("a changelog card in the list", () => {
  it("renders exactly one link, whatever the summary links to", () => {
    const html = renderToStaticMarkup(<ChangelogEntryCard entry={entry} isLatest />);
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('href="/changelog/v3-31-0"');
  });

  it("keeps the summary's words and drops the markdown", () => {
    expect(plainSummary(SUMMARY)).toBe(
      "Fixes export in studio by @Gautam25Raj (#123), see the docs and #456.",
    );
    expect(plainSummary("An *italic* word and snake_case_name stay readable")).toBe(
      "An italic word and snake_case_name stay readable",
    );
  });
});
