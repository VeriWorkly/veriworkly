# Locales

The engine reads resumes in more than English through **locale packs**: plain data that adds a
language's or a country's vocabulary to whatever policy you score with.

```ts
import { AtsScoringService, DEFAULT_POLICY } from "@veriworkly/ats-engine";
import { BUILT_IN_LOCALES, withLocales } from "@veriworkly/ats-engine/locales";

const policy = withLocales(DEFAULT_POLICY, BUILT_IN_LOCALES); // once, at startup
const report = AtsScoringService.check(resume, policy);
report.locale; // { languages: ["de"], region: "DE" }
```

## How a resume is read

- **English is the base.** The policy's own vocabulary applies to every resume. Language packs
  add to it; they never replace it, because resumes everywhere carry English terms.
- **Languages are detected per resume and per posting**, separately; a pack applies when either
  is written in its language, so a long English posting can't hide a German resume. A pack with
  a `script` applies when that script covers a fair share of the letters. A Latin-script pack
  applies when at least three _different_ `detectionWords` appear and make up 3% of the words,
  so a German company name in an English resume doesn't make the resume German, and neither
  does a surname like "Das". Words inside email addresses and URLs don't count. A blind union
  of every pack would let German stopwords like "die" and "am" eat English keywords.
- **One region applies**, chosen in this order:
  1. The `region` option (any case). A region that is not attached throws `AtsPolicyError`
     naming the attached ones, rather than being dropped; the CLI reports it as a usage error.
  2. The country of a phone number written with a country code.
  3. The `defaultRegion` of a language the _resume_ is written in. A language only the posting
     is written in doesn't choose the region, so a US resume applying to a German posting keeps
     its month-first dates.

  Without a region, a national phone number is still recovered if any attached region reads
  it. The region is not _inferred_ from such a number, because nearly any 10-digit run is a
  valid German or Indian number.

- Pass `languages` or `region` to `check` to override detection. A host that knows the user's
  country should pass it.

## Built-in packs

| Pack | Kind     | Status    | Notes                                                                                                                                 |
| ---- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `de` | language | community | Compounds ("Softwareentwickler"), noun-style bullets count as action verbs, capitals carry no proper-noun signal                      |
| `hi` | language | community | Detected by Devanagari script; verb-final, so action verbs count anywhere in a line                                                   |
| `US` | region   | verified  | Date of birth and photo are warnings                                                                                                  |
| `DE` | region   | community | `DD.MM.YYYY`; Abitur, Diplom (FH = 6, otherwise 7), Meister and staatlich geprüfter Techniker (6); date of birth and photo not judged |
| `IN` | region   | community | `DD/MM/YYYY`; Class X/SSC (2), Class XII (3), B.Com, B.E., MCA, PGDM, MBBS; date of birth and photo not judged                        |

**Status.** `verified` means two things: a named maintainer reads the language natively, and the
pack meets the field-accuracy target (0.95) on its fixture set. `community` means it was
contributed and tested but not signed off. A pack can't verify itself, so `de` and `hi` stay
`community` until a native-speaking maintainer reviews them.

## Writing a pack

A language pack is a fragment of a policy's vocabulary. Every field is optional:

- Lists (`titleWords`, `stopwords`, `openEnded`, …) are added to the policy's lists.
- Patterns (`sections.*`, `degrees.*`, `jobSections.*`) are added as alternatives. `withLocales`
  compiles the combinations, so a named group your pattern shares with the policy's or another
  pack's (a duplicate in one alternation) is an `AtsPolicyError` at startup, not at scoring time.
- Attached packs don't enter the policy fingerprint; the vocabulary they apply to a resume does.

See `src/locales/packs/de.ts` for a complete example. `atsLanguagePackJsonSchema` and
`atsRegionPackJsonSchema` validate a pack written as JSON.

Things to know:

- **Patterns compile in Unicode mode** (`u` flag). `\p{L}` works. An escape that needs no escaping
  is an error, such as `\-` outside a character class.
- **`\b` is ASCII-only** in JavaScript, even in Unicode mode. Word lists are wrapped in Unicode
  boundaries for you. In a raw pattern, use `(?<![\p{L}\p{M}])…(?![\p{L}\p{M}])` instead.
- **Strings are NFKC-normalised** when the pack is attached, and digits of every script read as
  ASCII, exactly as resume text is.
- **Degrees are keyed by ISCED 2011 level** (2–8). Levels are tried highest first, so a pattern
  must not also match a credential of a lower level.
- **Rules, weights and stemming belong to the policy.** A language pack can't change them, because
  a German suffix rule would fold "engineer" into "engine". A region pack may adjust named rules
  (`weight`, `severity`). `weight: 0` turns a rule off for the region.
- **`headingConnectors`** lists the lowercase words a capitalised heading joins its words with
  ("Ausbildung und Weiterbildung"). Without them, any lowercase word after a heading word reads
  as prose, and the heading is missed. Scripts without case don't need them.
- **Credentials are regional, not linguistic.** "Abitur" and "Class XII" go in the region pack,
  because English resumes from those countries carry them too.

## Testing a pack

Add synthetic resumes to `tests/fixtures/locale-resumes.ts`, each with the fields an ATS should
recover. Use invented people and companies, never a real person's resume. `tests/locales.test.ts`
then holds the set to:

- the expected locale;
- every section heading found;
- field accuracy of at least 0.95.

Cover the layouts real resumes in that language use (stacked headers, dates on their own line,
letter-spaced headings), not just one tidy example.
