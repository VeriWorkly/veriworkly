# VeriWorkly Blog Platform

The VeriWorkly blog at [blog.veriworkly.com](https://blog.veriworkly.com), built with Next.js and Fumadocs.

## Quick start

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `SITE_URL`.

3. Start development:

   ```bash
   npm run dev:blog
   ```

The blog runs at `http://localhost:3003`.

## Environment

| Variable   | Required              | Purpose                                                                                                                    |
| ---------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL` | Yes, for `next build` | Public origin with no trailing slash. Canonicals, feeds, the sitemap and OG image URLs use it. The build fails when unset. |

## Content

Posts are MDX files in `content/blog/`. Frontmatter is validated by `lib/blog-frontmatter.ts`, and every `author` value must have an entry in `lib/authors.ts`. Editorial rules are in `content/CONTENT-STRATEGY.md`.

## Documentation

For more, see the [documentation platform](https://docs.veriworkly.com).
