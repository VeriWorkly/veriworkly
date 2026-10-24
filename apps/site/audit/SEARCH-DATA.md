# Search Console audit: Google + Bing

Snapshot: **2026-10-24**. Google window 2026-07-23 → 2026-10-21 (90 days). Raw data is in `apps/site/audit/data/*.json` (gitignored). Regenerate everything with the commands in [How to re-run](#how-to-re-run).

Findings are numbered **SC-nn** (separate from the W-nnn register). Severity: **High** = fix first, **Medium** = fix soon, **Low** = tidy up.

---

## 1. Summary (read this first)

1. **Google is working; Bing is simply early.** Google has indexed 222 of the 301 sitemap URLs (74%) and shows 2,371 impressions. Bing shows zero because it has recorded **zero impressions on all 55 days it reports**, and its index only started filling on 23 Sep. The zeros are real data, not a broken connection (section 3).
2. **Biggest real bug: every docs page declares the docs homepage as its canonical** (171 of 172 pages). Google is currently ignoring it, but it is fragile (SC-01).
3. **Main site is only 51% indexed in Google** (49 of 96 URLs). Most of the gap is 31 changelog entries and several templates that Google has found but never crawled (SC-02).
4. **`hello.veriworkly.com`, a published portfolio listed in the portfolio sitemap, serves a hosting-panel page (FASTPANEL).** So does every other random subdomain (SC-03).
5. **Unknown docs and blog URLs return HTTP 200, not 404** (SC-04).
6. **Traffic is tiny but growing:** 19 clicks, weekly impressions up from ~50 to ~300-380. Nearly everything ranks at position 20+. Two blog posts are one push from page 1 (SC-09).
7. Two of my earlier claims were wrong and are corrected in section 6.

### Scorecard

| | Google | Bing |
| --- | --- | --- |
| Property | `sc-domain:veriworkly.com` (restricted user) | `https://veriworkly.com/` (imported from Google on 2026-10-22) |
| Sitemap URLs checked | 301 | 301 |
| Indexed | **222 (74%)** | **65 (22%)** (aggregate "InIndex") |
| Crawled but not indexed / not yet indexed | 9 crawled-not-indexed, 55 discovered-not-indexed, 15 unknown | 220 URLs crawled (73%), 81 never crawled |
| Impressions / clicks (90 days) | 2,371 / 19 | 0 / 0 |
| Crawl problems reported | none in inspection | 1-3 per day (1 blocked by robots.txt, 1-2 HTTP 4xx); the issue list itself is empty |
| Sitemaps | 5 submitted; 1 error, 14 warnings (details not exposed by the API) | 5 submitted; all "Success" |

---

## 2. Google

### 2.1 Index coverage (URL Inspection API, every sitemap URL)

| Host | URLs | Indexed | Discovered, not indexed | Crawled, not indexed | Unknown to Google |
| --- | --- | --- | --- | --- | --- |
| veriworkly.com | 96 | 49 | 38 | 2 | 7 |
| docs.veriworkly.com | 172 | 146 | 15 | 7 | 4 |
| blog.veriworkly.com | 23 | 19 | 2 | 0 | 2 |
| portfolio.veriworkly.com | 8 | 8 | 0 | 0 | 0 |
| hello.veriworkly.com | 1 | 0 | 0 | 0 | 1 |
| app.veriworkly.com | 1 | 0 | 0 | 0 | 1 |
| **Total** | **301** | **222** | **55** | **9** | **15** |

Meaning of the labels: *Discovered, not indexed* = Google knows the URL but has not crawled it yet. *Crawled, not indexed* = Google read it and chose not to index it (usually thin or duplicate). *Unknown* = Google has never seen it.

Main-site breakdown by section (`veriworkly.com`):

| Section | URLs | Indexed | Not yet indexed |
| --- | --- | --- | --- |
| Core pages (home, pricing, faq, about, features, compare x7, etc.) | 31 | 28 | `/contact`, `/style-guide`, `/privacy` |
| `/changelog/*` | 48 | 13 | **35** (31 discovered, 4 unknown) |
| `/templates/resume/*` | 8 | 3 | 5 |
| `/templates/cover-letter/*` | 6 | 4 | 2 |
| `/templates/portfolio-website/*` | 5 | 4 | 1 (`portfolio-signal`, crawled-not-indexed) |
| `/roadmap/*` | 4 | 3 | `/roadmap/todo` |

### 2.2 Traffic

Totals: **2,371 impressions, 19 clicks**. Only 36% of impressions (843) are attributable to a query, because Google hides low-volume queries for privacy. Query tables undercount; page tables are complete.

Weekly trend (Mon start):

| Week | Impressions | Clicks | Week | Impressions | Clicks |
| --- | --- | --- | --- | --- | --- |
| 07-20 | 48 | 0 | 09-07 | 105 | 1 |
| 07-27 | 96 | 1 | 09-14 | 83 | 1 |
| 08-03 | 64 | 1 | 09-21 | 207 | 5 |
| 08-10 | 108 | 0 | 09-28 | 237 | 3 |
| 08-17 | 117 | 1 | 10-05 | 266 | 3 |
| 08-24 | 153 | 0 | 10-12 | 379 | 2 |
| 08-31 | 58 | 0 | 10-19 | 284 (partial) | 1 |

Impressions by host: blog 964, main 736, docs 555, portfolio 116. Devices: desktop 1,876 (avg position 28.1), mobile 321 (20.7), tablet 8. Countries: US 939 impressions / 1 click; India 182 / 8 clicks.

All 19 clicks: homepage 10, `/changelog/v3-24-3` 4, and one each on portfolio `cipher`, portfolio `nimbus`, `/affiliate`, `/pricing`, `/templates/portfolio-website/portfolio-signal`. The only query that produced clicks is the brand term **"veriwork"** (52 impressions, 2 clicks, position 7.1).

---

## 3. Why Bing shows zeros (and what is actually true)

**Connection is fine.** The same API key returns crawl stats (53 days), sitemaps and per-URL data. The zero is returned as real data.

Evidence, in order:

1. **No impressions at all.** `GetRankAndTrafficStats` returns 55 daily rows (2026-08-27 → 2026-10-21); every row is 0 clicks / 0 impressions. `GetQueryStats` and `GetPageStats` return empty lists because there is nothing to list.
2. **Bing's index started late.** Bing's own "pages in index" counter was **0 from 30 Aug until 22 Sep**, then 4 (23 Sep), 11 (1 Oct), 33 (5 Oct), 52 (17 Oct), **65 (21 Oct)**. The site was discovered in April-May, but Bing did not index it until late September.
3. **Crawled is not indexed.** I checked every sitemap URL with `GetUrlInfo`: Bing has crawled **220 of 301** URLs, but reports only **65** in its index. The rest are queued or were judged low value.
4. **Nothing ranks yet.** Even Google, the larger engine, shows nearly all impressions at position 20+. A page needs a visible position to record an impression, and Bing's new-site ramp-up is slow.
5. **Property is correct.** One property, `https://veriworkly.com/`, verified, role added by "GSCImport" on 2026-10-22. It covers the subdomains: Bing has crawled blog (23/23), docs (118/172), portfolio (8/8) and app URLs under it.

**Bing coverage of sitemap URLs (crawled at least once):**

| Host | URLs | Crawled | Never crawled |
| --- | --- | --- | --- |
| veriworkly.com | 96 | 69 | 27 |
| docs.veriworkly.com | 172 | 118 | 54 |
| blog.veriworkly.com | 23 | 23 | 0 |
| portfolio.veriworkly.com | 8 | 8 | 0 |
| hello.veriworkly.com | 1 | 1 | 0 |
| app.veriworkly.com | 1 | 1 | 0 |

Google and Bing agree on 156 URLs (indexed by Google and crawled by Bing). 66 are Google-only, 64 are Bing-only, and 15 are known to neither. Bing never crawled the newest changelog entries (v3.25 to v3.27) or several template pages.

**What to expect:** Bing impressions should start appearing within weeks as the index grows; do not read the zero as a fault. It can be sped up with IndexNow (SC-10).

---

## 4. Findings register

### High

#### SC-01: Every docs page declares the docs homepage as its canonical
- **Evidence:** raw HTML of 171 of 172 docs URLs contains `<link rel="canonical" href="https://docs.veriworkly.com"/>`, e.g. `/docs/architecture/monorepo`. The `TechArticle` JSON-LD `url` is also the homepage on every page.
- **Cause:** `apps/docs-platform/app/layout.tsx:63-65` sets a static `alternates.canonical`, and the three page-level `generateMetadata` functions (`app/docs/[[...slug]]`, `app/ats-engine/[[...slug]]`, `app/api-reference/[[...slug]]`) never override it.
- **Current impact:** Google is **ignoring the wrong hint**. In the inspection data, 153 docs pages have Google-chosen canonical different from the declared one, and 146 docs URLs are indexed. So docs are not de-indexed today. But a wrong canonical is a standing request to merge every docs page into the homepage; it can start being honored, and other engines (Bing) generally follow it more closely. Bing has 54 docs URLs never crawled, which is consistent with, but not proof of, this.
- **Fix:** remove the layout-level canonical; in each `generateMetadata`, set `alternates: { canonical: <this page's own URL> }`; set the JSON-LD `url` per page.
- **Verify:** `curl -s <docs page> | grep canonical` shows the page's own URL; re-run `npm run seo:inspect` and confirm Google's chosen canonical equals the declared one.

#### SC-02: Main site is 51% indexed in Google
- **Evidence:** 49 of 96 URLs indexed. 31 changelog entries and 7 template pages are "Discovered, not indexed" (Google has never fetched them); `/contact`, `/style-guide`, `/roadmap/todo` are the same; `/privacy` and 4 changelog entries are unknown to Google.
- **Likely causes:** a young domain with low crawl demand, 48 near-identical changelog pages, and weak internal linking to deep pages. This is a crawl-priority issue, not a technical block: robots.txt and meta robots allow all of these.
- **Fix:** link `/privacy` and `/contact` from the footer on every page; link template detail pages from the templates hub; add an index-style changelog landing with links to every release; drop `/style-guide` from the sitemap if it is not meant to rank. Then request indexing for the top 10 pages in the Search Console UI.
- **Verify:** re-run `npm run seo:inspect` in 2-4 weeks and compare the indexed count (222 today).

#### SC-03: `hello.veriworkly.com` serves a hosting-panel page; wildcard subdomains all do
- **Evidence:** `https://hello.veriworkly.com` returns HTTP 200 with `<title>FASTPANEL</title>` and `noindex,nofollow`. It is listed in `portfolio.veriworkly.com/sitemap.xml` (from the backend's published-portfolio list). A random host (`zzqx-test-1.veriworkly.com`) returns the same page. Both resolve to Cloudflare.
- **Impact:** a published portfolio that cannot be opened, and a public sitemap URL that points at a hosting control-panel placeholder. Related to the existing "publishing" gap in the known-gaps notes.
- **Fix:** in the server config (nginx), route `*.veriworkly.com` to the portfolio app with a default server that returns 404 for unknown names; until that works, filter unreachable portfolios out of `apps/portfolio/app/sitemap.ts`.
- **Verify:** `curl -sI https://hello.veriworkly.com` shows the portfolio, and a random subdomain returns 404.

### Medium

#### SC-04: Unknown URLs return HTTP 200 (soft 404)
- **Evidence:** `docs.veriworkly.com/docs/does-not-exist-xyz` and `blog.veriworkly.com/does-not-exist-xyz` return **200** with the normal site title and a `noindex` meta. `veriworkly.com/changelog/v9-9-9` returns 200 "Release Not Found" with `noindex`. The main site's generic 404 is correct (404).
- **Mitigation present:** the `noindex` tag, so Google drops them. The page also carries a conflicting `index, follow` tag next to `noindex`.
- **Fix:** return a real 404 (`notFound()`) in the docs, blog and changelog routes and remove the extra `index, follow` tag. Related to the changelog soft-404 item already in `FINDINGS.md`.

#### SC-05: Sitemap contents conflict with their own pages
- `app.veriworkly.com/sitemap.xml` lists `/login`, but that page is `noindex, nofollow`. This is the most likely cause of Google's "1 error" on that sitemap (the sitemap shows as pending and was never read). Remove the app sitemap and its `Sitemap:` line in the main `robots.txt`.
- The portfolio sitemap includes `hello.veriworkly.com` (SC-03).
- The main sitemap shows **14 warnings** in Google. The API does not say which URLs; open the sitemap report in the Search Console UI.
- Google's stored count for the docs sitemap is 137 URLs; the live sitemap has 172. The newer pages are queued or unknown (SC-02 pattern).

#### SC-06: Plain `http://` is not redirected to https
- **Evidence:** `http://veriworkly.com`, `http://blog.`, `http://docs.` and `http://portfolio.` return **200** over http (only `app.` redirects). `www` redirects correctly (301). HSTS is set on https responses.
- **Impact:** low in practice because canonical tags point to https, but it creates duplicate URLs and splits links.
- **Fix:** turn on Cloudflare "Always Use HTTPS" for the zone.

#### SC-07: Titles and descriptions
- 74 of 301 titles are over 65 characters (59 main site, 15 blog) and will truncate. 45 of 51 changelog titles are too long, e.g. `VeriWorkly v3.21.0: v3.21.0 - AI Experience Refresh, … | Release Notes` (the version number is repeated). The homepage title is 71 characters.
- 3 changelog pages (`v3-24-0`, `v3-23-1`, `v3-22-0`) have a 3-character description; 2 docs API pages have none.
- 4 docs titles are duplicated ("Overview", "Master Profile", "Changelog", "Languages and regions"; each twice).
- **Fix:** shorten the changelog title template (drop the repeated version and the "| Release Notes" suffix); trim the homepage title to ~60 characters; fix the short descriptions.

#### SC-08: Blog pages ship a loader `<h1>` and a duplicate `<h1>`
- **Evidence:** in the raw HTML of blog posts the first `<h1>` is **"Preparing your experience"** (a loading screen), followed by the real article `<h1>`, followed by a third `<h1>` repeated inside the article body. 21 of 23 blog URLs have 2-3 `h1` elements.
- **Impact:** crawlers and AI tools that read raw HTML see the loader heading first. The article is still indexed (19 of 23).
- **Fix:** render the loader as a non-heading element or hide it from the HTML; render the MDX title as `h2` or drop the duplicate.

#### SC-09: Ranking opportunities (real numbers)
| Page | Impressions | Position | Clicks | Note |
| --- | --- | --- | --- | --- |
| `blog/how-long-should-a-resume-be` | 380 | 26.4 | 0 | The query family ("how long should a resume be", "resume length", "how long is a resume") adds up to ~270 impressions at positions 24-28 |
| `blog/ats-friendly-resume-format` | 256 | 16.5 | 0 | One page from page 1; the query "what tools can convert a resume into an ats friendly format…" is at 8.3 |
| `docs/architecture/monorepo` | 275 | 37.5 | 0 | The query "next.js 16 app router shared design system monorepo" is at 3.8 (54 impressions) but no one clicks; rewrite the title/description |
| `/` (home) | 133 | 7.9 | 10 | The brand query "veriwork" sits at 7.1; check the homepage title and add `alternateName` in the Organization schema |
| `blog/free-resume-builders-compared` | 119 | 21.0 | 0 | Commercial intent, page 2-3 |
| `/ambassador` | 91 | 54.3 | 0 | Weak content for its query |

### Low

#### SC-10: Bing needs a push (IndexNow)
No IndexNow implementation exists in the repo (searched). IndexNow notifies Bing of new or changed URLs immediately; it would cover the 81 URLs Bing has never crawled. Bing's daily URL-submission quota is 100 per day (800 per month). Alternatively, submit the top pages manually in Bing Webmaster Tools.

#### SC-11: Docs pages Google chose not to index
7 docs pages are "crawled, not indexed": four auto-generated `api-reference/github/*` pages plus `architecture/resume-schema`, `operations/service-status` and `user-guides/resume-templates`. Auto-generated API pages are often thin; consider enriching or consolidating them. Not urgent.

#### SC-12: Reading these numbers
19 clicks is a small sample, and 64% of impressions have no query. Position for any query under ~20 impressions is noisy. Treat the CTR figures as directional.

---

## 5. What was verified, and how

| Check | Method | Result |
| --- | --- | --- |
| Google API access | `sites.list` | One property, `siteRestrictedUser` permission |
| Google index status | URL Inspection API on all 301 sitemap URLs | 222 / 55 / 9 / 15 (section 2.1) |
| Google traffic | Search Analytics: queries, pages, query×page, daily, devices, countries | Section 2.2 |
| Google data consistency | Compared sums across dimensions | Pages 2,371; queries 843; query×page 868 (query-level is lower by design) |
| Bing access | `GetUserSites`, `GetSiteRoles` | Property verified; 6 sites on the account, only `veriworkly.com` is this project |
| Bing traffic | `GetRankAndTrafficStats`, `GetQueryStats`, `GetPageStats` | All zero (section 3) |
| Bing index and crawl | `GetCrawlStats` (53 days), `GetCrawlIssues`, `GetBlockedUrls`, `GetUrlInfo` for all 301 URLs | 65 indexed; 220 crawled; no listed issues |
| Live pages | Fetched all 301 sitemap URLs (status, redirects, robots, canonical, title, description, h1) | All 200; canonical bug (SC-01); titles and h1 (SC-07, SC-08) |
| Hosts and robots | `robots.txt` on 5 hosts, http/https/www variants, 404 behavior | SC-03, SC-04, SC-06 |
| Code cause | Read `apps/docs-platform/app/layout.tsx`, docs page metadata, `apps/portfolio/app/sitemap.ts` | SC-01, SC-03 |

**Not verified (not exposed by the APIs; check in the web UIs):**
- Google: Manual actions, Security issues, Core Web Vitals, the Links report, and the exact reason lists in the Pages report and sitemap warnings.
- Bing: SEO Reports, Site Scan, and which URL is "blocked by robots.txt" (most likely under `app.veriworkly.com`, whose robots.txt disallows `/`).

---

## 6. Corrections to my earlier draft

1. **Retracted:** "`/changelog/v3-24-3` outranking commercial pages is a problem; consider noindex." Its queries are about Next.js 16.3.5 security (for example "next 16.3.5", "next.js 16.3.5"). It legitimately ranks at position 4 and delivered 4 of the 19 clicks. Do not noindex it.
2. **Retracted:** "Bing has no record of docs, portfolio and app URLs". Those 400 responses were Bing's `ThrottleHost` rate limit hitting my burst of requests. A throttled re-check shows Bing has crawled them.
3. **Clarified:** the sitemap "indexed: 0" figures from Google's sitemap API are not real; the API stopped filling that field. Real numbers come from URL inspection (section 2.1).
4. **Clarified:** the one-page-away claim on `ats-friendly-resume-format` stands; the earlier "quick wins" query returned nothing, so SC-09 uses the full page and query tables instead.

---

## 7. How to re-run

Environment variables are described in `scripts/seo-data/README.md`.

```
npm run seo:all        # Google + Bing analytics snapshot (about 30 seconds)
npm run seo:inspect    # Google index status for every sitemap URL (about 6 minutes)
npm run seo:bing-urls  # Bing crawl status for every sitemap URL (about 8 minutes, rate-limited)
```

Suggested rhythm: run `seo:all` weekly, and `seo:inspect` plus `seo:bing-urls` every 2-4 weeks. Compare indexed counts against section 1.

## 8. Fix order

1. SC-01 (docs canonical): small code change, biggest risk removed.
2. SC-03 and SC-05 (wildcard subdomain, bad sitemap entries): small.
3. SC-04 and SC-06 (real 404s, http to https redirect).
4. SC-02 and SC-09 (internal linking, blog and docs titles): the slower traffic work.
5. SC-07, SC-08, SC-10, SC-11.
