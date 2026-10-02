import { describe, expect, it } from "vitest";

import {
  extractJobPosting,
  jobHtmlToText,
  jobTextFromHtml,
  MAX_JOB_TEXT_CHARS,
  normalizeJobText,
} from "../src/job/index.js";

/** Bugs found in review of `/job`. Each test failed before its fix. */

const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const LONG = "Build and run the data platform. ".repeat(12);

describe("/job regressions", () => {
  it("is not thrown off by text whose lowercase form is longer (İ)", () => {
    const html = `<html><head><title>İstanbul İzmir İnegöl</title>${ld({
      "@type": "JobPosting",
      title: "Mühendis",
      description: LONG,
    })}</head><body><style>p{}</style><p>Kept</p></body></html>`;

    expect(extractJobPosting(html)?.title).toBe("Mühendis");
    expect(jobHtmlToText(html)).toContain("Kept");
  });

  it("survives a huge @graph without overflowing the stack", () => {
    const graph = Array.from({ length: 600_000 }, () => 0);
    graph.push({ "@type": "JobPosting", title: "Deep", description: LONG } as never);
    const html = `<html><head>${ld({ "@graph": graph })}</head><body></body></html>`;

    const started = performance.now();
    expect(extractJobPosting(html)?.title).toBe("Deep");
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("keeps a '<' that does not open a tag", () => {
    expect(jobHtmlToText("<p>Salary <5k for juniors, up to 10k</p><p>Next</p>")).toBe(
      "Salary <5k for juniors, up to 10k\nNext",
    );
    const html = ld({
      "@type": "JobPosting",
      title: "Go dev",
      description: `Must have <3 years of Go. Must know AWS. ${LONG}`,
    });
    expect(extractJobPosting(html)?.description).toContain("Must know AWS");
  });

  it("falls back to the page when the posting's description is only a stub", () => {
    const html = `<html><head>${ld({
      "@type": "JobPosting",
      title: "Engineer",
      description: "See full description below.",
    })}</head><body><h2>Requirements</h2><ul><li>Kubernetes</li><li>Terraform</li></ul></body></html>`;

    expect(jobTextFromHtml(html)).toContain("Kubernetes");
  });

  it("normalises plain job text the same way everywhere", () => {
    expect(normalizeJobText("  Go \t and   Rust \n\n\n Remote  ")).toBe("Go and Rust\nRemote");
    expect(normalizeJobText("x ".repeat(20_000))).toHaveLength(MAX_JOB_TEXT_CHARS);
  });
});
