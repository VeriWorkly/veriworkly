# VeriWorkly API Server

The backend engine for VeriWorkly — a Node/Express + TypeScript API covering auth, documents, Master Profile, AI writing, ATS scoring, profile import, sharing, billing, the Portfolio product, and the affiliate/ambassador programs. PostgreSQL via Prisma, Redis for caching/rate-limiting/counters/locks.

## Requirements

- Node.js 22, PostgreSQL, and **Redis 7 or later** (the in-handler limiters use `EXPIRE … NX`, which Redis 6 rejects).

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
   npm run db:migrate -w @veriworkly/server
   ```

   On servers run `npm run db:migrate:deploy -w @veriworkly/server` instead. The `db:push` script was removed because it bypasses migrations and leaves the migration history out of step with the database.

   `db:migrate`, `db:drift`, the `seed:*` scripts, `smoke:boot` and the `backfill:*` scripts refuse any database URL whose host is not loopback, whatever `NODE_ENV` says; add `--allow-production` only when you really mean a remote database (`--wipe` is never allowed there).

4. **Start development server**:
   ```bash
   npm run dev:server
   ```

The API will be available at `http://localhost:8080`.

## 🏗️ Architecture

- **Express.js**: Core API framework, clustered across CPU cores in production via `throng`, with graceful shutdown handling per worker.
- **Prisma ORM**: Type-safe PostgreSQL access. See `prisma/schema.prisma` for the full data model — documents, Master Profile, billing/entitlements/credits, portfolios, affiliate/ambassador, roadmap, usage metrics.
- **Redis**: Session cache, rate-limiting, view-count buffering, and distributed locks for scheduled jobs.
- **Better-Auth**: Passwordless email OTP plus Google/GitHub/LinkedIn OAuth, with account linking and sessions shared across subdomains. Sessions are read from Redis (better-auth `secondaryStorage`) and also written to Postgres (`storeSessionInDatabase`), which is the fallback when the Redis copy is missing.
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

## 🔐 Internal server-to-server contract

Server-side callers (studio and portfolio SSR / route handlers, internal jobs) authenticate to the API with one header, `x-internal-key`, compared in constant time against one of two optional secrets. Neither is ever sent to a browser. Each is unset by default (feature off); in production each must be at least 32 characters when set (`openssl rand -hex 32`). They are separate from `INTERNAL_SYNC_API_KEY` (GitHub sync).

