# VeriWorkly API Server

The backend engine for VeriWorkly — a Node/Express + TypeScript API covering auth, documents, Master Profile, AI writing, ATS scoring, profile import, sharing, billing, the Portfolio product, and the affiliate/ambassador programs. PostgreSQL via Prisma, Redis for caching/rate-limiting/counters/locks.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root):

   ```bash
   npm install
   ```

2. **Setup environment variables**:
   Create a `.env` file in `apps/server/` (see `.env.example` for the full list, including Dodo Payments and Cloudflare R2 credentials):

   ```env
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://localhost:6379
   AUTH_SECRET=your-secure-secret
   ```

3. **Initialize the Database**:

   ```bash
   npm run db:push -w @veriworkly/server
   ```

4. **Start development server**:
   ```bash
   npm run dev:server
   ```

The API will be available at `http://localhost:8080`.

## 🏗️ Architecture

- **Express.js**: Core API framework, clustered across CPU cores in production via `throng`, with graceful shutdown handling per worker.
- **Prisma ORM**: Type-safe PostgreSQL access. See `prisma/schema.prisma` for the full data model — documents, Master Profile, billing/entitlements/credits, portfolios, affiliate/ambassador, roadmap, usage metrics.
- **Redis**: Session cache, rate-limiting, view-count buffering, and distributed locks for scheduled jobs.
- **Better-Auth**: Passwordless email OTP plus Google/GitHub/LinkedIn OAuth, with account linking and Postgres-backed sessions shared across subdomains.
- **Dodo Payments**: Subscriptions, one-off credit-pack purchases, and a customer billing portal, driven by idempotent webhook processing.
- **Cloudflare R2**: Presigned-URL uploads for portfolio images, with a verify-on-complete step and abandoned-upload garbage collection.

## 📦 What this API actually covers

Beyond auth and core document CRUD (soft-delete only — hard-delete/restore exist at the service layer but aren't routed yet):

- **Master Profile** (`/profiles/master`) — one JSON record per user, no entitlement gating, auto-seeds new documents.
- **ATS Checker** (`/ats`) — a deterministic core scan plus an AI-powered deep-analysis layer sharing one scan-quota bucket, with SSRF-hardened job-description URL fetching.
- **AI writing** (`/ai`) — rewriting, section generation, tailoring, and portfolio copy, dynamically routed across Anthropic Claude and OpenAI GPT models, backed by a two-phase reserve→commit/release credit flow.
- **Profile import** (`/profiles/import/github`, `/profiles/import/linkedin`) — GitHub is real OAuth with a hidden 50/day paid-tier cap protecting the shared API token; LinkedIn is AI-parsed paste/PDF text, not an API integration.
- **Sharing** (`/shares`) — password-protected (scrypt), expiring, revocable public links with view analytics.
- **Billing** (`/billing`) — entitlements and the AI credit wallet as two separate systems, whitelisted checkout, Dodo webhook processing.
- **Portfolios** (`/portfolios`, `/portfolio-assets`) — publish/unpublish, analytics, R2-backed asset uploads.
- **Affiliate & Ambassador** (`/affiliates`, `/ambassador`) — both gated by a boot-time feature-flag (`config.growth.*Enabled`), returning `503` when off. Affiliate is fully live (3-tier commissions, manual payouts); Ambassador covers application intake (`GET /me`, `POST /apply`) plus a full admin review workflow — the rewards/points economy is not built yet.
- **Roadmap** (`/roadmap`) — public read-only roadmap data; writes live under `/admin/roadmap`. Votes/bookmarks/comments have a data model and are read-visible but have no write route.
- **Developer API keys** (`/api-keys`) — HMAC-SHA256-hashed, scoped (including `ai:write`), auto-expiring, force-invalidated within 5 minutes of a subscription lapsing.
- **Admin tools** (`/admin/*`) — one router covering users, ambassadors, affiliates, portfolios, documents, share links, billing, API keys, the audit log, system/ops, and the roadmap + changelog CMS. `adminAuthMiddleware` is applied once at the router root, so every sub-route is gated by construction, and each mutating endpoint requires an audit reason and writes an `AdminAuditEntry`.

## ⏰ Cron jobs

Five scheduled jobs (`src/jobs/`), each guarded by a Redis distributed lock: GitHub sync (twice daily), portfolio/share view flush (every 10 minutes), usage-metrics flush (daily), portfolio access job (hourly — grace-period suspension plus abandoned-upload cleanup), and changelog release sync (`CHANGELOG_RELEASE_SYNC_CRON`, default daily at 06:00 UTC).

## 📁 Folder Structure

- `src/`: TypeScript source code.
  - `auth/`: Better-Auth configuration and mailers.
  - `jobs/`: Scheduled background tasks.
  - `routes/`: Express route definitions (see `src/routes/` for the full list of route groups). Admin routes live in `routes/admin/`, mounted through a single gated router.
  - `controllers/` / `services/`: Request handling and business logic layers, each with an `admin/` subdirectory mirroring the admin route groups.
  - `validators/`: Zod request schemas, with `validators/admin/` covering the admin surface.
  - `middleware/`: Auth, admin gating, rate limiting, feature flags.
- `prisma/`: Database schema and migrations.

## 📖 Full Documentation

For API reference and database details, visit [docs.veriworkly.com/api-reference](https://docs.veriworkly.com/api-reference).
