# VeriWorkly Documentation Platform

The source for [docs.veriworkly.com](https://docs.veriworkly.com). Built with Next.js 16 and
[Fumadocs](https://fumadocs.dev).

## Quick start

From the repository root:

```bash
npm install
npm run dev:docs
```

The docs are served at **http://localhost:3002**.

## Content structure

```
content/
├── docs/                  Hand-written documentation (MDX), served at /docs
│   ├── meta.json          Sidebar order and section separators
│   ├── getting-started/
│   ├── architecture/
│   ├── product/           Product guides
│   ├── user-guides/
│   ├── operations/
│   ├── contributing/
│   └── legal/
├── ats-engine/            ATS Engine docs, served at /ats-engine
│   ├── meta.json
│   ├── reference/         rubric, locales and the type tables are generated
│   └── project/           changelog.md is generated
└── api-reference/         Operation pages generated from the OpenAPI spec, served at /api-reference
    └── meta.json
specs/                     Source OpenAPI fragments
openapi.yaml               Bundled spec (generated)
scripts/
├── generate-api-docs.mjs     specs/ -> openapi.yaml, public/openapi.*, content/api-reference/
├── generate-engine-docs.mjs  @veriworkly/ats-engine -> the generated ATS Engine pages
└── check-engine-samples.mjs  type-checks every TypeScript sample in content/ats-engine/
```

### Writing documentation

Add or edit an `.mdx` file under `content/docs/` (or `content/ats-engine/`), then register its
path in that folder's `meta.json`. **Sidebar order comes from `meta.json`, not from the folder
structure**: a page absent from `meta.json` will not appear in the navigation.

Each page needs frontmatter:

```mdx
---
title: Page Title
description: One sentence describing the page. Used for search and social cards.
---
```

These components are available without importing them (`components/mdx.tsx`): `Callout`,
`Card`, `Cards`, `Accordion`, `Accordions`, `Tab`, `Tabs`, `TypeTable`, `CodeBlockTab`,
`CodeBlockTabs`, `CodeBlockTabsList`, `CodeBlockTabsTrigger`, and the ATS Engine helpers
`EngineSize` and `EngineVersion`. `Steps`/`Step` and `Files`/`Folder`/`File` are imported
from `fumadocs-ui/components/*` in the page that uses them.

### Regenerating the API reference

`content/api-reference/` is generated: only the hand-written `index.mdx`, `overview.mdx` pages
and `meta.json` files in it are authored by us. Edit the fragments under `specs/`; **generation
then happens automatically**, because `npm run dev` and `npm run build` in this workspace both run
`generate:api` and `generate:engine` first (via `predev` / `prebuild`). The bundled
`openapi.yaml` and the operation pages can never drift from the spec.

To run it on its own, from this workspace or from the repository root:

```bash
npm run generate:api
```

That does three things, all in `scripts/generate-api-docs.mjs`:

1. Bundles `specs/openapi.yaml` (plus `specs/paths/*` and `specs/components/*`) into one spec,
   resolving every `$ref` and failing loudly on a broken one.
2. Regenerates one MDX page per operation under `content/api-reference/`. Pages are built in a
   temporary folder first and only the ones that changed are written, so a failed run leaves the
   existing pages alone; pages for operations that no longer exist are removed. It warns when a
   page is missing from its folder's `meta.json`, because that page would not appear in the sidebar.
3. Only after the pages succeed, writes `openapi.yaml` and the served copies `public/openapi.json`
   and `public/openapi.yaml`. The other apps do not carry a copy: their `/openapi.json` redirects
   here.

Step 1 replaces `npx @redocly/cli bundle`, which required a network install; the output is
byte-for-byte equivalent.

### Regenerating the ATS Engine reference

`npm run generate:engine` rebuilds the generated ATS Engine pages from the installed
`@veriworkly/ats-engine`: the rubric, the locales, the option and report type tables, and the
changelog. Edit the engine or the generator, never those pages. `npm run check:engine-samples`
type-checks every TypeScript sample on the ATS Engine pages against the same package.

## Accuracy policy

Documentation here describes shipped behaviour. Before documenting a limit, quota, default, or gate,
verify it against the code. Quotas live in `apps/server/src/services/*QuotaService.ts`, plan
definitions in `apps/server/src/services/productCatalog.ts`, configuration defaults in
`apps/server/src/config.ts`, and the data model in `apps/server/prisma/schema.prisma`.

Where behaviour is surprising, partially rolled out, or known-broken, say so in a `<Callout>` rather
than omitting it.

## Live site

[docs.veriworkly.com](https://docs.veriworkly.com)
