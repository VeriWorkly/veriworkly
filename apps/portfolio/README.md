# VeriWorkly Portfolio

The public portfolio/website builder — public template gallery + marketing, an authenticated editor/dashboard, and the published portfolio sites themselves (served on `*.veriworkly.com` subdomains and at `portfolio.veriworkly.com/portfolio/{slug}`). Private template implementations are mounted as a Git submodule at `template-library/`.

Routes: the marketing pages and the workspace live under `app/(platform)/`, the published sites under `app/(published)/portfolios/[username]/[[...slug]]`. Each group has its own root layout, so a published site carries none of the platform's metadata, scripts or toaster, and `app/global-not-found.tsx` renders URLs that match no route. Published pages are ISR: rendered on first visit, cached for an hour, and refreshed when the API calls `POST /api/revalidate` (with `PORTFOLIO_REVALIDATE_SECRET`) after a publish, unpublish, takedown, deletion or billing change.

## 🚦 Current rollout status

Portfolio is fully built and working, being brought to general availability in stages. The authenticated workspace (dashboard, editor, analytics, settings, profile) is already open to **every logged-in user in production**. The remaining step is opening **publishing** and **checkout** to every account — both are currently staged behind a server-only `ADMIN_EMAIL` check while the launch path gets validated end-to-end. Draft editing and unpublishing an already-live site are unaffected and open to everyone.

## 🎨 Templates

Four templates, sourced from the private submodule and rendered server-side:

| Template    | Personality                                                                                  | Access         |
| ----------- | -------------------------------------------------------------------------------------------- | -------------- |
| **Signal**  | Structured, technical — dual dark/light theme, real local-time display in the hero           | Free (default) |
| **Atelier** | Expressive, editorial — print/magazine-style masonry, serif headlines                        | Free           |
| **Nimbus**  | Atmospheric, tech-editorial — cursor-follow ring, text-scramble hover, no cards/shadows/blur | Premium        |
| **Cipher**  | Interactive terminal emulator with command autocomplete and hidden easter eggs               | Premium        |

## ✏️ Editor

A three-pane workspace (structure / content / live `<iframe>` preview; Structure / Content / Preview tabs below `lg`) supporting 18 section types. Autosave (every 12 seconds) and the leave-page warning live in `WorkspaceProvider`, so the dashboard and Settings are covered and leaving the editor saves at once. Save states: Saved / Saving / Unsaved changes / Not saved (reason) / Conflict, which pauses autosave until the owner picks "Load cloud copy" or "Keep mine". The editor mirrors the server limits (`lib/portfolio-limits.ts`), confirms deletes, lists missing details before publishing with "Go there", saves before opening a preview, and reads `?template=` once. Settings saves just the draft, never publishing ("Saved. Publish to update your live site." on a live site); the server validates against the same list (owned by `profile-core`). Paid plans (Creator Pro, the Job Hunter Bundle or a pass) additionally get multi-page portfolios (dedicated Work/Writing/About/Contact pages plus auto-generated per-project detail pages).

## 📈 Publishing, analytics & watermark

- Every portfolio, free or paid, is served on its own subdomain (`your-slug.veriworkly.com`); the platform path (`portfolio.veriworkly.com/portfolio/your-slug`) still resolves and names the subdomain as canonical.
- Free sites use Signal or Atelier and show a "Built with VeriWorkly" badge. Paid plans (Creator Pro, the Job Hunter Bundle or a 3-Day / 7-Day pass) add Nimbus and Cipher, badge removal, visitor analytics, SEO controls and multi-page portfolios. Prices: `public/pricing.md`.
- Analytics (views, trend, referrers) is premium-gated, with distinct locked states for logged-out visitors vs. logged-in free users.
- A "Built with VeriWorkly" badge appears on every free-tier published portfolio; paid portfolio access gets a per-portfolio removal toggle on any template. The badge links to veriworkly.com with UTM tags.
- Paid features in the workspace follow one rule, `hasPortfolioAccess(billing)` = the server's `canPublish` (Creator Pro, the Bundle or an active pass). An AI Credits plan or a credit pack gets the free rules.
- The dashboard and Settings show one status card (not published, live, grace until a date, offline with the reason from `offlineReason`, or taken down) with Publish or Republish. Both pages also offer Unpublish, after a confirmation, while the site is online.

## Setup

Clone with the private templates (maintainers/submodule access):

```bash
git clone --recurse-submodules git@github.com:VeriWorkly/veriworkly.git
```

For an existing checkout:

```bash
git submodule update --init --recursive
```

### Stand-in Mock Templates (Open-Source Contributors)

If you do not have SSH access to the private `VeriWorkly/portfolio-templates` repository, you can scaffold a stand-in mock template library to run and test `apps/portfolio` locally (run from the repository root):

```bash
node scripts/mock-template-library.mjs
```

This generates placeholder components in `apps/portfolio/template-library/` matching the full schema, allowing CI and local development to run without private repository access. The tests that render the real templates skip on the mock and say why.

A production build refuses the mock: `next.config.ts` throws when `template-library/registry.ts` is the mock and `CI` is not set. CI sets it and builds the mock on purpose; a real deploy must have the real submodule.

## Add A Template

1. Add a folder in `template-library/` with its own React component, a `design.ts` detail file and optional scoped stylesheet.
2. Add one entry in `template-library/registry.ts` with its metadata, `isPremium` flag, `design` and dynamic `loader`. The public gallery (`templates/catalog/templates.ts`) is derived from the registry; do not edit it.
3. Add its gallery image at `public/templates/<id>-template-preview.png` and its share card at `app/api/template/<id>/og/route.tsx`.
4. Register the new id in `PORTFOLIO_TEMPLATE_IDS` in `apps/server/src/validators/portfolioValidator.ts`, plus `PREMIUM_PORTFOLIO_TEMPLATE_IDS` and a free fallback in `FREE_TEMPLATE_FOR_PREMIUM` (`apps/server/src/services/portfolioService.ts`) if it is premium.
5. Commit and push the private repository first.
6. Commit the updated submodule pointer in this repository.

Do not import template styles from `app/globals.css`. Template modules own their styles so Next.js can emit per-template assets.

## Production Deployment

Portfolio publishing requires:

1. Point `portfolio.veriworkly.com` and `*.veriworkly.com` at the portfolio Next.js deployment.
2. Provision TLS coverage for `portfolio.veriworkly.com` and `*.veriworkly.com`.
3. Configure `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_INTERNAL_URL`, `SITE_URL` and `PORTFOLIO_REVALIDATE_SECRET` (same value as the API's; unset, `/api/revalidate` answers 503 and published pages only refresh hourly).
4. Run `git submodule update --init` before building, so the build uses the pinned real templates.
5. Configure the server Dodo Payments and Cloudflare R2 variables documented in `apps/server/.env.example`.
6. Set the auth cookie domain to `.veriworkly.com` so Studio and Portfolio share the signed-in session.
7. Set `ADMIN_EMAIL` to control the publish/checkout rollout gate described above — fail-closed if unset.

Only VeriWorkly subdomains are supported at launch. Custom-domain routing and certificate automation are intentionally out of scope.
