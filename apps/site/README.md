# VeriWorkly Marketing Site

The public-facing marketing site for VeriWorkly (veriworkly.com). Built with Next.js 16 (App Router), React 19, and Tailwind CSS 4.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root - this is a workspace, per-app installs will not resolve `@veriworkly/ui`):

   ```bash
   npm install
   ```

2. **Copy the environment file** and fill it in (see `.env.example` for what each var does):

   ```bash
   cp .env.example .env
   ```

3. **Start development server**:

   ```bash
   npm run dev:site
   ```

The site runs on `http://localhost:3000`. Sibling apps have fixed dev ports that `config/site.ts` hardcodes for local link resolution: studio `3001`, docs `3002`, blog `3003`, portfolio `3004`. If you move one, update `links` in `config/site.ts` too or cross-app navigation breaks in dev only.

## 🏗️ Architecture

- **Next.js 16 (App Router)** - most marketing routes are statically prerendered. `/pricing` is the notable exception: it reads the session behind its own `<Suspense>` boundary so a single `cookies()` call does not opt the whole page into dynamic rendering.
- **Tailwind CSS 4** - styling via the shared design system in `@veriworkly/ui` (`transpilePackages`, plus `@source` in `globals.css` so the UI package's classes survive the content scan).
- **Framer Motion** - all animation is wrapped in `<MotionConfig reducedMotion="user">` (`providers/motion-provider.tsx`). The CSS `prefers-reduced-motion` block in `@veriworkly/ui/styles/globals.css` only neutralises CSS animations; framer-motion drives inline transforms from JS and has to be opted in separately. **Any new animation must go through framer-motion or a CSS animation - never a raw `requestAnimationFrame` loop**, or it will ignore the user's motion preference.
- **CSP** - `next.config.ts` sets a strict Content-Security-Policy. `connect-src` is an explicit allowlist (`'self'`, `NEXT_PUBLIC_BACKEND_URL`'s origin, `https://*.veriworkly.com`). **Any new third-party `fetch()` from the browser must be added there or it fails silently in production.**

## 📄 What's on this site

Beyond landing, pricing, features, how-it-works, and FAQ:

- **`/affiliate`** and **`/ambassador`** - marketing pages for both growth programs. Both programs are gated in the product itself by a boot-time feature flag (`config.growth.affiliateProgramEnabled` / `ambassadorProgramEnabled`), default-off in production until explicitly enabled.
- **`/security`** - a real responsible-disclosure policy plus a "what data lives where" breakdown.
- **`/stats`** - a public live board of the VeriWorkly GitHub repo's own dev activity.
- **`/style-guide`** - a public showcase of the shared design system, the public counterpart to `packages/ui`.
- **`/roadmap`** and subpages - fully backend-driven from the same data admins manage in Studio.
- **`/compare/[tool]`** - competitor comparison pages generated from `config/compare.ts`. See the accuracy contract below; these make dated claims about third parties.
- **`/templates`** - a resume/cover-letter template showcase (distinct from the Portfolio app's own template gallery).
- **`/api/og`** - runtime Open Graph card generator. Backs the share image for `/stats`, `/pricing`, `/changelog`, every `/compare/*`, `/affiliate`, `/ambassador`, and every `/roadmap/[id]`. (Static card authoring tool lives at `/og-generator` in `apps/portfolio`).
- **An "AI answer engine" content layer** - `public/llms.txt` and `public/pricing.md` are machine-readable summaries of the product aimed at AI crawlers and chat assistants; `robots.ts` explicitly allowlists `GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and `CCBot`.

## ✅ Content accuracy contract

This site makes pricing, quota, and capability claims that are also enforced in code elsewhere in the monorepo. When those drift, the site publishes false information - including into structured data (JSON-LD) that search engines and LLMs quote back at users. Reconcile **downward**, never upward:

1. **`apps/server/src/services/productCatalog.ts`** - the only real source of truth for what exists and what it costs. Prices are in cents. Credit allowances live in `creditAllowance`.
2. **`apps/server/src/services/ats/quota.ts`** and **`profileImportQuotaService.ts`** - the real source of truth for every "N scans / N imports" number.
3. **`public/pricing.md`** and **`public/llms.txt`** - the human-maintained prose layer. Must match (1) and (2).
4. **Site UI copy** - `features/pricing/**`, `features/faq/data/faqItems.ts`, `features/landing/faq/data/faqItems.ts`, `config/compare.ts`, and the JSON-LD blocks in `app/layout.tsx` + `app/(marketing)/page.tsx` + `app/(marketing)/pricing/page.tsx`. Must match (3).

Known gotchas when editing:

- **The `one_day` billing interval is the 3-day Sprint Pass.** The key is historical; `billingService.ts` grants `addDays(eventTime, 3)`. Do not "fix" the label to 1 day, and make sure the Dodo product's own billing period matches 3 days - `currentPeriodEnd` prefers the provider's `next_billing_date` over the local fallback.
- **"Unlimited" GitHub import is capped** at `PAID_GITHUB_IMPORT_DAILY_LIMIT` (50/day) to protect the shared server token. Don't write "unlimited" without that qualifier.
- **The free tier has zero AI writing credits.** Any free-tier copy using "generate", "AI-tailored", or similar is wrong. LinkedIn import is AI-parsed, so check the entitlement path before describing it as a free-tier feature.
- **Portfolio publishing is free on the core templates, paid on the premium ones.** `portfolioService.publish` gates `nimbus` and `cipher` behind a subscription; `signal` and `atelier` are free and publish with a "Built with VeriWorkly" badge that the `watermark_removal` entitlement removes. Two things to keep copy honest about: publishing is **still blocked in production** for everyone but the admin email (`portfolioController.ts`), so every publishing claim needs an "at launch" qualifier; and the badge is portfolio-only - document exports carry no watermark on any tier, so never let one row imply the other.
- **AI model names are not in this repo.** They resolve at runtime from a private config via `env:VAR` indirection (`apps/server/src/services/aiPrivateConfig.ts`). Hardcoding a model name in marketing copy creates a claim that can silently go stale - prefer capability language.
- **`config/compare.ts` makes dated claims about competitors' pricing.** `PRICING_VERIFIED_AT` is displayed to users; re-verify against each vendor's live pricing page before bumping it.

Before shipping copy that states a number, grep the server for it.

## ♿ Accessibility baseline

Target is WCAG 2.2 Level AA. Conventions in place that new code must not regress:

- `AppShell` (`@veriworkly/ui`) provides the single `<main>` landmark. Page components render into it - don't nest another `<main>`.
- Modal/overlay focus management goes through `hooks/use-focus-trap.ts`, which handles focus-in, focus restore, Escape, and body scroll lock. Use it rather than hand-rolling.
- **Anything clickable must be a `<button>` or `<a>`.** A `div`/`motion.div` with `onClick` is not keyboard-reachable and has no role. Disclosure widgets additionally need `aria-expanded` and `aria-controls`.
- Icon-only controls need an `aria-label`; the icon itself gets `aria-hidden="true"`.
- Inputs need a real `<label>` or `aria-label` - a `placeholder` is not an accessible name.
- Decorative product mockups (the hero cards, bento previews) contain fabricated sample data. Mark them `aria-hidden="true"` so assistive tech doesn't read invented metrics as fact, and don't use `<h1>`–`<h6>` inside them - it corrupts the page heading outline.
- State conveyed by colour alone fails 1.4.1. Selected filter chips need `aria-pressed`; comparison-table check/dash cells need `sr-only` text.
- Sections that hardcode `zinc-*`/`gray-*` instead of design-system tokens bypass theming **and** the contrast that was checked for those tokens. Verify both themes at 4.5:1 (normal text) / 3:1 (large text ≥24px or ≥19px bold).

## 📁 Folder Structure

- `app/`: Next.js routes, layouts, `robots.ts`, `sitemap.ts`, and the `/api/og` handler.
- `components/`: Shared layout and presentational components (navbar, footer, legal, roadmap, marketing primitives).
- `config/`: Static content data - `site.ts` (URLs, nav, keywords), `compare.ts` (competitor matrix), `templates.ts` (template catalogue).
- `features/`: Domain-specific marketing logic (landing sections, affiliate, ambassador, pricing, FAQ, roadmap, stats, style guide, templates).
- `hooks/`, `providers/`, `utils/`, `lib/`: Focus trap, theme/motion providers, metadata + JSON-LD builders, server-side API helpers.
- `public/`: Static assets, OG images, and the `llms.txt`/`pricing.md` AI-crawler content layer.

## 🔍 Checks

```bash
npm run lint          # eslint
npm run format        # prettier --check
npm run build         # production build
```

`sitemap.ts` and the roadmap/changelog services fetch from the backend at build time but swallow their own failures, so a backend outage degrades the sitemap to its static routes rather than failing the build.
