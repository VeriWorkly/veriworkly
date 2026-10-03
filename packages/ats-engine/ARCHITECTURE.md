# Architecture

How `@veriworkly/ats-engine` is built, for someone about to change it. What it does for a user
is in [README.md](./README.md); the rules for changing it are in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Invariants

These hold everywhere, and each has a test:

- **Pure.** A report is a function of (input, policy, options incl. `now`), stamped with
  `report.engine = { version, policy fingerprint }`. `ENGINE_VERSION` equals package.json.
- **No I/O, no global state in the core** (`src/` minus `node/`, `cli/`). Caches are `memo` — a
  WeakMap on the object the value is derived from. `/document`, `/format` and `/job` have no
  dependencies; zod is internal and never exported as a value.
- **Language is data.** Month names, headings, degrees, title and school words, stopwords, verbs
  and injection phrases live in the policy or a locale pack. Policy patterns compile in Unicode
  mode (`policyRegex`); word lists use `wordListPattern` (JS `\b` is ASCII-only). Text is
  normalised once (`normalizeText`: NFKC, digits of every script, invisible characters).
- **Evidence or nothing.** A rule whose evidence is absent (no geometry, no posting) is dropped
  from the report, never passed or failed. Integrity rules are penalties outside the denominator:
  an honest resume scores exactly as if they did not exist.
- **Linear time on hostile input**, with every input bounded (see [SECURITY.md](./SECURITY.md)).
- **AI output is grounded.** Resume text goes to a model as data; every identity value it returns
  must occur in the source. The tuned private policy and prompts never ship; `DEFAULT_POLICY` is
  the community policy.

## The `check()` pipeline

```
AtsScoringService.check(resume, policy, options)                 scoring/engine.ts
 1 prepareResume          input → text, document, hidden chars    input.ts
 2 localizePolicy         languages, region, date order           locales/resolve.ts
 3 readResume             lines, sections (once), parse, context  scoring/context.ts
     readResumeLines      rejoin wrapped lines, read spaced ones  parser/lines.ts
     segmentResume        headings → sections                     parser/sections.ts
     parseReadLines | parseResumeDocument                          parser/, document/parse.ts
     checks               integrity, timeline, skills             checks/
 4 scoreRules             applicable rules → results, score       scoring/score.ts, rules.ts
 5 computeJobMatch        posting terms, alternatives, weights    matching/jobMatch.ts
 6 judgeRequirements      per-requirement status and evidence     matching/requirements.ts
 7 assemble               fixes, strengths, categories, stamp     scoring/engine.ts
```

## Layout

One responsibility per folder. Files are kept near or under ~250 lines; the exceptions are data
(`policy/default/rules.ts`, `locales/packs/de.ts`), the JSON Resume field mapping, and
`matching/requirements.ts`.

