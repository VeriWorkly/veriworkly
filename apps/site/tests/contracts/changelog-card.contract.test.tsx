import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ChangelogEntryCard from "@/features/changelog/components/list/ChangelogEntryCard";
import { ChangelogRichText } from "@/features/changelog/components/detail/ChangelogRichText";
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

  it("keeps the inline styling: bold, code and the link look, as spans", () => {
    const card = renderToStaticMarkup(<ChangelogEntryCard entry={entry} isLatest />);
    const inline = renderToStaticMarkup(<ChangelogRichText content={SUMMARY} inline />);

    expect(card).toContain('<strong class="text-foreground font-semibold">export</strong>');
    expect(card).toMatch(/<code class="[^"]*font-mono[^"]*">studio<\/code>/);

    // The inline renderer's markup inside its wrapper, with each <a ...> swapped for a <span class>.
    const asSpans = inline
      .replace(/^<span[^>]*>|<\/span>$/g, "")
      .replace(/<a\b[^>]*?(class="[^"]*")[^>]*>/g, "<span $1>")
      .replace(/<\/a>/g, "</span>");
    expect(asSpans).not.toBe(inline);
    expect(card).toContain(asSpans);
  });
});
