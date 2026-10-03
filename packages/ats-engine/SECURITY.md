# Security

## Reporting a vulnerability

Email **grievance@veriworkly.com** with a description, a reproducing input, the potential impact
and the version (`ENGINE_VERSION`). Please do not open a public issue. We acknowledge within
24–48 hours, keep you updated while we investigate, and fix as quickly as the severity calls for;
a security advisory may follow, crediting you if you want. Good-faith research under this policy
is authorised. There is no paid bug bounty.

Only the latest minor release receives security fixes while the package is 0.x.

## What the package defends against

The engine is built to take input from anyone: a resume, a posting, a web page, an uploaded
file. These are the guarantees, each held by a test.

**Time.** Every pattern over untrusted text is linear. A 50 KB adversarial input in any of 50
shapes (letter runs, digit runs, unclosed tags, comma lists, mixed scripts…), placed in the name
line, a bullet and the posting at once, scores in tens of milliseconds under the community policy
with every locale pack applied (`tests/adversarial.test.ts`, which fails past 1.5 s). Patterns in a _policy_ or a _pack_
are operator-supplied: `parseAtsPolicy` checks that they compile, not that they are linear, so
review a policy's patterns as you would code — `tests/regressions.test.ts` re-runs the
adversarial suite against a private policy when one is present.

**Size.** Resume text is cut at 50 000 characters, postings at 20 000, a structured document is
bounded in depth, array length and node count before it is validated, a DOCX may expand to at
most 64 MB, and PDF text reading stops at the cap. A host should still bound request bodies.

**Crashes.** Words from the input are never used as plain-object keys, JSON-LD is read to a fixed
depth, and malformed PDF or DOCX structure degrades to "not measured" rather than throwing past
the extractor. PDF parsing itself (pdf.js) is CPU-bound: run `/node` extraction in the forkable
`/node/child` process with a timeout and a memory limit, so a pathological file costs a killed
process, not a worker.

**Prompt injection (`/ai`).** Resume and posting text are passed to the model as JSON data, with a
system prompt that says so, never as instructions. That lowers the risk; no prompt removes it.
What does not depend on the model:

- Every identity value a task returns (names, employers, titles, schools, email addresses, URLs,
  skills) must occur in the source text, and is dropped and reported in `rejected` if it does not.
  Dates in parse repair must name a year the text contains.
- Free text a model writes (an explanation, a recommendation) is advice and is not grounded:
  show it as the model's words, not as facts about the candidate.
- `analyze` redacts the name, email, phone and links before the request leaves (postal addresses
  are not recognised). Parse repair and conversion must see contact details and do not redact.
- The deterministic integrity rules flag instructions aimed at an AI screener inside the resume,
  including text smuggled in Unicode tag characters or PDF metadata.

**State.** The core holds no global state, does no I/O and makes no network calls; only `/ai`
calls the provider you configure, and only `/node` reads files you pass it.
