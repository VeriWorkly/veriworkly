# Contributing

Thanks for helping. A few rules keep this engine something people can trust with their resume.

## Setup

```sh
npm ci
npm run check   # build, types, lint, tests, bundle sizes, browser/edge smoke, pack
```

Node 20.19 or later. `npm run bench` prints field accuracy over the labelled corpus.

## The rules

1. **A failing test first.** Every bug fix starts with a test that fails without it and stays as a
   regression. Every behaviour change says, in the test, what it protects.
2. **Language lives in data.** No month name, heading, title word or stopword in source: they
   belong in the policy (`src/policy/default/`) or a locale pack (`src/locales/packs/`). Policy
   patterns compile in Unicode mode; word lists go through `wordListPattern` (JS `\b` is
   ASCII-only).
3. **Linear time.** Any new regex over input must be linear on adversarial input. Add your shape
   to the adversarial suites if it is new. No nested quantifiers over the same characters; bound
   repetition; prefer a scan to a clever pattern.
4. **No I/O, no globals in the core.** Caches are `memo` (a WeakMap on the object the value comes
   from), never module-level maps keyed by strings.
5. **Pure reports.** A report is a function of (input, policy, options incl. `now`). Anything that
   reads the clock takes `now`.
6. **Rules without evidence are dropped**, never passed or failed. Integrity rules are penalties
   outside the denominator: an honest resume must score exactly as if they did not exist.
7. **Edits with backslashes** (regexes, `String.raw`) are made in an editor, not with `sed`.

## Changes users can see

Run `npm run changeset`. A change to the report's shape, the policy schema, or the score or
recovered fields for the same input is **breaking** (see `.changeset/README.md`). If the community
policy changes, `npm run rubric` regenerates RUBRIC.md and its fingerprint.

## Locale packs

See [LOCALES.md](LOCALES.md): packs are data, held to a field-accuracy target on synthetic
fixtures in `tests/fixtures/locale-resumes.ts` — invented people only.

## Layout

See [ARCHITECTURE.md](ARCHITECTURE.md).
