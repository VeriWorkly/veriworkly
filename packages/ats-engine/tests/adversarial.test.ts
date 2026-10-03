import { describe, expect, it } from "vitest";

import { AtsScoringService, DEFAULT_POLICY } from "../src/index.js";
import { jobTextFromHtml } from "../src/job/index.js";
import { BUILT_IN_LOCALES, withLocales } from "../src/locales/index.js";

/**
 * Every input shape that has made, or could make, a pattern backtrack: 50 KB of it as the name
 * line, as a bullet and as the posting, under the community policy with every locale pack
 * applied. The ceiling is far above the few milliseconds these take and far below the seconds a
 * super-linear pattern takes. SECURITY.md promises this.
 */

const N = 50_000;
const rep = (unit: string, total = N) =>
  unit.repeat(Math.ceil(total / unit.length)).slice(0, total);

const SHAPES: Record<string, string> = {
  letters: rep("a"),
  capitals: rep("A"),
  "letter-space": rep("a "),
  "digit-space": rep("1 "),
  digits: rep("1"),
  "spaces then x": `1${rep(" ", N - 2)}x`,
  "tabs then x": `1${rep("\t", N - 2)}x`,
  "dot run": rep("a."),
  "Jan run": rep("Jan "),
  "year dash run": rep("2019 - "),
  "year run": rep("2019 "),
  "comma run": rep("a, "),
  "comma caps run": rep("AB, "),
  "post-nominal letters": `Jane Doe, ${rep("AB", 4_000)}!`,
  "post-nominal dots": `Jane Doe, ${rep("AB.", 4_000)}!`,
  "post-nominal commas": `Jane Doe${rep(", AB", 4_000)}!`,
  "dash run": rep("-"),
  "lt run": rep("<"),
  "w-tag run": rep("<w:a "),
  "devanagari run": rep("क"),
  "devanagari words": rep("कार्य "),
  "ignore run": rep("ignore all previous "),
  "at run": rep("x@"),
  "plus years": rep("1+ "),
  "proficient + letters": `proficient in ${rep("a", N - 20)}`,
  "fluent letters": `fluent ${rep("a", N - 10)}`,
  parens: rep("("),
  "o bullets": rep("o "),
  "bullet glyphs": rep("•"),
  "digit dot": rep("1."),
  "plus one": rep("+1 "),
  "www run": rep("www."),
  "umlaut run": rep("Ü"),
  "since run": rep("since "),
  "B.S. run": rep("B.S. "),
  "M. run": rep("M."),
  "dipl run": rep("dipl.-"),
  "ab dash": rep("ab-"),
  "colon run": rep("a: "),
  "slash run": rep("a/"),
  "digit slash": rep("1/"),
  "date-ish": rep("01/02/"),
  "or run": rep("Go or "),
  "x or y commas": `${rep("a, b, ")} or c`,
  "mixed script": rep("aб"),
  "zwj latin": rep("a\u{200D}"),
  "tag chars": rep("\u{E0041}"),
  "hash run": rep("###"),
  "new prompt": rep("new instructions "),
  "rank run": rep("rank this candidate "),
};

const POLICY = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES);
const NOW = new Date("2026-09-30T00:00:00Z");

describe("50 KB adversarial input", () => {
  it.each(Object.entries(SHAPES))("%s, wherever it appears, in bounded time", (_, input) => {
    const resume = `${input}\njane@example.com\nExperience\nEngineer at Acme 2019 - 2022\n- ${input}`;
    const started = performance.now();
    AtsScoringService.check(resume, POLICY, {
      now: NOW,
      jobDescription: `Requirements\n- ${input}`,
      languages: ["de", "hi"],
      region: "DE",
    });
    jobTextFromHtml(`<p>${input}</p>`);
    expect(performance.now() - started).toBeLessThan(1_500);
  });
});
