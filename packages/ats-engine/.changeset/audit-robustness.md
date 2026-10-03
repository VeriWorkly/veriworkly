---
"@veriworkly/ats-engine": patch
---

Fixes from the October 2026 audit that change no score on ordinary input:

- A resume or posting containing "constructor" no longer throws; every word-keyed lookup reads
  own properties only.
- Linear time on hostile input: post-nominal credentials after a name (was exponential), DOCX
  tag and image scans (were quadratic and worse), PDF hidden-text replay (grid index), deeply
  nested JSON-LD (depth bound).
- Bounded input: postings are read up to 20 000 characters; a DOCX archive that expands past
  64 MB is refused before it is inflated; PDF text reading stops at the extraction cap.
- Phrase patterns are compiled once per policy and skipped when absent (a 400-phrase policy's
  check is ~40% faster); the resume is segmented once per check.
- `npm pack` no longer ships stale files or source maps without sources.
