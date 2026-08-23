# VeriWorkly Resume Studio

The primary authenticated workspace (app.veriworkly.com) — resumes and cover letters, the Master Profile, the ATS checker, AI writing assistance, GitHub/LinkedIn import, sharing, billing/credits, developer API keys, and the affiliate/ambassador dashboards. Built with Next.js 16, Zustand, and Tailwind CSS 4.

## 🚀 Quick Start

1. **Install dependencies** (from monorepo root):

   ```bash
   npm install
   ```

2. **Setup environment variables**:
   Copy the example environment file:

   ```bash
   cp apps/studio/.env.example apps/studio/.env
   ```

   ```env
   SITE_URL=http://localhost:3000
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080/api/v1
   BACKEND_INTERNAL_URL=http://localhost:8080/api/v1
   ADMIN_EMAIL=example@veriworkly.com
   AUTH_SECRET=your-secure-secret
   ```

3. **Start development server**:
   ```bash
   npm run dev:studio
   ```

The app will be available at `http://localhost:3001`.

## 🏗️ Architecture

- **Next.js 16 (App Router)**: Server Components for initial load, Client Components for the editors.
- **Zustand**: Local-first state for the document being edited, with localStorage persistence and a background cloud-sync engine (retry handling, per-document conflict detection, opt-out).
- **react-pdf** / `docx`: Powers fully client/server-JS document export — no headless-browser dependency.
- **Dual-Engine Templates**: Each template contains separate logic for Web (`web.tsx`) and PDF (`pdf.tsx`) to keep visual parity between the live preview and the exported file.
- **Better-Auth Client**: Handles the passwordless OTP login flow plus OAuth.

## 📦 What's in here

Beyond the resume editor (Executive Clarity, Precision ATS, Modern Minimal, Timeline Focus, Corporate Brief, Bold Impact, VeriWorkly Special) and cover letter editor (Professional, VeriWorkly Special, Minimalist, Executive, ATS Essential):

- **Master Profile** (`/profile/master`, `/profile/advanced`) — the single canonical career-facts record every new document auto-seeds from. Editing a document never writes back to it (the one-way rule) — only an explicit import-with-replace or a direct Master Profile edit updates it.
- **Import** — generic JSON, hand-authored Markdown, file extraction (PDF/DOCX/TXT/MD/JSON), GitHub OAuth import (real API, deterministic mapping, free tier capped 1x/day), and LinkedIn paste/PDF import (AI-parsed, not an API integration, free tier capped 1x/month).
- **ATS Checker** (`/ats`) — a deterministic core scan (free, no AI cost) plus an AI-powered deep-analysis layer; both draw from the same scan-quota bucket. Quotas: 1/48h anonymous, 2/24h free, 300/billing-period paid.
- **AI writing assistant** — "Improve with AI" across the editors, Standard/Expert modes with cost shown before generating, dynamically routed across Anthropic Claude and OpenAI GPT models.
- **Sharing** — password-protected, expiring, revocable public links (`/share/{username}/{slug}`) with view analytics.
- **Export** — PDF, DOCX, HTML, Markdown, plain text, JSON.
- **Credits & billing** (`/credits`, `/billing`, `/checkout`) — wallet balance, per-action costs, transaction history, plan/entitlement management, credit top-up purchase.
- **Developer API keys** (`/api-keys`) — self-serve key creation, scoping, rotation, and revocation.
- **Affiliate & Ambassador dashboards** (`/affiliate`, `/ambassador`) — feature-flag gated; show a "Coming Soon" screen when the corresponding flag is off in production.
- **Admin tools** (`/admin/*`) — usage metrics, GitHub repo stats, the monetization console, roadmap CMS — real role-gated, not just client-hidden.

## 📁 Folder Structure

- `app/`: Next.js routes and layouts.
- `components/`: UI components (Editor panels, Previewer, etc.).
- `features/`: Domain-specific logic (documents, ATS, AI, billing, affiliate, ambassador, admin).
- `templates/`: Dual-engine resume/cover-letter templates (`pdf.tsx`, `web.tsx`).
- `public/`: Static assets and template previews.

## 📖 Full Documentation

For a deep dive into the builder's architecture and template system, visit [docs.veriworkly.com/docs/architecture/monorepo](https://docs.veriworkly.com/docs/architecture/monorepo).
