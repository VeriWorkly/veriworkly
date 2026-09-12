# VeriWorkly Marketing Site

The public-facing marketing site for VeriWorkly ([veriworkly.com](https://veriworkly.com)). Built with Next.js 16 (App Router), React 19, and Tailwind CSS 4.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root - this is a workspace, per-app installs will not resolve `@veriworkly/ui`):

   ```bash
   npm install
   ```

2. **Copy the environment file** and configure your values (see `.env.example` for details):

   ```bash
   cp .env.example .env
   ```

3. **Start development server**:

   ```bash
   npm run dev:site
   # or from monorepo root:
   npm run dev -w @veriworkly/site
   ```

The site runs on `http://localhost:3000`. Sibling apps have fixed dev ports that `config/site.ts` hardcodes for local link resolution: Studio `3001`, Docs `3002`, Blog `3003`, Portfolio `3004`, and Server `8080`. If you change one, update `links` in `config/site.ts` too or cross-app navigation breaks in local dev.

## 🏗️ Architecture

- **Next.js 16 (App Router)** - Marketing pages are statically prerendered (SSG/ISR). Dynamic server routes are limited to live data integrations: `/api/og` (edge image generator), `/stats` (live GitHub dev activity), `/roadmap` & `/changelog` (fetched live from the backend API), and `/ambassador/apply`. Pages like `/pricing` use ISR (12-hour revalidation) with static JSON-LD schemas and client-side checkout initiation.
- **Tailwind CSS 4** - Styling via the shared design system in `@veriworkly/ui` (`transpilePackages`, plus `@source` in `globals.css` so the UI package's classes survive the content scan).
- **Framer Motion** - Site-wide motion is wrapped in `<MotionConfig reducedMotion="user">` (`providers/motion-provider.tsx`). The CSS `prefers-reduced-motion` rule in `@veriworkly/ui/styles/globals.css` neutralizes CSS transitions; framer-motion drives inline transforms from JS and respects the user preference via this provider. **Any new animation must go through Framer Motion or CSS - never a raw `requestAnimationFrame` loop.**
- **Strict CSP & Security Headers** - `next.config.ts` enforces a strict Content-Security-Policy. `connect-src` is an explicit allowlist (`'self'`, `NEXT_PUBLIC_BACKEND_URL`'s origin, `https://*.veriworkly.com`). Security headers also enforce HSTS, `nosniff`, `same-origin-allow-popups` (COOP), `same-site` (CORP), and frame restrictions. Any new third-party client-side API endpoint must be explicitly added to `connectSrc` in `next.config.ts`.

## 📄 What's on this site

- **Landing & Product Pages**: `/` (homepage), `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, and `/faq`.
- **ATS Checker**: `/ats-checker` and `/ats-checker/scan` - in-browser ATS scoring, keyword density extraction, and document analysis.
- **Templates Gallery**: `/templates` and `/templates/[docType]/[templateId]` - showcase of ATS-optimized resume, cover letter, and portfolio layouts.
- **Competitor Comparison**: `/compare` and `/compare/[tool]` - objective comparison pages with feature matrices against Rezi, Teal, Kickresume, Novoresume, Zety, and Enhancv (backed by `@/features/compare`).
- **Brand Kit**: `/brand-kit` - brand assets, color token swatches, typography showcase, and downloadable `veriworkly-brand-kit.zip`.
- **Changelog**: `/changelog` and `/changelog/[id]` - public release notes, version history, and GitHub contributor integrations.
- **Public Roadmap**: `/roadmap` and subviews (`/roadmap/todo`, `/roadmap/in-progress`, `/roadmap/done`, `/roadmap/[id]`) - synced with the administrative Studio board.
- **Dev Stats**: `/stats` - live repository metrics and activity board.
- **Growth Programs**: `/affiliate` and `/ambassador` (with `/ambassador/apply`) - gated by runtime feature flags (`AFFILIATE_PROGRAM_ENABLED`, `AMBASSADOR_PROGRAM_ENABLED`).
- **Legal & Security**: `/security` (responsible disclosure and data storage breakdown), `/privacy`, and `/terms`.
- **Open Graph Generator**: `/api/og` - dynamic Open Graph card generator backing share cards across all pages.
- **Machine-Readable / AI Search Layer**:
  - `public/llms.txt` and `public/pricing.md` - structured Markdown for AI assistants and LLM crawlers.
  - `public/.well-known/agent.json` - Web Agent Card / AEO discovery manifest.
  - `public/.well-known/security.txt` - RFC 9116 security reporting contact.
  - `public/openapi.json` - backend API specification.
  - `app/robots.ts` - explicit crawler allowlists (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, etc.).

## ✅ Content Accuracy Contract

This site makes pricing, quota, and capability claims that are also enforced in code elsewhere in the monorepo. When those drift, the site publishes false information - including into structured data (JSON-LD) that search engines and LLMs quote back at users. Reconcile **downward**, never upward:

1. **`apps/server/src/services/productCatalog.ts`** - the single source of truth for products, prices (in cents), and credit allowances.
2. **`apps/server/src/services/ats/quota.ts`** and **`profileImportQuotaService.ts`** - source of truth for ATS scan and import quotas.
3. **`public/pricing.md`**, **`public/llms.txt`**, and **`public/.well-known/agent.json`** - machine-readable docs that must match (1) and (2).
4. **Site UI Copy & JSON-LD**: `features/pricing/**`, `features/faq/data/faqItems.ts`, `features/landing/faq/data/faqItems.ts`, `features/compare/**`, and schema blocks in `app/layout.tsx`, `app/(marketing)/page.tsx`, and `app/(marketing)/pricing/page.tsx`.

### Known Gotchas When Editing Copy

- **The `one_day` billing interval is the 3-day Sprint Pass.** `billingService.ts` grants `addDays(eventTime, 3)`. Do not "fix" the label to 1 day; ensure provider billing periods match 3 days.
- **"Unlimited" GitHub import is capped** at `PAID_GITHUB_IMPORT_DAILY_LIMIT` (50/day) to protect the shared server token. Never write "unlimited" without this qualifier.
- **The free tier has zero AI writing credits.** Do not use "generate", "AI-tailored", or similar for free-tier copy. LinkedIn import is AI-parsed, so verify entitlements before describing features as free.
- **Portfolio publishing is free on core templates, paid on premium ones.** Nimbus and Cipher require a subscription; Signal and Atelier publish free with a "Built with VeriWorkly" badge. Document exports (PDF/DOCX) never carry watermarks on any tier.
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
  - `site.ts` - Canonical URLs, external links, navigation structure, legal contacts.
  - `templates.ts` - Resume, cover letter, and portfolio template catalog summaries.
- `features/` - Domain modules (`landing`, `ats-checker`, `compare`, `pricing`, `roadmap`, `changelog`, `templates`, `stats`, `faq`, `about`, `legal`, `affiliate`, `ambassador`).
- `hooks/`, `providers/`, `utils/`, `lib/` - Client hooks (`useMediaQuery`, `useFocusTrap`, etc.), theme/motion providers, JSON-LD schema helpers, metadata builders, and API fetch wrappers.
- `scripts/`:
  - `check-design-tokens.mts` - Validates token consistency across `themes.css`, `brand.ts`, and `DESIGN.md`.
  - `build-brand-kit.mts` - Generates the downloadable `veriworkly-brand-kit.zip` bundle.
- `tests/`:
  - `tests/contracts/` - Automated contract tests ensuring pricing claims, ATS quotas, changelog markdown parsing, and competitor data remain synchronized.
- `public/` - Static images, logos, templates previews, and the machine-readable discovery layer (`llms.txt`, `pricing.md`, `.well-known/agent.json`, `.well-known/security.txt`, `openapi.json`).

## 🔍 Validation & Scripts

Run these commands to validate site integrity:

```bash
# Contract testing (asserts marketing claims match backend catalogs and quotas)
npm run test:contracts

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

`sitemap.ts` and the roadmap/changelog services fetch from the backend at build time and gracefully fall back to static definitions if the backend is unreachable during build.
