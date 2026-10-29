# VeriWorkly Marketing Site

The public-facing marketing site for VeriWorkly ([veriworkly.com](https://veriworkly.com)). Built with Next.js 16 (App Router), React 19, and Tailwind CSS 4.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root - this is a workspace, per-app installs will not resolve `@veriworkly/ui`):

   ```bash
   npm install
   ```

2. **Copy the environment file.** Locally only three variables matter (the site's own URL and the two API URLs); the defaults in `.env.example` work with `npm run dev:server`:

   ```bash
   cp .env.example .env
   ```

3. **Start development server**:

   ```bash
   # from the monorepo root
   npm run dev:site
   # or from apps/site
   npx next dev
   ```

The site runs on `http://localhost:3000`. Links to the other apps are not environment variables: `siteConfig.links` in `config/site.ts` is the one place that resolves them, to the local dev ports (Studio `3001`, Docs `3002`, Blog `3003`, Portfolio `3004`) or the production hosts. Server `8080` is only the API default in `.env.example`. If you change a port, change `links` there. Never hardcode a `veriworkly.com` host in a component.

## 🏗️ Architecture

- **Next.js 16 (App Router)** - Marketing pages are prerendered. `/roadmap` and its three status pages prerender and revalidate weekly, and render per request if a roadmap column failed to load (`connection()`). Release pages (`/changelog/[id]`) and roadmap items prerender when the backend answers and render on demand when it does not; an outage never bakes a 404. `/changelog`, `/stats` and `/ambassador/apply` render per request. `/affiliate` and `/ambassador` are static with a 5-minute revalidate: they re-read the program flags from the runtime environment on each regeneration (the Docker build does not receive them), so a flag change applies within 5 minutes without a rebuild. `/api/og` is a Node.js route. `/pricing` revalidates every 12 hours.
- **Tailwind CSS 4** - Styling via the shared design system in `@veriworkly/ui` (`transpilePackages`, plus `@source` in `globals.css` so the UI package's classes survive the content scan).
- **Motion** - Framer is loaded only on the pages that animate with it (home, affiliate, ambassador, the ATS pages), each wrapped in `<MotionIsland>` (`providers/motion-island.tsx`: `LazyMotion` with `domAnimation`, `strict`, and `MotionConfig reducedMotion="user"`). Components use `m.*`, never `motion.*`; `tests/contracts/motion-islands.contract.test.ts` enforces both. Scroll-linked effects on the home page (template rows, bento drift, CTA glow) are CSS scroll timelines (`.scroll-shift`, `.glow-scroll`): they run off the main thread, but every clipping ancestor must use `overflow-clip`, never `overflow-hidden`, or the timeline freezes. The process bar and the ambassador playbook stack use framer `useScroll`. `domAnimation` has no `layout`/`layoutId`; sliding pills are measured instead (`hooks/use-sliding-pill.ts` for the navbar, which stays framer-free on every page). FAQs use `components/ui/animated-details.tsx`: a real `<details>` in the server HTML that springs open once interactive. Secondary pages use the CSS `.reveal` entrance (page-scroll timeline, so it works there) and `.hero-rise`. A `requestAnimationFrame` loop must stop when there is nothing to move (see `components/ui/parallax-floating.tsx`).
- **Strict CSP & Security Headers** - `next.config.ts` enforces a strict Content-Security-Policy. `connect-src` is an explicit allowlist (`'self'`, the origins of `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_VITALS_URL`, `https://*.veriworkly.com`). Security headers also enforce HSTS, `nosniff`, `same-origin-allow-popups` (COOP), `same-site` (CORP), and frame restrictions. Any new third-party client-side API endpoint must be explicitly added to `connectSrc` in `next.config.ts`.

## 🔧 Environment variables

None is required to start the site; set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BACKEND_URL` in production. "Build-time" values are inlined into the bundle: after changing one, rebuild (`docker compose build web`).

| Variable                                                  | When    | Default                      | Purpose                                                                                  |
| --------------------------------------------------------- | ------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                    | Build   | `https://veriworkly.com`     | This site's canonical origin (canonical URLs, Open Graph, JSON-LD, sitemap).             |
| `NEXT_PUBLIC_BACKEND_URL`                                 | Build   | none                         | API origin the browser calls; also added to the CSP `connect-src`. Set it in production. |
| `BACKEND_INTERNAL_URL`                                    | Runtime | `NEXT_PUBLIC_BACKEND_URL`    | API address for server-side rendering; in Docker `http://api:8080/api/v1`.               |
| `AFFILIATE_PROGRAM_ENABLED`, `AMBASSADOR_PROGRAM_ENABLED` | Runtime | on in dev, off in production | Growth-program flags (`1`, `true`, `yes`, `on`); keep equal to the API's.                |
| `ERROR_REPORT_URL`                                        | Runtime | none (errors go to stderr)   | Receives server-side errors as plain JSON.                                               |
| `NEXT_PUBLIC_VITALS_URL`                                  | Build   | none (nothing is sent)       | Receives real-user Web Vitals as plain JSON. An OTLP collector does not accept it.       |
| `BUILD_STANDALONE`                                        | Build   | unset                        | `1` for container builds that run `node apps/site/server.js`.                            |
| `INTERNAL_API_KEY`                                        | Runtime | none                         | Same value as the API's. Lets the API rate-limit the ambassador page per visitor.        |
| `SITE_REVALIDATE_SECRET`                                  | Runtime | none (hook off)              | Same value as the API's, at least 32 characters; shorter turns `/api/revalidate` off.    |

The two secrets are optional. In Docker, `compose.yaml` passes these to the `web` service from the root `.env`.

## 🌐 Behind nginx

`npm start` binds to `127.0.0.1`: a request straight to the port would skip nginx and set its own `X-Real-IP`, which the ambassador page's server render forwards to the API as the visitor's address. The Docker image listens on `0.0.0.0` inside the container, and `compose.yaml` publishes it on the host's loopback only.

nginx in front of the site must set both address headers from the connection, not pass on the visitor's copies:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Appending with `$proxy_add_x_forwarded_for` lets a visitor put any address first. Behind Cloudflare, configure nginx's `real_ip` module so `$remote_addr` is the visitor. The site drops any forwarded value that is not an IP address, and the API ignores the forwarded IP without a matching `INTERNAL_API_KEY`.

## 📄 What's on this site

- **Landing & Product Pages**: `/` (homepage), `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, and `/faq`.
- **ATS Checker**: `/ats-checker` and `/ats-checker/scan` - the scan runs on the server (`POST /ats/check`, with `/ats/extract` for uploads); the `/ats-engine` page demos the open-source engine in the browser.
- **Templates Gallery**: `/templates` and `/templates/[docType]/[templateId]` - showcase of ATS-optimized resume, cover letter, and portfolio layouts.
- **Competitor Comparison**: `/compare` and `/compare/[tool]` - objective comparison pages with feature matrices against Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv (backed by `@/features/compare`).
- **Brand Kit**: `/brand-kit` - brand assets, color token swatches, typography showcase, and downloadable `veriworkly-brand-kit.zip`.
- **Changelog**: `/changelog` and `/changelog/[id]` - public release notes, version history, and GitHub contributor integrations.
- **Public Roadmap**: `/roadmap` and subviews (`/roadmap/todo`, `/roadmap/in-progress`, `/roadmap/done`, `/roadmap/[id]`) - synced with the administrative Studio board.
- **Dev Stats**: `/stats` - live repository metrics and activity board.
- **Growth Programs**: `/affiliate` and `/ambassador` (with `/ambassador/apply`) - gated by runtime feature flags (`AFFILIATE_PROGRAM_ENABLED`, `AMBASSADOR_PROGRAM_ENABLED`); off in production unless set.
- **Legal & Security**: `/security` (responsible disclosure and data storage breakdown), `/privacy`, and `/terms`.
- **Open Graph Generator**: `/api/og` - dynamic Open Graph card generator backing share cards across all pages.
- **Machine-Readable / AI Search Layer**:
  - `public/llms.txt` (llmstxt.org link format) and `public/pricing.md`; `app/llms-full.txt/route.ts` serves llms.txt plus the FAQ, templates, comparisons and pricing.md as one static file. Both are linked from `<head>`.
  - `public/.well-known/agent.json` - a VeriWorkly-specific discovery document (not an A2A AgentCard).
  - `public/.well-known/security.txt` - RFC 9116 security reporting contact.
  - `/openapi.json` - redirects to `https://docs.veriworkly.com/openapi.json`, the one generated copy of the backend API specification.
  - `app/robots.ts` - every crawler may read the whole site. `next.config.ts` `htmlLimitedBots` adds the AI crawlers to Next's list, so they get `<title>` in `<head>` on streamed routes.
  - `app/sitemap.ts` - static routes plus releases and roadmap items. At build with the backend down it lists static routes only; at runtime a failed fetch throws so ISR keeps the last good sitemap. Closed programs are left out.

## ✅ Content Accuracy Contract

This site makes pricing, quota, and capability claims that are also enforced in code elsewhere in the monorepo. When those drift, the site publishes false information - including into structured data (JSON-LD) that search engines and LLMs quote back at users. Reconcile **downward**, never upward:

1. **`apps/server/src/services/productCatalog.ts`** - the single source of truth for products, prices (in cents), and credit allowances.
2. **`apps/server/src/services/ats/quota.ts`** and **`profileImportQuotaService.ts`** - source of truth for ATS scan and import quotas.
3. **`public/pricing.md`**, **`public/llms.txt`**, and **`public/.well-known/agent.json`** - machine-readable docs that must match (1) and (2).
4. **Site UI Copy & JSON-LD**: `features/pricing/**`, `features/faq/data/faqItems.ts`, `features/landing/faq/data/faqItems.ts`, `features/compare/**`, and schema blocks in `app/layout.tsx`, `app/(marketing)/page.tsx`, and `app/(marketing)/pricing/page.tsx`.

### Known Gotchas When Editing Copy

- **The `one_day` billing interval is the 3-day Sprint Pass.** `billingService.ts` grants `addDays(eventTime, 3)`. Do not "fix" the label to 1 day; ensure provider billing periods match 3 days.
- **Paid GitHub import is capped** at `PAID_GITHUB_IMPORT_DAILY_LIMIT` (50/day) to protect the shared server token. Never write "unlimited" or "unmetered"; `claims-truth.contract.test.ts` fails on both.
- **Payments are closed** (`PAYMENTS_BLOCKED` in `app/(marketing)/pricing/page.tsx`). `pricing.md` and `llms.txt` must say so while it is true; the claims test checks both directions.
- **The free tier has zero AI writing credits.** Do not use "generate", "AI-tailored", or similar for free-tier copy. LinkedIn import is AI-parsed, so verify entitlements before describing features as free.
- **Portfolio publishing is free on core templates, paid on premium ones.** Nimbus and Cipher need a paid plan or a 3-Day Sprint Pass / 7-Day Hunt Pass; Signal and Atelier publish free with a "Built with VeriWorkly" badge. Document exports (PDF/DOCX) never carry watermarks on any tier.
- **AI model names are not hardcoded.** They resolve at runtime via `env:VAR` indirection (`apps/server/src/services/aiPrivateConfig.ts`). Prefer capability-based phrasing over specific model names that can become stale.
- **Competitor comparison pricing claims.** `features/compare/data/competitors.ts` includes `PRICING_VERIFIED_AT`. Re-verify live vendor pricing before bumping this date.

## ♿ Accessibility Baseline

Target is **WCAG 2.2 Level AA**:

- `AppShell` (`@veriworkly/ui`) provides the single `<main>` landmark. Page components render into it - do not nest another `<main>`.
- Modal/overlay focus management uses `hooks/use-focus-trap.ts` (handles focus trapping, focus restoration, Escape key, and body scroll locking).
- **Interactive elements**: Anything clickable must be a `<button>` or `<a>`. Disclosure widgets must include `aria-expanded` and `aria-controls`.
- **Labels**: Icon-only controls must have an `aria-label`; icons take `aria-hidden="true"`. Form inputs must have an explicit `<label>` or `aria-label`.
- **Decorative mockups**: Hero preview cards and bento cards containing demo data must include `aria-hidden="true"` and avoid heading tags (`<h1>`-`<h6>`) that corrupt the document outline.
- **Color contrast**: Tokens in `themes.css` are calibrated to WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Avoid raw ad-hoc `zinc-*`/`gray-*` classes that bypass theming. Filter chips and toggles must use `aria-pressed` or `aria-selected` rather than color alone.

## 📁 Folder Structure

- `app/` - Next.js App Router pages, marketing route group `(marketing)/`, layouts, `robots.ts`, `sitemap.ts`, and `/api/og`.
- `components/` - Shared UI components (layout, navbar, footer, marketing primitives, brand swatches, roadmap kanban).
- `config/` - Static configuration:
  - `brand.ts` - Color tokens, palette metadata, brand download assets.
  - `site.ts` - The site's own URL, every cross-app and external link (`siteConfig.links`), legal contacts.
  - `templates.ts` - Resume, cover letter, and portfolio template catalog summaries.
- `features/` - Domain modules (`landing`, `features`, `how-it-works`, `ats-checker`, `ats-engine`, `compare`, `pricing`, `roadmap`, `changelog`, `github`, `stats`, `templates`, `faq`, `about`, `contact`, `legal`, `security`, `marketing`, `affiliate`, `ambassador`).
- `hooks/`, `providers/`, `utils/`, `lib/` - Client hooks (`use-focus-trap`, `use-sliding-pill`, `use-media-query`, ...), the theme and motion providers, `utils/` (JSON-LD and metadata builders, `fetchApiData`), and `lib/` (feature flags, server-side API access that forwards only the auth cookies).
- `scripts/`:
  - `check-design-tokens.mts` - Validates token consistency across `themes.css`, `brand.ts`, and `DESIGN.md`.
  - `build-brand-kit.mts` - Generates the downloadable `veriworkly-brand-kit.zip` bundle (`--check` compares instead of writing).
  - `measure-js.mts` - gzipped initial JS per prerendered route; `--check` fails when a route is over its budget (CI runs it on every site PR).
  - `lighthouse-mobile.mts` - Lighthouse mobile on the six audited pages; the Site Lighthouse workflow posts both tables on pull requests.
- `tests/`:
  - `tests/contracts/` - Automated contract tests ensuring pricing claims, ATS quotas, changelog markdown parsing, and competitor data remain synchronized.
- `public/` - Static images, logos, templates previews, and the machine-readable discovery layer (`llms.txt`, `pricing.md`, `.well-known/agent.json`, `.well-known/security.txt`). `/openapi.json` is a redirect to the docs site, not a file.

## 🔍 Validation & Scripts

Run these commands to validate site integrity:

```bash
# Contract tests: claims vs server constants (prices, quotas, rates, import limit), false-claim
# phrases, metadata lengths, links and redirects, llms.txt links, endpoint query keys vs server
# schemas, build without the backend, motion islands, flags read per request
npm run test:contracts

# Initial JS per prerendered route (after next build) and Lighthouse mobile on six pages
npx tsx scripts/measure-js.mts
npm run lighthouse:mobile -- http://localhost:3100

# Fail if public/brand/veriworkly-brand-kit.zip is stale (runs in CI)
npm run check:brand-kit

# Design token verification (themes.css, brand.ts, DESIGN.md)
npm run check:design

# Build brand kit asset archive (runs automatically in prebuild)
npm run build:brand-kit

# Code quality & formatting
npm run lint
npm run format
npm run format:write

# Production build
npm run build
```

The backend is optional at build time. Without it the build still succeeds: release and roadmap pages render on demand instead of at build, and `sitemap.ts` lists the static routes only until its hourly revalidation fills in the rest. Fetchers throw on an outage and return nothing only on a real 404, so an outage never bakes a "not found" page.
