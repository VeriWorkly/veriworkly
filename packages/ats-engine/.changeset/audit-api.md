---
"@veriworkly/ats-engine": minor
---

API changes from the October 2026 audit:

- **Breaking:** `AtsReport.version` is typed `string` (it always carried the policy's version).
- **Breaking:** policy keyword lists (`stopwords`, `phrases`, `buzzwords`, `synonyms`, `implies`)
  are lower-cased at parse time and may not hold empty strings.
- **Breaking:** `convertResume` grounds skill keywords and project skills; ungrounded ones are
  blanked and reported in `rejected`, like other identity values. `CONVERT_GROUNDING_SKIP`
  entries may use `[]` for any index.
- `LlmUsage` adds optional `cacheReadTokens` and `cacheWriteTokens` (Anthropic and OpenAI-style
  cached prompt tokens), a breakdown of `inputTokens`.
- `AtsLocale` and `AtsLocaleOptions` are exported from the package root.
- `localizePolicy` takes the resume text alone as an optional fourth argument.
