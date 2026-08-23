# Environment Variables Configuration

VeriWorkly uses a multi-app monorepo structure where each application and the root workspace define specific `.env.example` templates.

---

## 🔑 Workspace Environment Configurations

### 1. Root Monorepo (`.env`)

- `NODE_ENV`: Runtime environment (`development`, `production`, `test`).
- `PORT`: Port bindings for multi-workspace coordination.

### 2. Backend Server (`apps/server/.env`)

- `DATABASE_URL`: PostgreSQL connection string (supports Neon / Supabase / local PostgreSQL).
- `AUTH_SECRET`: Random 32+ character secure secret for Better-Auth encryption.
- `REDIS_URL`: **Required.** Backs Better-Auth secondary session storage, API rate limiting, ATS and profile import quotas, view count buffers, and distributed cron job locks.
- `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USER`, `AUTH_SMTP_PASS`, `AUTH_SMTP_FROM`: SMTP credentials for passwordless email OTP authentication.
- `ADMIN_EMAIL`: Email address of the administrative superuser.
- `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`: Dodo Payments API and webhook credentials.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`: Cloudflare R2 bucket credentials for portfolio media asset uploads.
- `AI_GATEWAY_AUTH_TOKEN`: Private API token for frontier LLM routing.

### 3. Builder Studio (`apps/studio/.env`)

- `SITE_URL`: Marketing site base URL (default: `http://localhost:3000`).
- `NEXT_PUBLIC_BACKEND_URL`: Public API endpoint for browser calls (default: `http://localhost:8080/api/v1`).
- `BACKEND_INTERNAL_URL`: Server-side API endpoint for Next.js SSR requests (default: `http://localhost:8080/api/v1`).
- `NEXT_PUBLIC_PORTFOLIO_URL`: Portfolio builder workspace URL (default: `http://localhost:3004`).
- `ADMIN_EMAIL`: Matches server admin email for admin UI surfaces.
- `AUTH_SECRET`: Matches server auth secret.

### 4. Marketing Site (`apps/site/.env`)

- `NEXT_PUBLIC_SITE_URL` / `SITE_URL`: Canonical public site origin (default: `http://localhost:3000`).
- `NEXT_PUBLIC_BACKEND_URL`: Public API endpoint (default: `http://localhost:8080/api/v1`).
- `BACKEND_INTERNAL_URL`: Server-side API endpoint (default: `http://localhost:8080/api/v1`).
- `ADMIN_EMAIL`: Admin email for checkout/pricing preview bypass.
- `AFFILIATE_PROGRAM_ENABLED`, `AMBASSADOR_PROGRAM_ENABLED`: Boot-time feature flags for growth programs.

### 5. Portfolio Builder (`apps/portfolio/.env`)

- `SITE_URL`: Public origin for portfolio app (default: `http://localhost:3004`).
- `NEXT_PUBLIC_PORTFOLIO_URL`: Studio app URL (default: `http://localhost:3001`).
- `NEXT_PUBLIC_BACKEND_URL`: Public API endpoint (default: `http://localhost:8080/api/v1`).
- `BACKEND_INTERNAL_URL`: Server-side API endpoint (default: `http://localhost:8080/api/v1`).
- `ADMIN_EMAIL`: Admin email for checkout/publish staging gate bypass.
- `PORTFOLIO_REVALIDATE_SECRET`: Secret token for Next.js on-demand ISR revalidation.

### 6. Documentation Platform (`apps/docs-platform/.env`)

- `SITE_URL`: Docs origin URL (default: `http://localhost:3002`).
- `NEXT_PUBLIC_BACKEND_URL`: Public API endpoint (default: `http://localhost:8080/api/v1`).
- `BACKEND_INTERNAL_URL`: Server-side API endpoint (default: `http://localhost:8080/api/v1`).
- `ALLOWED_ORIGINS`: Allowed origins for API proxy.

### 7. Blog Platform (`apps/blog-platform/.env`)

- `SITE_URL`: Blog origin URL (default: `http://localhost:3003`).
- `NEXT_PUBLIC_BACKEND_URL`: Public API endpoint (default: `http://localhost:8080/api/v1`).
- `BACKEND_INTERNAL_URL`: Server-side API endpoint (default: `http://localhost:8080/api/v1`).

---

## 📚 Complete Operations Reference

For exhaustive configuration parameters, defaults, and deployment guides, visit:
[Environment Variables Guide - VeriWorkly Docs](https://docs.veriworkly.com/docs/operations/environment-variables)
