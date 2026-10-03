---
"@veriworkly/ats-engine": minor
---

**Breaking:** scores and recovered fields change for the same input (October 2026 audit).

- Integrity: ordinary recruiting and AI-engineering bullets ("act as hiring manager", "ensured
  the candidate is the best fit", "system prompt:") no longer count as prompt injection; the
  default injection phrases now require "this candidate" and an AI-role object for "act as".
- Integrity: a leading byte-order mark is not an invisible character; a location or employment
  line repeated beside each role's dates is not keyword stuffing; white text on a gradient or
  pattern background (PDF) or in a styled Word table is not hidden text.
- Dates: month names are whole words ("Novartis 2018" is no longer November); the community
  policy and the `de` pack list spelled-out months. A policy keyed by abbreviations alone must
  add full names to keep reading "January 2020".
- Dates: a resume whose own numeric dates are unambiguously day-first or month-first has its
  ambiguous ones read the same way.
- Requirements: "proficient in X" is a language requirement only when X is a language
  (`requirements.languageNames`, now defaulting to English language names).
- Parsing: a tab between title and employer survives PDF, DOCX and text extraction; single
  capital-letter skills (R, C) are kept.
- Timeline: a role with a start and no end spans its start month for overlaps, as for tenure.
