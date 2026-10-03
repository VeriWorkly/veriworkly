import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";
import { extractResume } from "../src/node/index.js";
import { buildDocxBody } from "./fixtures/buildDocx.js";

/**
 * Word documents: hidden runs, tables and photos read from the document XML, each beside the
 * honest look-alike that must not be flagged. Built deflated, as Word writes them, and stored.
 */

const KEYWORDS = "Kubernetes Terraform Kafka GraphQL Rust";
const p = (props: string, text: string, paragraph = "") =>
  `<w:p>${paragraph}<w:r><w:rPr>${props}</w:rPr><w:t>${text}</w:t></w:r></w:p>`;
const NAME = p("", "Jane Doe, Senior Engineer at Acme");

const measure = async (body: string, deflate = true) =>
  (await extractResume(buildDocxBody(NAME + body, deflate), "docx")).layout!;

describe("hidden runs", () => {
  it.each([
    ["marked hidden", p("<w:vanish/>", KEYWORDS)],
    ["in a 1pt font", p('<w:sz w:val="2"/>', KEYWORDS)],
    ["white on the page", p('<w:color w:val="FFFFFF"/>', KEYWORDS)],
    ["near-white on the page", p('<w:color w:val="F7F7F7"/>', KEYWORDS)],
  ])("finds text %s", async (_, body) => {
    const layout = await measure(body);
    expect(layout).toMatchObject({ hiddenTextChars: 35, hiddenTextSample: KEYWORDS });
  });

  it.each([
    [
      "white on a dark run shading",
      p('<w:color w:val="FFFFFF"/><w:shd w:val="clear" w:fill="1F2937"/>', KEYWORDS),
    ],
    [
      "white on a dark paragraph",
      p(
        '<w:color w:val="FFFFFF"/>',
        KEYWORDS,
        '<w:pPr><w:shd w:val="clear" w:fill="111111"/></w:pPr>',
      ),
    ],
    [
      "white in a dark table cell",
      `<w:tbl><w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr>${p('<w:color w:val="FFFFFF"/>', KEYWORDS)}</w:tc></w:tr></w:tbl>`,
    ],
    ["a hidden flag turned off", p('<w:vanish w:val="0"/>', KEYWORDS)],
    ["grey body text", p('<w:color w:val="595959"/>', KEYWORDS)],
    ["a 9pt footnote", p('<w:sz w:val="18"/>', "Page 1 of 2")],
  ])("does not flag %s", async (_, body) => {
    expect((await measure(body)).hiddenTextChars).toBe(0);
  });

  it("reads stored archives as well as deflated ones", async () => {
    expect((await measure(p("<w:vanish/>", KEYWORDS), false)).hiddenTextChars).toBe(35);
  });

  it("reports it on the resume, quoting it", async () => {
    const { text, layout } = await extractResume(
      buildDocxBody(NAME + p('<w:color w:val="FFFFFF"/>', `${KEYWORDS} ${KEYWORDS}`), true),
      "docx",
    );
    const rule = AtsScoringService.check(text, DEFAULT_POLICY, { layout }).rules.find(
      (r) => r.id === "ats-v2.integrity.hiddenText",
    );
    expect(rule).toMatchObject({ passed: false, scoreImpact: 30 });
    expect(rule?.evidence).toContain("Kubernetes Terraform");
  });
});

describe("tables and photos", () => {
  it("counts layout tables, which extract out of order", async () => {
    const table = `<w:tbl><w:tr><w:tc>${p("", "Left")}</w:tc><w:tc>${p("", "Right")}</w:tc></w:tr></w:tbl>`;
    expect((await measure(table)).tableCount).toBe(1);
  });

  it("counts a photo by its printed size", async () => {
    const drawing = (inches: number) =>
      `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="${inches * 914_400}" cy="${inches * 914_400}"/></wp:inline></w:drawing></w:r></w:p>`;
    expect((await measure(drawing(1.2))).imageCount).toBe(1);
    expect((await measure(drawing(0.3))).imageCount).toBe(0);
  });
});
