# VeriWorkly Portfolio

The public portfolio/website builder — public template gallery + marketing, an authenticated editor/dashboard, and the published portfolio sites themselves (served on `*.veriworkly.com` subdomains and at `portfolio.veriworkly.com/portfolio/{slug}`). Private template implementations are mounted as a Git submodule at `template-library/`.

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

A three-pane workspace (structure / content / live `<iframe>` preview) autosaving every 12 seconds, supporting 18 section types. **Note:** the backend's publish-time content validator currently only accepts 9 of those 18 (`projects, experience, services, skills, education, writing, testimonials, awards, contact`) — using one of the other 9 will fail validation at publish time. Premium users additionally get multi-page portfolios (dedicated Work/Writing/About/Contact pages plus auto-generated per-project detail pages).

## 📈 Publishing, analytics & watermark

- Free: published at a shared path (`portfolio.veriworkly.com/portfolio/your-slug`).
- Premium: a true custom subdomain (`your-slug.veriworkly.com`), enforced at the routing layer.
- Analytics (views, trend, referrers) is premium-gated, with distinct locked states for logged-out visitors vs. logged-in free users.
- A "Built with VeriWorkly" watermark appears on every free-tier published portfolio; premium gets a per-portfolio removal toggle.

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

If you do not have SSH access to the private `VeriWorkly/portfolio-templates` repository, you can scaffold a stand-in mock template library to build, run, and test `apps/portfolio` locally:

```bash
node scripts/mock-template-library.mjs
```

This generates placeholder components in `apps/portfolio/template-library/` matching the full schema, allowing CI and local development to run without private repository access.

## Add A Template

1. Add a folder in `template-library/` with its own React component and optional scoped stylesheet.
2. Add one dynamic loader entry in `template-library/registry.ts`.
3. Add public gallery metadata in `templates/catalog/templates.ts`.
4. Register the new `templateId` in the backend validator: `apps/server/src/validators/portfolioValidator.ts` (`templateId: z.enum([...])`).
5. Commit and push the private repository first.
6. Commit the updated submodule pointer in this repository.

Do not import template styles from `app/globals.css`. Template modules own their styles so Next.js can emit per-template assets.

## Production Deployment

Portfolio publishing requires:

1. Point `portfolio.veriworkly.com` and `*.veriworkly.com` at the portfolio Next.js deployment.
2. Provision TLS coverage for `portfolio.veriworkly.com` and `*.veriworkly.com`.
3. Configure `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_INTERNAL_URL`.
4. Configure the server Dodo Payments and Cloudflare R2 variables documented in `apps/server/.env.example`.
5. Set the auth cookie domain to `.veriworkly.com` so Studio and Portfolio share the signed-in session.
6. Set `ADMIN_EMAIL` to control the publish/checkout rollout gate described above — fail-closed if unset.

Only VeriWorkly subdomains are supported at launch. Custom-domain routing and certificate automation are intentionally out of scope.
