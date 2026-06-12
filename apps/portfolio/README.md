# VeriWorkly Portfolio

The public portfolio platform. Private template implementations are mounted as a Git submodule at `template-library/`.

## Setup

Clone with the private templates:

```bash
git clone --recurse-submodules git@github.com:VeriWorkly/veriworkly.git
```

For an existing checkout:

```bash
git submodule update --init --recursive
```

The private repository uses GitHub SSH access. The machine running development or deployment must trust GitHub's SSH host key and have access to `VeriWorkly/portfolio-templates`.

## Add A Template

1. Add a folder in `template-library/` with its own React component and optional scoped stylesheet.
2. Add one dynamic loader entry in `template-library/registry.ts`.
3. Add public gallery metadata in `templates/catalog/templates.ts`.
4. Commit and push the private repository first.
5. Commit the updated submodule pointer in this repository.

Do not import template styles from `app/globals.css`. Template modules own their styles so Next.js can emit per-template assets.

## Production Deployment

Portfolio publishing requires:

1. Point `portfolio.veriworkly.com` and `*.veriworkly.com` at the portfolio Next.js deployment.
2. Provision TLS coverage for `portfolio.veriworkly.com` and `*.veriworkly.com`.
3. Configure `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_INTERNAL_URL`.
4. Configure the server Dodo Payments and Cloudflare R2 variables documented in `apps/server/.env.example`.
5. Set the auth cookie domain to `.veriworkly.com` so Studio and Portfolio share the signed-in session.

Only VeriWorkly subdomains are supported at launch. Custom-domain routing and certificate automation are intentionally out of scope.
