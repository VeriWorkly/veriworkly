import { describe, expect, it } from "vitest";

import {
  extractJobPosting,
  jobHtmlToText,
  jobTextFromHtml,
  MAX_JOB_TEXT_CHARS,
} from "../src/job/index.js";

const page = (head: string, body: string) =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

describe("jobHtmlToText", () => {
  it("keeps headings and bullets as lines", () => {
    const html = page(
      "<title>Job</title>",
      "<h1>Senior Engineer</h1><h2>Requirements</h2><ul><li>Go</li><li>Kubernetes</li></ul><p>Remote <b>OK</b>.</p>",
    );
    expect(jobHtmlToText(html)).toBe(
      "Job\nSenior Engineer\nRequirements\n• Go\n• Kubernetes\nRemote OK .",
    );
  });

  it("drops scripts, styles, comments and other invisible content", () => {
    const html = page(
      "<style>.x{color:red}</style><script>var job = '<p>fake</p>';</script>",
      "<!-- hidden <p>no</p> --><noscript>Enable JS</noscript><svg><text>logo</text></svg><p>Visible</p>",
    );
    expect(jobHtmlToText(html)).toBe("Visible");
  });

  it("decodes named and numeric entities", () => {
    expect(
      jobHtmlToText("<p>R&amp;D &ndash; caf&eacute; &#233; &#x2014; &#39;ok&#39; &nbsp;x</p>"),
    ).toBe("R&D – caf&eacute; é — 'ok' x");
  });

  it("treats an unclosed tag as the end of the text", () => {
    expect(jobHtmlToText("<p>Real text</p><div class='unterminated")).toBe("Real text");
  });

  it("caps the output", () => {
    expect(jobHtmlToText(`<p>${"word ".repeat(10_000)}</p>`)).toHaveLength(MAX_JOB_TEXT_CHARS);
  });

  /**
   * The server fetches attacker-chosen pages of up to 2 MB. The regex this replaced took 660 ms
   * on 40 KB of `<` and grows quadratically; every input here is the full 2 MB, on which that
   * would take the better part of an hour. The budget is loose on purpose: a linear pass takes
   * well under a second, and a tight one only measures how busy the CI runner is.
   */
  it.each([
    ["unclosed angle brackets", "<".repeat(2_000_000)],
    ["unclosed script tags", "<script>".repeat(250_000)],
    ["unclosed comments", "<!--".repeat(500_000)],
    ["a million tiny tags", "<a>x".repeat(500_000)],
    ["unterminated entities", "&amp".repeat(500_000)],
  ])("stays linear on %s", (_label, input) => {
    const started = performance.now();
    jobHtmlToText(input);
    jobTextFromHtml(input);
    expect(performance.now() - started).toBeLessThan(5_000);
  });
});

describe("extractJobPosting", () => {
  const ld = (data: unknown) =>
    `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

  it("reads a JobPosting's title, company, description and requirements", () => {
    const html = page(
      ld({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: "Platform Engineer",
        hiringOrganization: { "@type": "Organization", name: "Northwind" },
        description: "<p>Build the platform.</p><ul><li>Go</li><li>Kubernetes</li></ul>",
        qualifications: "5+ years of Go",
        skills: ["Terraform", "PostgreSQL"],
      }),
      "<nav>Home · Jobs · Login</nav><p>Similar jobs…</p>",
    );

    expect(extractJobPosting(html)).toEqual({
      title: "Platform Engineer",
      company: "Northwind",
      description: "Build the platform.\n• Go\n• Kubernetes",
      requirements: ["5+ years of Go", "Terraform\nPostgreSQL"],
    });
  });

  it("finds a posting inside @graph, with @type given as an array", () => {
    const html = page(
      ld({
        "@graph": [
          { "@type": "WebPage", name: "Careers" },
          { "@type": ["JobPosting"], title: "Analyst", description: "Analyse things." },
        ],
      }),
      "",
    );
    expect(extractJobPosting(html)).toMatchObject({
      title: "Analyst",
      description: "Analyse things.",
    });
  });

  it("unescapes a description that was HTML-escaped once more", () => {
    const html = page(
      ld({
        "@type": "JobPosting",
        title: "Dev",
        description: "&lt;p&gt;Ship &amp;amp; test&lt;/p&gt;",
      }),
      "",
    );
    expect(extractJobPosting(html)?.description).toBe("Ship & test");
  });

  it("skips broken JSON-LD and pages without a posting", () => {
    expect(
      extractJobPosting(page('<script type="application/ld+json">{nope</script>', "")),
    ).toBeNull();
    expect(extractJobPosting(page(ld({ "@type": "Organization", name: "X" }), ""))).toBeNull();
    expect(
      extractJobPosting(page(ld({ "@type": "JobPosting", title: "No description" }), "")),
    ).toBeNull();
  });
});

describe("jobTextFromHtml", () => {
  it("prefers the structured posting over the page's visible text", () => {
    const description =
      "Build batch and streaming pipelines in Spark and Kafka, own data quality checks, and " +
      "work with analysts on the warehouse model. Three years of Python or Scala required, " +
      "and experience running Airflow in production is a strong plus.";
    const html = page(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        title: "Data Engineer",
        description,
      })}</script>`,
      "<nav>Sign in</nav><footer>© Example</footer>",
    );
    expect(jobTextFromHtml(html)).toBe(`Data Engineer\n${description}`);
  });

  it("falls back to the visible text", () => {
    expect(jobTextFromHtml(page("", "<h1>Role</h1><p>Details</p>"))).toBe("Role\nDetails");
  });
});
