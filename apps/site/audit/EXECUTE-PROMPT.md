# Prompt for the session that fixes `apps/site`

> Paste everything below the line into a fresh Claude Code session. It was written on 2026-10-24 after the site audit was re-verified line by line against `d94efe14`.

---

You are taking over `apps/site` (the Next 16 / React 19 marketing site of the VeriWorkly monorepo) to execute an audit that is already complete. Do not re-audit. Read, then fix, in the order the plan gives.

## 1. Read these first, in this order

1. `apps/site/audit/README.md` — the phased plan (Phases 0–4), the operating rules, the status table you will keep updated, and the verification gates. This is the file you execute from.
2. `apps/site/audit/FINDINGS.md` — the register, W-001…W-067 plus the FC-1…16 false-claim list. Every plan item names the W-IDs it closes. Section G at the end is the 2026-10-24 verification pass: it corrects a few earlier lines (W-026 was mis-attributed; the 43.5 KB gz framer core comes from the navbar, W-028) and lists the Next 16.4 features you may use.
3. `apps/site/audit/IMPROVEMENTS.md` — suggestions that are **not** in the plan. Only pick one up if the user asks.
4. `apps/site/audit/data/*.json` — Google Search Console and Bing Webmaster snapshots (gitignored, pulled 2026-10-24). Re-pull with `npm run seo:all` from the repo root; `GSC_KEY_FILE`, `GSC_PROPERTY`, `BING_API_KEY`, `BING_SITE_URL` are already set as user environment variables on this machine (see `scripts/seo-data/README.md`).
5. `seo/` at the repo root (gitignored) — the Search Console CSV exports from 2026-10-15 (coverage, HTTPS, performance, generative-AI features).
6. Memory notes that apply: Playwright's bundled Chromium is blocked on this machine, launch with `channel: "chrome"`; use `localhost` not `127.0.0.1` for any browser measurement; the studio parity harness and Windows dev-server orphans notes if you ever start a dev server (`TaskStop` leaves the node child alive, check the port owner).

## 2. Working-tree rules (important: another session is active in this repo)

