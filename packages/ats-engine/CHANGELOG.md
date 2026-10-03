# @veriworkly/ats-engine

Release notes are generated from `.changeset/` by `changeset version`. See
[.changeset/README.md](.changeset/README.md) for what counts as breaking.

## 0.1.0

Initial release.

- Reads a resume the way an applicant tracking system does — PDF, DOCX, plain text, JSON Resume
  or the `ats-resume@1` document format — and shows what it would store: contact details, roles,
  education with ISCED levels, skills and months of experience.
- Scores it with a published rubric (`RUBRIC.md`): a readiness score, a job-match score against a
  posting, per-category scores, a verdict, and each posting requirement judged met, partial,
  missing or unverifiable, with the resume's own lines as evidence.
- Integrity checks for tricks aimed at a screener: hidden text in PDF and DOCX, invisible and
  look-alike characters, instructions to an AI, pasted postings and keyword stuffing.
- Deterministic and policy-driven: every rule and word list lives in a validated policy, with
  English as the base and German, Hindi and US, DE and IN region packs.
- Optional AI layer (`/ai`) for insights, parse repair and resume conversion, with redaction
  before sending and every returned value grounded in the source.
- Runs in Node, browsers and edge runtimes; file extraction lives in `/node`.