| Env var              | Send it when                                                                                                                                  | What it does                                                                                                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_API_KEY`   | Every server-side fetch made on behalf of a browser request (e.g. `lib/server-fetch.ts`), together with `x-forwarded-client-ip: <browser IP>` | The API uses `x-forwarded-client-ip` as the client IP for rate limiting, quotas, request logs and audit, instead of the SSR host's IP. Without a matching key the header is ignored, so a browser cannot spoof its IP with it. The value must be a bare IPv4/IPv6 address; anything else is ignored. |
| `STATS_INTERNAL_KEY` | `POST /api/v1/stats/events` from a trusted server                                                                                             | Marks the call as internal: no `Origin`/API key needed, `custom_*` event names and `value` (1-1000) are accepted. At most 50 distinct custom names per UTC day; a new name past that gets `429`.                                                                                                     |

Rules the callers can rely on:

- A request matches one key per `x-internal-key` header. A stats call sent with `INTERNAL_API_KEY` is treated as public, and an IP-forwarding call sent with `STATS_INTERNAL_KEY` has its `x-forwarded-client-ip` ignored.
- Public `/stats/events` callers (browser origin or any developer API key, whatever its scopes) may only send the allow-listed event names (`KNOWN_EVENTS` in `src/services/analyticsService.ts`); `value` is ignored and every call counts as 1. An unknown name is `400`.
- The two secrets must differ (production refuses to boot when they are equal), and `AUTH_IP_ADDRESS_HEADERS` may never list `x-forwarded-client-ip` (boot error; the parser also drops it), because better-auth would trust it without the key.
- The forwarded IP wins over `TRUST_PROXY` handling, so only send it with the browser's real address (from the incoming request's trusted proxy headers).

## ⏰ Cron jobs

Seven scheduled jobs (`src/jobs/`), each guarded by a Redis distributed lock and reporting its last success to `/health/jobs`: GitHub sync (twice daily), portfolio/share view flush (every 10 minutes), usage-metrics flush (daily), portfolio access job (hourly — grace-period suspension plus abandoned-upload cleanup), credit expiry sweep (hourly at :30), changelog release sync (`CHANGELOG_RELEASE_SYNC_CRON`, default daily at 06:00 UTC), and data retention (daily at 03:15 UTC, see below).

## 🧹 Data retention

`src/jobs/retentionJob.ts` runs daily at 03:15 UTC (no run at startup) under the shared job lock. Each rule is one setting; `0` disables it. Every statement touches at most 5,000 rows picked through an indexed column, and a run stops starting new batches after about 4 minutes, so a large backlog drains over several nights. It logs one line per run with the rows affected per rule, plus any rule that ran out of time or failed (a failing rule never stops the others).

| Rule                                                                                                                                                                 | Setting                                                               | Default                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------- |
| Delete expired `Session` rows                                                                                                                                        | `RETENTION_EXPIRED_SESSION_DAYS`                                      | 1 day after `expiresAt`   |
| Delete expired `Verification` rows                                                                                                                                   | `RETENTION_EXPIRED_VERIFICATION_DAYS`                                 | 1 day after `expiresAt`   |
| Redact `BillingWebhookEvent.payload` to `{ "redacted": true, "type": … }` for PROCESSED rows (row, ids, status and error kept; FAILED and PROCESSING rows untouched) | `RETENTION_WEBHOOK_PAYLOAD_DAYS`                                      | 30 days                   |
| Delete `AuditLog` (request log) rows                                                                                                                                 | `RETENTION_AUDIT_LOG_DAYS` (falls back to `AUDIT_LOG_RETENTION_DAYS`) | 90 days                   |
| Delete `AdminAuditEntry` rows                                                                                                                                        | `RETENTION_ADMIN_AUDIT_DAYS`                                          | 365 days                  |
| Delete COMMITTED, RELEASED and EXPIRED `CreditReservation` rows                                                                                                      | `RETENTION_CREDIT_RESERVATION_DAYS`                                   | 90 days after `updatedAt` |
| Clear `CreditReservation.replay` (the stored AI result a retried request is answered from) on COMMITTED rows; a later retry answers 409                              | `RETENTION_CREDIT_REPLAY_DAYS`                                        | 1 day after `updatedAt`   |
| Delete `ViewFlushBatch` and `UsageMetricFlushBatch` markers                                                                                                          | `RETENTION_FLUSH_BATCH_DAYS`                                          | 7 days                    |
| Delete `AffiliateClick` rows                                                                                                                                         | `RETENTION_AFFILIATE_CLICK_DAYS`                                      | 0 (off)                   |
| Delete `PortfolioViewDaily` rows                                                                                                                                     | `RETENTION_PORTFOLIO_VIEW_DAYS`                                       | 0 (off)                   |
| Set `content` to the marker `{ "purged": true }` on soft-deleted `Document` rows                                                                                     | `RETENTION_DELETED_DOCUMENT_DAYS`                                     | 30 days after `deletedAt` |

Soft-deleted documents keep their row: it is the sync tombstone that tells an offline device the document was deleted (and makes a re-create with that id a 409 instead of a resurrection), and deleting it would cascade away its share link and portfolio publication. A restore (owner or admin) of a document carrying the purge marker answers 410; only the marker decides that, so a document that was simply empty restores, and changing `RETENTION_DELETED_DOCUMENT_DAYS` later never makes a purged one restorable.

Three defaults are deliberately long or off:

- **Credit reservations (90 days).** A reservation row is the idempotency record `reserve()` finds for a repeated `requestId`. Once it is deleted, a late retry reserves again, runs the AI call, and then fails to commit on the `CreditTransaction.requestId` unique constraint (a 500 after the provider was paid). Keep this well past any client retry window.
- **Affiliate clicks (off).** The affiliate dashboard and the admin affiliate stats count every `AffiliateClick` row, so pruning old ones would shrink lifetime click totals the same way.
- **Portfolio views (off).** A portfolio's total views is the sum over its `PortfolioViewDaily` rows, so deleting old rows silently turns "total views" into a rolling window. Enable it only together with a stored lifetime total.

When every rule is `0`, the job is not scheduled and `/health/jobs` reports it as disabled.

## 🧠 Redis memory and limits

- **Every key the server writes has a TTL**, with one deliberate exception: the view-flush batch ids (`share:views:processing:batch-id`, `portfolio:views:buffer:*:processing:batch-id`), which must survive until their batch commits and are deleted with it. Caches go through `cacheSet` (always `SETEX`); view and usage buffers, dedup markers, rate-limit buckets and locks set `EX`/`PX` or `EXPIRE` when written. Keep it that way for new keys. Known exceptions still to fix: the usage-metrics flush batch id (`analyticsService.ts`) and better-auth secondary-storage writes that arrive without a ttl (`auth/index.ts`).
- **Memory ceiling.** Compose runs Redis with `--maxmemory ${REDIS_MAXMEMORY:-256mb} --maxmemory-policy volatile-lru`. That policy evicts any key with a TTL, not only caches: under memory pressure it can also drop buffered view and usage counts, rate-limit buckets and job locks. Once nothing evictable is left, writes fail with OOM. Size `REDIS_MAXMEMORY` so the working set (caches plus a day of buffers) fits with headroom, and treat evictions in `INFO stats` as a signal to raise it. Sessions survive eviction: better-auth stores them in Postgres too (`storeSessionInDatabase`) and falls back to the database when the Redis copy is gone, so an evicted session costs one extra query, not a sign-out. Evicted better-auth rate-limit buckets (`ba-rl:*`) simply restart their window.
- **Rate limiter.** Each Redis call is bounded by `RATE_LIMIT_REDIS_TIMEOUT_MS` (default 400 ms); past it the request is counted in process memory, and after 3 timeouts in a row the limiter skips Redis for 5 s before trying again, except the fail-closed classes (share verify, contact, OTP), which answer 503. Every 429 carries `Retry-After`, including the AI in-flight cap.
- **Autosave class.** `PATCH /api/v1/documents/:id` and `PUT /api/v1/profiles/master` are limited to 600 per 15 minutes per user, counted after authentication (the IP limiter runs before auth, so it only counts these in the per-IP global bucket). A request that reaches the class without a user is keyed on its IP.
- **JSON bodies** are limited to 100 kb. After authentication, documents, profiles (master profile and imports), share create (`POST /shares`) and the portfolio draft (`PUT /portfolios/draft`) accept 4 MB, and `/ai/*` plus ATS `check`/`analyze`/`convert-resume` accept 256 kb. Larger bodies get 413.

## 🐘 Database connections

- **Per-replica budget.** Each cluster worker has its own `pg` pool, so one replica opens up to `WEB_CONCURRENCY × pool size` connections. `DB_POOL_MAX_TOTAL` (default 80 in production) is that per-replica budget; the per-worker pool is `max(2, floor(DB_POOL_MAX_TOTAL / workers))`. The master logs `Database connection budget: <workers> workers x <pool> = <total> of DB_POOL_MAX_TOTAL=<budget>` once at boot.
- **Sizing.** Keep `DB_POOL_MAX_TOTAL × replicas` at or under about 80% of Postgres `max_connections`, leaving room for migrations, `db:studio` and an admin session. Example: `max_connections = 100` and two replicas gives `DB_POOL_MAX_TOTAL=40`.
- **Refusal.** In production the server refuses to boot when the derived pool still overcommits the budget (the floor of 2 per worker against a small budget). Setting `DB_POOL_MAX` explicitly overrides the derived size for the pooler case; an over-budget value then only logs a warning.
- **URLs.** `DATABASE_URL` should be the pooled host (Neon `-pooler`), so the budget above is spent on pooler client slots rather than Postgres backends. `DIRECT_DATABASE_URL` is the direct host and is what `prisma migrate` uses (`prisma.config.ts`).
- **Per-connection settings.** Every connection sets `application_name = veriworkly-api-w<worker id>` (visible in `pg_stat_activity`), `statement_timeout` (`DB_POOL_STATEMENT_TIMEOUT_MS`, 30 s).
- **Idle-in-transaction timeout.** `idle_in_transaction_session_timeout` ends a session left idle inside an open transaction instead of letting it hold locks and a pool slot. `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` sends it per connection, but it is **opt-in with no default**: `pg` sends it as a startup parameter, and a pooler such as Neon's `-pooler` (PgBouncer) can refuse unknown startup parameters ("unsupported startup parameter"), failing every connection. Set it only on a direct Postgres connection. Behind the Neon pooler, set it on the role once instead (it applies to new sessions):

  ```sql
  ALTER ROLE <role> SET idle_in_transaction_session_timeout = '60s';
  ```

## 📈 Monitoring

Two operator endpoints take the `x-internal-key` header (equal to `INTERNAL_API_KEY`, compared in constant time). They answer 401 without the key and 404 when `INTERNAL_API_KEY` is not set. A request carrying the valid key skips the global IP rate limiter, so a scraper is never 429'd; one without it is limited like any other request, so the key cannot be guessed at speed.

- `GET /api/v1/health/metrics`: Prometheus text. Metrics live in each worker's memory, so a scrape sees **one worker per request** (whichever accepted the connection). Aggregate across scrapes with `sum`/`rate` and treat a single sample as one worker. Series: `http_request_duration_seconds{method,route,status_class}` (route is the matched pattern, such as `/api/v1/documents/:id`, or `unmatched` when no route handled the request, including router-level auth refusals), `redis_command_duration_seconds{command="ratelimit_eval"}`, `db_pool_connections{state="total|idle|waiting"}`, `ats_extract_queue_depth`, `ats_extract_queue_max`, `ats_extract_in_flight`, `process_uptime_seconds`.
- `GET /api/v1/health/jobs`: JSON with each job's last success (`views-flush`, `usage-metrics`, `github-sync`, `changelog-sync`, `portfolio-access`, `credit-sweep`, `retention`). Successes are kept in Redis (`jobs:last-success`) as well as in memory, so any worker answers for all of them. A job is `stale: true` when it has not succeeded within twice its schedule (10 min, 24 h, 12 h, 24 h, 1 h, 1 h, 24 h) or has never succeeded and twice its schedule has passed since the jobs baseline (`jobs:baseline` in Redis, written by the first worker to boot and kept by later ones, so a fresh deploy is not reported stale while the daily jobs wait for their first tick); the top-level `stale` is true when any enabled job is. A job that is not scheduled reports `enabled: false` and is never stale: changelog sync with `CHANGELOG_RELEASE_SYNC_ENABLED=false`, GitHub sync when disabled or without `GITHUB_OWNER`/`GITHUB_REPO`, and retention when every rule is `0`. A run in which any step failed is not recorded as a success.

What to alert on (example PromQL):

| Alert                           | Condition                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Job staleness                   | `/health/jobs` returns `"stale": true` (an HTTP check with a body match, or a blackbox-exporter probe)                               |
| Pool waiting for 1 min          | `min_over_time(db_pool_connections{state="waiting"}[1m]) > 0`                                                                        |
| Rate-limiter Redis p95 > 100 ms | `histogram_quantile(0.95, sum by (le) (rate(redis_command_duration_seconds_bucket{command="ratelimit_eval"}[5m]))) > 0.1`            |
| Extract queue at max            | `max_over_time(ats_extract_queue_depth[5m]) >= ats_extract_queue_max`                                                                |
| 5xx rate                        | `sum(rate(http_request_duration_seconds_count{status_class="5xx"}[5m])) / sum(rate(http_request_duration_seconds_count[5m])) > 0.01` |

Counters reset when a worker restarts; `rate()` handles that.

## 🛑 Graceful shutdown and process managers

On SIGTERM or SIGINT each worker stops accepting connections, drains HTTP for up to 10 s and lets a running background job finish for up to 20 s (both in parallel), then closes Redis and Prisma. The cluster master force-kills a worker still alive after 35 s. A process manager must therefore wait **at least 40 s** before its own SIGKILL, or it cuts a flush off mid-transaction:

- **Docker Compose:** `compose.yaml` sets `stop_grace_period: 40s` on `api` (the default is 10 s).
- **pm2:** the default `kill_timeout` is 1600 ms. Set it in the ecosystem file (one pm2 process; the server forks its own workers, so do not use pm2 cluster mode):

  ```js
  // ecosystem.config.js
  module.exports = {
    apps: [
      {
        name: "veriworkly-server",
        script: "dist/index.js",
        cwd: "/path/to/apps/server",
        exec_mode: "fork",
        instances: 1,
        kill_timeout: 40000,
      },
    ],
  };
  ```

  Apply it with `pm2 delete veriworkly-server && pm2 start ecosystem.config.js` (a plain restart keeps the old setting). Without an ecosystem file, start the process with `pm2 start dist/index.js --name veriworkly-server --kill-timeout 40000`.

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

## 💳 Dodo dashboard checklist

The webhook handler trusts the dashboard for what it cannot see in a payload. Confirm each of these in the Dodo Payments dashboard before enabling payments for customers; a wrong setting here changes what a paying customer receives.

| What                         | Where in the dashboard                                                                                                                          | Must be                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product type per plan        | **Products → (product) → Pricing**                                                                                                              | `ai_credits` monthly/annual, `portfolio_pro` monthly/annual and `bundle` monthly/annual are **recurring** products with `subscription_period_count` equal to the billing frequency (1 month / 1 year). The bundle **3-Day Sprint** (`DODO_PAYMENTS_BUNDLE_ONE_DAY_PRODUCT_ID`), the **7-day pass** (`DODO_PAYMENTS_BUNDLE_SEVEN_DAY_PRODUCT_ID`) and both credit packs are **one-time** products. A pass configured as recurring auto-renews against the copy; a plan configured as one-time never sends `subscription.*` events and only grants credits. |
| Product ids                  | **Products → (product)**                                                                                                                        | Each product's id matches the `DODO_PAYMENTS_*_PRODUCT_ID` variable for that plan and interval; the handler resolves the plan from `product_id` first and only falls back to checkout metadata for an id it does not know.                                                                                                                                                                                                                                                                                                                                |
| Webhook endpoint and secret  | **Developer → Webhooks**                                                                                                                        | Endpoint `https://<api-host>/api/v1/billing/webhooks/dodo`, all `subscription.*` and `payment.*` events subscribed, and the endpoint's signing secret (`whsec_…`) set as `DODO_PAYMENTS_WEBHOOK_SECRET`. Unsigned deliveries are refused in every environment.                                                                                                                                                                                                                                                                                            |
| Return URLs                  | Set per checkout by the API from `DODO_PAYMENTS_CHECKOUT_RETURN_URL`, `DODO_PAYMENTS_CHECKOUT_CANCEL_URL` and `DODO_PAYMENTS_PORTAL_RETURN_URL` | All three are `https://` studio URLs in production.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Payout / settlement currency | **Settings → Payouts** (business profile)                                                                                                       | **USD**. Dodo discontinued INR payouts; customers may still pay in INR by UPI. Grants never depend on the settlement currency, so a non-USD settlement is processed and logged at `warn` for an operator to notice.                                                                                                                                                                                                                                                                                                                                       |
| Customer portal plan changes | **Settings → Customer portal**                                                                                                                  | Plan changes and cancellations arrive as `subscription.plan_changed` / `subscription.cancelled`; cancellation keeps access until the paid period ends, which is what the cancellation email promises.                                                                                                                                                                                                                                                                                                                                                     |
