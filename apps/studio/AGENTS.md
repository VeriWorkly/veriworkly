<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Studio rules

Read [`README.md`](README.md) for the architecture, env vars and test commands. These rules come from bugs that shipped. Break one only with a test that shows why.

## Data

- **Storage owns the sync block.** Editors save content through `LocalStorageService.saveDocument`; it keeps the stored `sync` fields. Only `patchSync`, the bulk sync toggles, keep-local-only and a finished sync change them. An editor's copy of `sync` is stale the moment the worker records a cloud id or revision.
- **Storage parses leniently.** `resume-storage-schema.ts` checks shape, never content: a half-typed email, phone or date must still save. Strict rules run only in the editor's validation and at export.
- **Sample data is for guests only.** The fictional content in `default-resume.ts` and `cover-letter/defaults.ts` is the fallback only for a guest with no profile. A signed-in user's document starts blank or from their Master Profile, and gets sample content only when they pick "sample" (`NewDocumentSource`). Never fall back to it for them: whatever it holds is saved and synced as theirs.
- **No silent failures.** An error reaches the user with its real message or throws to an error boundary. Return `{ ok: false, ... }` where the code already does.
- **Autosave runs on every keystroke** (300 ms debounce). Keep whole-document work off that path.

## Templates and export

- **One keep-together rule.** `templates/resume/shared/keep-together.ts` decides where sections and items may break, for both `web.tsx` and `pdf.tsx`. Never add a page-break rule to only one of them.
- **One source per export.** `buildResumeSections` and `getCoverLetterState` decide what is printed. Every format (preview, PDF, DOCX, HTML, Markdown, text) reads from them; never filter hidden sections or placeholders in a single exporter.
- **One set of print rules.** Every exported HTML file (the resume's WYSIWYG and generated exports, each cover letter template) gets `@page`, colour printing, break rules and the print media query from `documentPrintCss` in `templates/shared/print-styles.ts`. A template writes only its own look. `print-styles.contract.test.ts` fails on a hand-written `@page`.
- **The share page shows the editor's pages.** `ResumeCanvas` renders the template through `ResumePagedPreview`, so the share page, the editor and the PDF break pages in the same place. The parity suite checks all of them, plus the printed HTML export, page by page.
- **Exporters load per format.** `registry.tsx` and `resume-exporters.tsx` / `cover-letter-exporters.tsx` reach each exporter through a dynamic `import()`. A static import pulls `@react-pdf/renderer` or `docx` into the editor bundle.

## Server and auth

- **Every backend call from a server render goes through `lib/server-fetch.ts`.** It forwards cookies, `Origin` and the visitor IP (with `INTERNAL_API_KEY`), times out, and throws on failure. Do not write another `fetch` with cookie forwarding.
- **Only 401 and 403 mean signed out.** Any other failure is an outage and throws to an error boundary. Never show an outage as a guest, an empty account, "0 keys" or a join button.
- **Payments are admin-only in production.** The API answers 403 to other users; show the "Payments open soon" notice, not a raw error.

## Tests

- **Tests first.** For a bug, add the failing test to the matching `tests/contracts/*.contract.test.ts`, watch it fail, then fix. Name the finding id in the test name.
- **Claims are tested.** `claims.contract.test.ts` checks `public/llms.txt` and `public/.well-known/agent.json` against the routes and template registries. `env-example.contract.test.ts` checks that `.env.example` lists every variable the code reads.
- **Browser and parity runs use port 4311 and `localhost`.** Never `127.0.0.1`: the page renders but never hydrates. One dev server per checkout. If 4311 is busy, someone else is using it; wait, do not kill it. `PARITY_ORIGIN` reuses a running server on purpose.

## Do not refactor

Each of these looks redundant and is not:

- the dynamic `import()` calls in `features/documents/core/registry.tsx` and the exporters, and `export-dispatcher.tsx` having no heavy static imports
- the re-export file `features/resume/services/resume-service.ts`
- `createElement` in `ResumeEditor.tsx` (the template is chosen at runtime)
- the append-only DOM probe and the `document.fonts.ready` wait in `ResumePagedPreview.tsx`
- `patchSync` in `LocalStorageService`, and the bounded concurrency in `syncAllPending`
- `SectionAccordion` mounting a panel only while it is open
- the `NODE_ENV` guard on `app/(main)/pdf-debug` and `app/parity`
