# @veriworkly/ats-engine

An open, deterministic resume checker: it reads a resume the way an applicant tracking system
does, shows what the ATS would store, and scores how well the resume survives that — with every
rule published, every finding explained, and the same answer every time.

- **What the ATS stores.** Name, contact details, one row per job (title, employer, dates),
  education on the ISCED scale, and skills, each marked with where it came from.
- **A readiness score** from the published [rubric](./RUBRIC.md), by category: parsing, contact,
  structure, content, format — less any integrity deductions.
- **Job match, requirement by requirement.** Each line of a posting's requirements is judged
  met, partly met, missing, or unverifiable, with the resume's own lines as evidence; years of
  experience, degrees and languages are compared, not just matched as words.
- **Integrity.** Hidden text (white, tiny, off-page, covered, invisible), instructions aimed at
  AI screeners, invisible and look-alike characters, a pasted job posting, keyword stuffing —
  found before an employer finds them.
- **More than English.** German and Hindi, and US, German and Indian conventions (dates, phone
  numbers, degrees, whether a photo or a date of birth belongs on the page). See
  [LOCALES.md](./LOCALES.md) to add one.
- **Optional AI** with your own model key: analysis, parse repair and resume conversion. Every
  identity a model returns — a name, an employer, a title, a school, an email, a URL, a skill — is
  checked against the resume's text and dropped if it is not there; parse repair also checks
  each year. Conversion reformats dates and phone numbers, so those are not checked. Free text a
  model writes (an explanation, a summary, a tidied bullet) is advice, not a claim, and is not
  checked. Given a posting, every term a keyword suggestion names must appear in it; without one,
  suggestions are passed through as advice.

No network, no storage and no state in the core: it runs in a browser, at the edge, or on a
server, and a report is a pure function of its input.

## Install

```sh
npm install @veriworkly/ats-engine
# To read PDF and DOCX files on Node:
npm install pdf-parse pdfjs-dist mammoth
```

Node 20.19 or later, or any modern browser or edge runtime for the core.

## Score a resume

```ts
import { AtsScoringService, DEFAULT_POLICY } from "@veriworkly/ats-engine";

const report = AtsScoringService.check(resumeText, DEFAULT_POLICY, {
  jobDescription, // optional: enables job match and requirements
  now: new Date("2026-10-01"), // optional: fix the reference date for reproducible tenure
});

report.readinessScore; // 0–100
report.parsed.roles; // [{ title, employer, start, end, current }]
report.requirements; // [{ text, status: "met" | "partial" | "missing" | "unverifiable", evidence }]
report.failedChecks; // what to fix, ordered by the rubric
report.engine; // { version, policy } — the determinism stamp
```

`resumeText` may also be a structured document (`AtsResumeDocument`, see `/document`) or a JSON
Resume, which is read from its fields instead of parsed.

## Read a file (Node)

```ts
import { extractResume, detectResumeFormat } from "@veriworkly/ats-engine/node";

const format = detectResumeFormat(fileName, mimeType); // "pdf" | "docx" | "text" | null
const { text, layout } = await extractResume(bytes, format!);
const report = AtsScoringService.check(text, DEFAULT_POLICY, { layout });
```

`layout` carries what only the file can show: columns, tables, photos, image-only pages and
hidden text. Without it those rules are left out of the report, never guessed.

## Read more than English

```ts
import { BUILT_IN_LOCALES, withLocales } from "@veriworkly/ats-engine/locales";

const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES); // once, at startup
AtsScoringService.check(resume, policy).locale; // { languages: ["de"], region: "DE" }
```

## AI, with your own key

```ts
import { createAtsAi } from "@veriworkly/ats-engine/ai";
import { anthropic } from "@veriworkly/ats-engine/ai/anthropic";

const ai = createAtsAi({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  routes: { analyze: { model: "claude-sonnet-5-5", maxTokens: 4000 } },
});
const { result } = await ai.analyze({ resumeText, report, jobDescription });
```

`/ai/openai-compatible` works with OpenAI, OpenRouter, Groq, Ollama and vLLM. Prompts can be
overridden per task; resume text is always passed as data, never as instructions.

## Command line

```sh
npx @veriworkly/ats-engine check resume.pdf --job posting.html --text
```

`--json` prints the full report, `--min-score 70` exits 2 below a score (a CI gate), `--region DE`
reads the resume as from Germany, `--text` prints the text in the order an ATS reads it.

## Intended use

This is a tool for **candidates**, to see their own resume as software sees it. It is not built
or validated to decide about other people. Using it to screen, rank or reject applicants may make
it an automated employment decision tool under laws such as New York City Local Law 144, the EU
AI Act (recruitment is high-risk), Illinois HB 3773 and Colorado SB 26-189, which carry bias-audit,
notice and documentation duties this package does not meet for you.

Scores are a measure of how a resume parses and reads, not of a person.

## Subpaths

| Import                                                         | Contents                                           | Runs on                   |
| -------------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| `@veriworkly/ats-engine`                                       | Scoring, parsing, policy, report shaping, rubric   | Anywhere                  |
| `/document`                                                    | Building structured input, JSON Resume             | Anywhere, no dependencies |
| `/format`                                                      | Score bands, labels, date formatting               | Anywhere, no dependencies |
| `/job`                                                         | Job text from a saved posting page (HTML, JSON-LD) | Anywhere, no dependencies |
| `/locales`                                                     | Language and region packs, `withLocales`           | Anywhere                  |
| `/ai`, `/ai/anthropic`, `/ai/openai-compatible`, `/ai/testing` | Model-backed tasks                                 | Anywhere with `fetch`     |
| `/node`, `/node/child`                                         | PDF and DOCX extraction                            | Node                      |

## Methodology

Every rule, its weight and its fix: [RUBRIC.md](./RUBRIC.md), generated from the policy, so it
cannot drift from what actually scores. A report carries `engine.version` and `engine.policy`;
the same input, reference date, engine and policy always give the same report.

`npm run bench` measures field accuracy (name, contact, each role's title, employer, start and
current flag, education, skills) over a labelled corpus of synthetic resumes in English, German,
Hindi and Indian English, in the layouts real resumes use. Add yours to
`tests/fixtures/` — invented people only.

## Stability

The package is 0.x. A change to the report's shape, to the policy schema, or to the score or
recovered fields for the same input is breaking, and is called out as such in
[CHANGELOG.md](./CHANGELOG.md).

Deprecated, and removed in 1.0: `AtsParsedEducation.level`, `AtsParsedResume.highestDegree`,
`AtsDegreeLevel` and `/format`'s `DEGREE_LABELS`. Read `isced` / `highestIsced` and
`ISCED_LABELS` instead.

## More

[SECURITY.md](./SECURITY.md) — limits, prompt-injection handling, reporting a vulnerability ·
[CONTRIBUTING.md](./CONTRIBUTING.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) ·
[LOCALES.md](./LOCALES.md) · MIT licence, third-party notices in [NOTICE](./NOTICE).