- Another Claude session is auditing `apps/docs-platform` and `apps/blog-platform` (read-only) in the same checkout, and the checkout is on branch `fix/openapi-spec-and-generator` with **uncommitted** work that touches `apps/site/next.config.ts`, `apps/site/public/llms.txt`, `apps/site/public/.well-known/agent.json`, `apps/site/README.md` and deletes `apps/site/public/openapi.json`. Those changes are not yours. Do not revert, stash or commit them.
- Work in a **separate git worktree** on a new branch off `master`: `git worktree add ../veriworkly-site -b fix/site-audit master`, then `npm ci --legacy-peer-deps` there from PowerShell (see the npm-install memory note) and run `npm run db:generate` once. If the user prefers the same checkout, create the branch there and avoid the five files above until the openapi branch is merged.
- Never touch `apps/studio`, `apps/server`, `apps/portfolio`, `apps/blog-platform`, `apps/docs-platform` or `packages/*` unless a plan item says so explicitly (Phase 1 item for W-045 needs the server's `/github/issues` query schema; W-054 and W-009 need `apps/server/src/services/productCatalog.ts` as the source of truth, read-only). `packages/ui` changes need the user's ok first.
- Commit per plan item group with the attribution line the harness gives you. Ask before pushing or opening a PR.

## 3. What to do

Execute the plan **in order**: Phase 0 (guardrails) → Phase 1 (SEO and claim correctness; this is what gets the site indexed) → Phase 2 (performance; the user's primary goal) → Phase 3 (AEO/agent readiness) → Phase 4 (correctness and hygiene). Rules from the README apply: smallest failing test first for every HIGH, root-cause fix in one place, no refactors beyond what the item says, `tsc` + `eslint` + `vitest` green after every item, update the README status column and mark each finding in FINDINGS.md with the commit that closed it.

### The SEO/AEO part needs its own report before Phase 1

Before touching Phase 1, write `apps/site/audit/SEO-REPORT.md` from the real data, so the user can see how far the site is from where it should be and what content to add, update or remove. Facts already visible in the 2026-10-24 snapshot that you must explain and act on:

- Indexing state (domain property `sc-domain:veriworkly.com`, coverage export 2026-10-15, last row 2026-10-09): **204 indexed, 258 not indexed**. Ignore the `indexed: 0` values in `gsc-sitemaps.json` — that API field is unreliable; the sitemap rows are still useful for `submitted` counts (site 96 with 14 warnings, blog 23, docs 137, portfolio 9, app 1 error). The not-indexed breakdown in `seo/veriworkly.com-Coverage-Drilldown-2026-10-15*/Table.csv` is your work list: 72 "discovered, never crawled" (every changelog release page, `/compare/enhancv`, `/compare/novoresume`, `/contact`, `/privacy`, 6 template pages, 23 docs pages, 4 blog posts), 74 "crawled, not indexed" (almost all `blog.veriworkly.com/api/og?...` image URLs crawled as pages), 64 "alternate page with proper canonical" (roadmap `?sort=`/`?refresh=` URLs — the roadmap page emits crawlable query-string links), 37 `noindex` (`/stats?...`, roadmap items, some docs pages), 21 blocked by robots (`docs.veriworkly.com/api/v1/*`, `app.`/`portfolio.` editor URLs), 18 hard 404s (`/blog`, `/docs`, `/support`, `/integrations`, `/careers`, `/cookies`, `/partners`, `/tutorials` on the main host = the audit's W-003 footer links; `/templates/executive` soft 404). 90-day totals for `veriworkly.com`: 2,371 impressions, 19 clicks across 128 pages; 843 impressions, 2 clicks across 189 queries. Bing has 0 query and 0 page rows. Fix what is in the site's control (W-001 hard-404 changelog pages, W-003 dead footer links, the roadmap query-string links, canonical and sitemap `lastModified`, the `llms.txt`/robots contradictions) and list what is a Search Console or hosting action for the user (the docs/blog items belong to the other session's audit — do not touch those apps).
- Nearly all impressions land on **blog and docs**, not the marketing site: `blog.veriworkly.com/how-long-should-a-resume-be` 380 impressions at position 26, `docs.veriworkly.com/docs/architecture/monorepo` 275 at position 37, `blog…/ats-friendly-resume-format` 256 at position 16. The marketing site's own best pages are `/changelog/v3-24-3` (151 impressions, 4 clicks, position 4) and `/` (133, 10, position 8). Top queries are resume-length questions the site does not answer anywhere. Turn this into a content plan: which marketing pages need new or rewritten sections, which queries deserve a page, what to remove or merge (the three thin roadmap status pages, duplicated compare copy), and where the existing `/ats-checker`, `/templates/*`, `/compare/*` and `/faq` content should be strengthened. Give each recommendation the query data behind it.
- Run the `seo-audit`, `ai-seo` and `schema` skills over the site as part of the report (they are installed), then verify every claim they make against the code before writing it down. Cross-check the FC-1…16 list: every false claim in copy must be fixed in Phase 1, not softened.
- Measure before and after: Lighthouse mobile (the audit baseline is perf 70–88, LCP 3.6–4.0 s), initial JS per route with `next analyze export` (Next 16.4), and re-run `npm run seo:all` after the first deploy to compare impressions, clicks and the indexed counts. Record the numbers in the README baseline table.

### Hard constraints

- The site is deployed from the root `Dockerfile` (not `apps/server/Dockerfile`). Builds in CI use `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080`, which is exactly the condition behind W-001; Phase 0 fixes that first.
- Do not add new dependencies without asking. Prefer CSS and platform features over framer-motion (Phase 2 is about removing JS, not adding it).
- Do not change pricing, legal or security copy beyond what FINDINGS.md says is false; when copy must change, keep the claims contract test (`apps/site/tests/contracts/claims.contract.test.ts`) green and extend it so the fixed claim cannot regress.
- Keep `apps/site/audit/` as the single place for status. When the last phase closes, tell the user; do not delete the folder yourself.

## 4. How to write and how to spend tokens

- Write like a careful colleague, in plain English. Short sentences. Say what you found, what you changed, what it costs, what is left. No filler, no praise of your own work, no "I'd be happy to", no rhetorical questions, no bullet lists of adjectives, no em-dashes. If a sentence would not survive in a code-review comment, cut it. The same rule applies to everything you write into the repo: commit messages, `SEO-REPORT.md`, README status lines, code comments, and any copy you change on the site (W-020 exists because the site already has copy that reads like a slogan generator).
- Lead with the result. One line of what happened, then the detail someone needs to act. Numbers go in a short table, not in prose.
- Do not re-audit. The reading is done; the plan tells you what to do. Read a file only when you are about to change it or need a line the plan does not give. Do not summarise files back to the user.
- Use subagents only for work that is truly parallel (for example one per plan item in Phase 2 with a separate reviewer for the diff). One builder per item, one reviewer, that is all. Give each a tight brief with the W-IDs and the test to write. Do not spawn agents to "explore".
- Think before every edit: what is the smallest change that closes the finding, which test proves it, what else could it break. Then make the edit once. No speculative refactors, no "while I am here" changes.
- When something is unclear, state the assumption you are making and keep going. Stop only for the decisions the plan reserves for the user.

## 5. How to report

After each phase, give a short written status: what closed (W-IDs), what the gates show (tsc, eslint, tests, Lighthouse, bundle sizes), what you skipped and why, and what needs the user (Search Console actions, hosting config, decisions). Keep the SEO report updated with each re-pull of the data. Keep every status under 300 words unless the user asks for more.
