---
"@veriworkly/ats-engine": minor
---

Fixes from the final pre-release review.

**Breaking:** scores, verdicts and recovered fields change for the same input.

- Verdict: a resume that fails an integrity rule of error severity (an instruction to an AI,
  hidden text, a pasted posting) is judged on the lower of its job-match and readiness scores, so
  a gamed match cannot buy a "strong" verdict. Warnings (a stray zero-width space) do not cap it.
- Requirements: degrees offered as alternatives ("Bachelor's or Master's", "BS/MS") require the
  lower one, degrees asked together the higher; a line asking for a degree _or_ years
  ("Bachelor's degree or 4+ years of experience") is met by either, one asking for both only as
  far as both are; "3 to 5 years" and "between 3 and 5 years" ask for 3; a language requirement
  is `missing` only when the resume lists its languages without this one ("Languages: German"),
  else `unverifiable` — a prose mention ("the Chinese market", "UI polish") is not a list.
- Degrees: a bare MS/MA after a comma is a degree when its subject follows ("Stanford
  University, MS in Computer Science") and a state code before a ZIP code, a year, a month and
  year, "USA", "or" or "and" ("Boston MA, 2015", "Chestnut Hill, MA Sep 2014", "Boston, MA or
  willing to relocate"); a bare BS/BA is always a degree.
- Rules whose evidence is absent are dropped, not passed: contact position with no email or
  phone, timeline with no dated role, copied-posting with a posting under 24 words.
- Integrity: a term is stuffing at 15 occurrences and 5% of the other words (was 10 and 3% of
  all words), so a data engineer's "data" is not, and ten terms pasted forty times each are; a
  phone number wrapped in a bidi embedding or isolate (as Word writes it in Arabic and Hebrew
  text) is not an invisible-character trick; a Greek letter drawn like a Latin one beside a
  lowercase Latin letter ("Pythοn") is a look-alike, while "TNFα" and "μmol" are not. A
  year-only end date no longer makes consecutive roles overlap for a year.
- Parsing: dates with a day ("15 March 2020", "March 1, 2020"); job titles that open with a
  section word ("Education Coordinator, Acme"); a lowercase heading after an unpunctuated line;
  headings with a bracketed count ("Experience (10+ Years)"), in sentence case ("Education and
  certifications", "Preferred qualifications") or joined by "und" in German; a
  phone number no longer runs into the next line; ".NET Developer" is not a bullet;
  "Title @ Employer" splits; education keeps the school, not the credential, and ends it at its
  comma ("Harvard University, Cambridge, MA" is "Harvard University").
- Policy and locales: language detection counts distinct words, ignores emails and URLs, and
  reads the resume and posting separately; the default region comes from the resume alone. Bare
  "MS"/"MA" no longer match units, ZIP codes, "Ms." or "MS-Excel"; age limits ("18 years of
  age") are not years of experience; ordinary "clearance" and "sponsorship" are not requirements;
  fewer injection false positives ("100% accuracy", "### System Design"); more German, Hindi and
  Indian credentials and phrasings are read.
- PDF and DOCX hidden text: form XObjects, horizontal scaling, stencil masks, outline text and
  masked images (by their actual pixels) are measured as a viewer draws them; Word table
  shading, nested tables, shading patterns and single-quoted attributes are read, and tracked
  formatting changes are not taken for the live formatting.

API:

- **Breaking:** policies are rejected for duplicate rule ids, a sticky (`y`) flag, or a pattern
  that compiles only without the rule's own flags; `withLocales` rejects packs that cannot be
  combined, naming the field.
- **Breaking:** the policy fingerprint leaves out attached locale packs (it is taken of the
  applied policy, which already contains what they contribute); fingerprints change.
- **Breaking:** `localizePolicy` (and so `check`) throws `AtsPolicyError` for a `region` the
  policy has not attached, instead of ignoring it; the CLI exits 1 with a usage error.
- **Breaking:** an invalid declared document or JSON Resume throws `AtsInputError`; JSON Resume
  lists are cut to the document format's limits, and no cut splits a surrogate pair.
- Policy: `resumeParse.headingConnectors` (default `["and"]`; packs add theirs, `de` adds "und")
  lists the lowercase words a capitalised heading may join its words with.
- `openAiCompatible` takes `maxTokensParameter`, defaulting to
  `max_completion_tokens` for api.openai.com and `max_tokens` elsewhere. Content-part replies,
  single-line fenced JSON and aborts are handled; Anthropic's context-window stop reads as
  `length`.
- AI grounding runs in linear time (a crafted value could take minutes), checks keyword lists
  part by part whatever separates them, matches emails and URLs whole, and rejects
  punctuation-only values; redaction is case-insensitive.
- Linear time on more hostile input: role headers, education lines, links and phone numbers
  ending in long separator runs.
- `/node`: a DOCX that cannot be read throws "The document could not be read as DOCX." with the
  cause attached. The archive is read exactly as JSZip (mammoth's reader) reads it — ZIP64,
  prepended bytes, duplicate names — so the 64 MB expansion budget holds over everything mammoth
  would inflate; an archive JSZip would reject, or whose entries claim more compressed data than
  the file holds, is refused. PDF table detection and the hidden-text replay
  are bounded per page.
