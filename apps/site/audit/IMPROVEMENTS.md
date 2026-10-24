# Site — improvements and growth suggestions

> Not part of the remediation plan in [README.md](./README.md). Each item builds on something the code already has. Effort: S (< 1 day), M (days), L (week+). "After" names the remediation phase it depends on.

**Answer-engine and search visibility**
1. One definitional paragraph under every H1 ("VeriWorkly is a free, MIT-licensed resume, cover letter and portfolio builder by Gautam Raj. Documents stay in your browser; AI costs credits; …") and keyword-bearing H1s. S, after Phase 1. This is the single highest-leverage AEO change: today no page states what the product is in a sentence an LLM can quote.
2. `llms-full.txt` for the whole site (pages concatenated as markdown with the definitional paragraphs first) and `<link rel="alternate" type="text/markdown">` from each page to its markdown twin. M, after Phase 3.
3. Per-page WebPage nodes with `dateModified`, `isPartOf: #website`, `about: #app`, so the entity graph is one connected graph; `Person.image`, `Organization.foundingDate/address/contactPoint`. S.
4. Comparison pages as a programmatic set: a data-driven `/compare/[tool]` already exists; add `/alternatives/[tool]` and `/vs/[tool]-vs-[tool]` from the same `COMPETITORS` data with distinct H1s and definitional intros. M.
5. Template detail pages get real export PNGs (rendered by the studio's own `@react-pdf` pipeline in a script) instead of 8 wireframe SVGs, plus `CreativeWork.image` and true og:image sizes. M, after Phase 1 (claims) — this also makes "Every preview is the real export" true.
6. A `/glossary` of ATS terms (the ATS engine's rubric already defines them in `apps/docs-platform`) with DefinedTerm markup; it is the cheapest way to earn AI citations for "what is an ATS score". M.
7. Sitemap `lastModified` from git for static routes (build-time `git log -1 --format=%cI -- <page file>`). S.

**Performance beyond the plan**
8. Partial prerendering with `cacheComponents` for `/changelog`, `/roadmap`, `/stats`: static hero + filters, streamed lists, `cacheTag` invalidated by a server webhook on release/roadmap change. M, after Phase 2.
9. View Transitions for navbar/menu and template-detail navigation (replaces the last reasons to keep framer in the shell). S, after Phase 2.
10. Pre-encode template previews as AVIF/WebP at build (a script next to `build-brand-kit.mts`), serve with hashed names so the 1-year immutable header is safe. S.
11. Move the ATS engine demo on `/ats-engine` into a Web Worker, started on first interaction. M.
12. `instrumentation.ts` + `onRequestError` reporting to the SigNoz instance the team runs, so build-time fetch failures and boundary errors become alerts instead of console lines. S.

**Conversion and content**
13. Make "no login required" literally true: the studio opens in guest mode by default (studio plan item) and the site's most-repeated claim stops needing an asterisk. Coordinate with `apps/studio/audit` Phase 3.
14. A `/pricing` "payments open soon" banner driven by a shared flag (server `config`, exposed via `/billing/catalog` or a public JSON), so pricing copy, JSON-LD offers, `pricing.md` and `llms.txt` all flip together. S, after Phase 1.
15. Primary nav gains Features, How it works and FAQ (today reachable only from the footer); footer columns wrapped in `<nav aria-label>`. S.
16. Changelog: an RSS/Atom feed (`/changelog/feed.xml`) and `<link rel="alternate" type="application/rss+xml">` — cheap freshness signal for crawlers and newsletter tooling. S.
17. Blog cross-links: each feature page links to its two most relevant posts on blog.veriworkly.com (there is no in-body blog link anywhere today). S.
18. Stats page: a public JSON endpoint and an embeddable badge (`/stats/badge.svg`) for the README and the GitHub repo; "built in the open" is a differentiator that currently has no shareable artefact. M.
19. Contact form via a Server Action proxy to the backend: removes CORS + preflight, allows `useActionState` progressive enhancement (works without JS), and lets the 429 copy include the hourly limit and the email fallback. M.
20. Ambassador and affiliate pages become true server-rendered marketing pages with a single client island each (calculator, apply form); their navs/footers merge into the shared ones (4 navs and 3 footers today). M, after Phase 2.

**Testing and guardrails**
21. Extend `claims.contract.test.ts` to import server constants (`productCatalog`, `ats/quota`, `affiliate/constants`, `profileImportQuotaService`) and assert every number on the site against them; scan `llms.txt`, `agent.json`, `pricing.md`, JSON-LD strings and FAQ data for the banned/false claim patterns. S.
22. A sitemap↔routes contract test, a redirects test, a metadata-completeness test (title ≤ 60, description ≤ 160, one h1, brand present, canonical self), and an `llms.txt` link-resolution test. S.
23. Lighthouse CI on PRs (mobile preset, budgets: LCP ≤ 2.5 s, TBT ≤ 200 ms, initial JS ≤ 200 KB gz) against a `next start` of the built app — the numbers in README are the baseline. M.
24. A jsdom + axe smoke test for every form and accordion. S.

**Added by the 2026-10-24 verification pass**
25. A RUM Core Web Vitals pipeline (`useReportWebVitals` → backend → SigNoz dashboard with p75 LCP/INP/CLS per route) to pair with the Lighthouse CI in #23 (W-061). S.
26. `htmlLimitedBots` extended to AI crawlers plus a contract test that dynamic routes render `<title>` in `<head>` for a GPTBot user agent (W-060). S.
27. `next analyze export` (16.4) in CI to diff the client modules per route against the Phase 2 budget (≤200 KB gz), replacing the hand-gzip step in the Verification table. S.
28. After `cacheComponents` (#8): `ensureStatic = 'navigation'` on the static marketing layout so a stray `cookies()` or flag read can never silently make `/privacy` dynamic; `partialPrefetching` for navbar links. M.
29. A portfolio template deep link that preselects the template (W-059) and a "Preview live" link from `/templates/portfolio-website/*`. S.
30. `robots.ts` content-usage directives through the 16.3 `other` field (for example `Content-Signal: search=yes, ai-input=yes, ai-train=no`) to state the AI-usage policy (W-063). S.
31. Evaluate `reactCompiler` with the experimental `turbopackRustReactCompiler` once Phase 2 has trimmed the client islands. S.