| Folder                   | Holds                                                                                                                                                                                                                                                     | Public as              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `index.ts`, `version.ts` | root re-exports, `ENGINE_VERSION`                                                                                                                                                                                                                         | `.`                    |
| `types.ts`, `types/`     | report types; `types/parsed.ts` (recovered record, ISCED, provenance), `types/layout.ts` (geometry signals)                                                                                                                                               | `.`                    |
| `input.ts`               | `prepareResume`: kind of input, flattening, size guards                                                                                                                                                                                                   | `.`                    |
| `text/`                  | `text.ts` normalisation, word lists, tokens, stemming, bullets; `characters.ts` invisible and tag characters                                                                                                                                              | internal               |
| `policy/`                | `schema.ts` (assembles `schema/rules`, `schema/resumeParse`, `schema/keywordMatch`, `schema/text`), `default.ts` (assembles `default/rules`, `default/keywordMatch`, `default/resumeParse`), `parse`, `primitives`, `regex`, `fingerprint`, `errors`      | `.`                    |
| `parser/`                | `lines`, `sections`, `dates`, `experience` (roles), `education` (ISCED), `contact` (name, email, date of birth), `phone`, `record` (derived fields, provenance), `tenure`, `index`                                                                        | `.` (`parseResume`)    |
| `checks/`                | `integrity/text` (injection, homoglyphs, copied posting, stuffing), `timeline`, `skills`, `finding`                                                                                                                                                       | internal               |
| `scoring/`               | `engine` (pipeline), `context` (what rules read), `score` (arithmetic), `rules` (per-kind evaluation and applicability), `categories`, `rubric`, `verdict`                                                                                                | `.`                    |
| `matching/`              | `vocabulary` (terms, synonyms, phrases), `alternation` ("Go or Java"), `jobSections`, `jobMatch`, `requirements`                                                                                                                                          | internal               |
| `locales/`               | `schema`, `resolve` (attach, detect, region, date order), `packs/` (`de`, `hi`, `regions`)                                                                                                                                                                | `/locales`             |
| `document/`              | structured input: `types`, `render`, `jsonResume` (public); `schema`, `parse` (internal)                                                                                                                                                                  | `/document`            |
| `report/`, `repair/`     | `shape` (full / restricted); `grounding`, `merge` (AI repair acceptance)                                                                                                                                                                                  | `.`                    |
| `format/`, `job/`        | display helpers; job text from HTML (`html.ts` scanner, `index.ts` JSON-LD)                                                                                                                                                                               | `/format`, `/job`      |
| `ai/`                    | `run` (task runner, retries), `provider`, `http`, `schema`, `redact`, `tasks/`, adapters, `testing/`                                                                                                                                                      | `/ai`, `/ai/*`         |
| `node/`                  | `extract` (formats, normalisation), `pdf` (text + geometry in one pass), `lines` (PDF line assembly), `hidden` + `surroundings` (visibility replay and its grid), `layout` (columns), `docx` (zip, hidden runs, bomb budget), `peer`, `child`, `protocol` | `/node`, `/node/child` |
| `cli/`                   | `ats-engine check`                                                                                                                                                                                                                                        | bin                    |
| `util/`                  | `memo`, `own` (own-property lookup), `hash`                                                                                                                                                                                                               | internal               |

Tests mirror the areas in `tests/`; `tests/audit-2026-10.test.ts` and
`tests/regressions.test.ts` hold one block per fixed defect; `tests/properties.test.ts` holds
generated-input properties; `tests/fixtures/` builds PDFs, DOCX files and the labelled corpus.

## Dependencies

No import cycles, value or type. Value closure per entry (internal modules / runtime externals):

| Entry                                                   | Modules | Externals                                                |
| ------------------------------------------------------- | ------: | -------------------------------------------------------- |
| `.`                                                     |      60 | zod, libphonenumber-js                                   |
| `/document`                                             |       4 | none                                                     |
| `/format`                                               |       2 | none                                                     |
| `/job`                                                  |       3 | none                                                     |
| `/locales`                                              |      21 | zod, libphonenumber-js                                   |
| `/ai`                                                   |      40 | zod, libphonenumber-js                                   |
| `/ai/openai-compatible`, `/ai/anthropic`, `/ai/testing` |     4–5 | none                                                     |
| `/node`                                                 |      11 | node:\*, pdfjs-dist, pdf-parse, mammoth (optional peers) |

Bundle budgets per subpath are enforced by `npm run size`; `npm run smoke` bundles every
runtime-agnostic subpath for the browser and runs the core in a bare V8 context (edge).

## Decisions worth knowing

- **Report prose is English.** Rule evidence and fixes come from the policy; the few strings the
  engine writes into a report (a timeline sample, an ISCED label in a requirement's detail,
  "Present" in a rendered document) are display text, not vocabulary the engine reads.
- **Policy types are inferred from zod.** `AtsEnginePolicy` is `z.infer` of the schema, so the
  published `.d.ts` references zod's types (zod is a dependency, `^4`). Hand-writing the types
  would duplicate the schema; revisit before 1.0 if a zod major changes them.
- **One file per private policy.** Hosts load a policy from one path or one JSON value; the code
  is split by area, the data file is not.
- **PDF text is assembled here**, not by pdf-parse, which loses the gap between a job title and
  its employer; pdf-parse remains for ruled-table detection only.

## Pre-1.0 API plan

Keep: everything exported today. Remove in 1.0: `level`, `highestDegree`, `AtsDegreeLevel`,
`DEGREE_LABELS`. Candidates to rename or make internal at 1.0, decided then rather than churned
now: `AtsScoringService.check` → a `check()` function, `TaskRoute` → `AtsAiRoute`,
`AiEvalCase`/`AiEvalReport` → `AtsAi…`, and the accidental exports `chatCompletionBody`,
`messagesBody`, `localizePolicy`, `parseQuality`, the grounding helpers.
