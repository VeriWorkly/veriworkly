# VeriWorkly — Product Reference

**Purpose of this file:** a single, exhaustive source of truth for what VeriWorkly is, what it currently does, and where it's going.

Everything under "Current Features" below is verified directly against the codebase (routes, controllers, services, middleware, Prisma schema, feature folders, config) as of **2026-08-23**, on branch `master`. Everything under "Vision & Roadmap" is direction, not a shipped guarantee. Where the doc's earlier version turned out to be stale, where marketing copy overpromises what's actually built, or where the code itself is internally inconsistent, that's called out explicitly in [Known Gaps & Inconsistencies](#known-gaps--inconsistencies) rather than papered over.

**Status of the public docs:** `docs-platform` (docs.veriworkly.com) was audited page-by-page against the codebase and fully rewritten — its `content/docs` tree is current. `blog-platform` has 21 published posts and its architecture post is accurate. `apps/site`'s machine-readable layer (`llms.txt`, `pricing.md`) has also caught up on the licensing and credit-pack numbers that previously disagreed with the backend.

> **Maintenance rule:** this file cannot lie. If you change a quota, price, entitlement, route, default, or gate in code, update the corresponding claim here in the same PR. When a claim here is found to be stale, correct it _and_ record what it used to say — the [Known Gaps](#known-gaps--inconsistencies) list keeps closed items visible rather than deleting them, so this file's own history stays auditable.
>
> **Last full re-verification:** 2026-08-23. Items marked ✅ RESOLVED in Known Gaps were re-checked against code on that date and confirmed fixed.

**A note on pace of change:** VeriWorkly ships fast, and this file goes stale faster than it looks. The 2026-07-29 re-verification found **eight** claims in the 2026-07-24 version that had already become wrong in five days — including the export dispatcher, section reordering, the theme picker, the credit-pack catalog, the ambassador application schema, and the cron job count. Two more (`multiple share links per document`, and the health endpoint's behaviour) had been wrong all along.

The practical consequence: **treat any claim here as provisional if it hasn't been re-verified recently, and check the code before repeating a specific number, quota, route, or default externally.** Sections most prone to drift, in order: Ambassador (mid-rollout), Pricing (catalog + UI change independently), Portfolio (`apps/portfolio` is actively being brought to general availability — see §5), and the Known Gaps list itself.

All features described below are real, built, and working — some are available to every user, others are being brought to full public availability in stages (Portfolio's publish/checkout step, the Ambassador program's rewards layer).

---

## Table of Contents

1. [Overview](#overview)
2. [Vision & Values](#vision--values)
3. [Core Architecture Concepts](#core-architecture-concepts)
4. [Document Builder (Studio) — Feature Catalog](#document-builder-studio--feature-catalog)
5. [Portfolio Builder — Feature Catalog](#portfolio-builder--feature-catalog)
6. [Affiliate & Ambassador Programs](#affiliate--ambassador-programs)
7. [Marketing Site (site) — Feature Catalog](#marketing-site-site--feature-catalog)
8. [Platform / Backend Capabilities](#platform--backend-capabilities)
9. [Pricing & Monetization](#pricing--monetization)
10. [Known Gaps & Inconsistencies](#known-gaps--inconsistencies)
11. [Vision & Roadmap](#vision--roadmap)
12. [Documentation & Content Debt](#documentation--content-debt)
13. [Appendix: Data Model Reference](#appendix-data-model-reference)
14. [Change log for this file](#change-log-for-this-file)

---

## Overview

VeriWorkly is a privacy-first career workspace: a resume and cover letter builder, a public portfolio/website builder, and the AI and career tooling (ATS scoring, AI rewriting, profile import) that connects them — all built around one shared **Master Profile** so a user's career facts live in one place and flow into every document and every portfolio, without login being required to start.

**Monorepo layout** (`apps/`):

| App             | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site`          | Public marketing site (veriworkly.com) — landing, pricing, features, how-it-works, roadmap, FAQ, affiliate/ambassador program pages, security/responsible-disclosure page, public GitHub-activity stats page, public style guide, legal pages, and a machine-readable "AI answer engine" content layer (see §7).                                                                                                                                    |
| `studio`        | The document builder and authenticated workspace (app.veriworkly.com) — resumes, cover letters, Master Profile, ATS checker, AI tools, sharing, billing, API keys, affiliate/ambassador dashboards, admin.                                                                                                                                                                                                                                          |
| `portfolio`     | The portfolio/website builder — public template gallery + marketing, authenticated editor/dashboard, and the published portfolio sites themselves (served on `*.veriworkly.com` subdomains and at `portfolio.veriworkly.com/portfolio/{slug}`).                                                                                                                                                                                                     |
| `server`        | Node/Express + TypeScript API backing everything above — auth, documents, billing, AI, ATS, sharing, portfolios, affiliate/ambassador programs, roadmap, admin. PostgreSQL via Prisma, Redis for caching/rate-limiting/counters/locks, plus a set of scheduled background jobs (see §8).                                                                                                                                                            |
| `docs-platform` | Technical/user documentation site (docs.veriworkly.com), built on Fumadocs. Fully rewritten and verified against code on 2026-07-29 — see [Documentation & Content Debt](#documentation--content-debt). Its production build is currently broken by a dependency conflict (see [Known Gaps](#known-gaps--inconsistencies) #20).                                                                                                                     |
| `blog-platform` | Official blog (blog.veriworkly.com) with 21 published posts and an accurate multi-app architecture guide.                                                                                                                                                                                                                                                                                                                                           |
| `packages/ui`   | Shared internal design-system/component library (`@veriworkly/ui`) — primitives (Card, Menu, Badge, Input, Modal, Button, Select, Switch, Tooltip, TextArea, Checkbox, Accordion), layout shells (AppShell, Container, MarketingFooter, the full marketing navbar suite), a ThemeToggle, SocialIcons, and the shared light/dark theme token set (`styles/themes.css`). Consumed by `site`, `docs-platform`, `blog-platform`, and parts of `studio`. |

**Tech stack** (versions verified against `package.json` on 2026-07-29): **Next.js 16.2.12** (App Router) + **React 19.2.5** + **Tailwind CSS 4** across all five frontend apps, with **TypeScript 6**; Node.js 20+/**Express 4**/TypeScript on the backend (clustered via `throng` in production — see §8); PostgreSQL via **Prisma 7**; Redis for caching, counters, distributed locks, and rate limiting; Better-Auth for authentication (passwordless email OTP plus Google/GitHub/LinkedIn OAuth); Zustand for client state with **localStorage** persistence; `@react-pdf/renderer` and the `docx` package for document export — **both are Studio (client-side) dependencies**, and no headless-browser/Playwright/Puppeteer dependency exists anywhere in the repo; `pdf-parse` and `mammoth` for _server-side_ extraction of uploaded PDFs/DOCX; Cloudflare R2 (S3-compatible) for portfolio image storage; Dodo Payments for billing/checkout; `node-cron` for scheduled jobs. AI features are powered by a mix of **Anthropic Claude and OpenAI GPT models**, dynamically routed per request via an OpenAI-compatible client to balance quality against cost.

**Not in the stack, despite occasional assumptions to the contrary:** there is no Radix UI, no MUI, no headless-UI library (`packages/ui` is entirely in-house), no React Hook Form or any other form library (forms use controlled React state plus Zod), no Stripe, and no Playwright/browser-driven E2E suite.

---

## Vision & Values

**Product purpose:** VeriWorkly should help users turn verified career facts into clear professional writing and a credible public presence — without obscuring what an AI changed, consuming credits unexpectedly, or locking a user's own data into the service.

**Who it's for:** job seekers, independent professionals, developers, designers, and founders who need career documents and a public portfolio, and who expect immediate visual feedback, reliable exports, optional cloud sync, and clear control over their own data.

**Core commitments:**

- **Local-first, not login-first.** Anyone can open the app and start building a resume or cover letter immediately — no account, no payment wall. Documents are saved in the browser first; logging in adds optional cloud sync across devices.
- **Ownership over lock-in.** A user's source data (Master Profile, documents) is theirs; the product avoids the surveillance-heavy, data-hoarding pattern of typical resume SaaS.
- **No selling of user data**, and no third-party behavioral tracking (mouse tracking, heatmaps, ad trackers). The product does run its own first-party, aggregate usage metrics (e.g. counts of resumes created, exports, logins) purely to understand product usage — this is internal product telemetry, not user surveillance or data resale, and is worth distinguishing clearly in any public-facing privacy copy.
- **Transparent AI.** AI cost (credits) and mode (standard vs. expert) are shown before generation, and AI-generated content requires an explicit "replace" action from the user rather than silently overwriting their work.
- **Accessibility target:** WCAG 2.2 Level AA across the product — keyboard access, visible focus states, readable contrast, non-color status cues, reduced-motion support. In practice, Studio's own internal audit (`apps/studio/AUDIT.md`) still flags real gaps against this target — see §4's callouts (missing `aria-expanded`/`aria-controls` on accordions, icon-only social links with no `sr-only` fallback, a login carousel with no reduced-motion handling) — worth treating as an open punch list rather than a completed guarantee.
- **Brand personality:** precise, trustworthy, quietly ambitious for the core product; precise, confident, and creatively opinionated for the public-facing Portfolio product specifically. Portfolio's own internal brand brief (`apps/portfolio/PRODUCT.md`) is more explicit than this doc previously captured: the public/marketing surface is allowed to feel bold and aspirational, while the authenticated workspace is deliberately told **not** to "look like a second Studio documents app" — it should feel calm, work-first, and keep expression (the portfolio itself) visually separate from operation (the tools used to build it).

---

## Core Architecture Concepts

These ideas cut across every feature below, so they're explained once here.

### Unified Document model

Resumes, cover letters, portfolios, and "link-in-bio" pages are all the same underlying `Document` record, distinguished by a `type` field (`RESUME` / `COVER_LETTER` / `PORTFOLIO` / `LINK_IN_BIO`). Each document has JSON content (following a JSON-Resume-like structure), a template ID, a visibility setting (`PRIVATE` / `UNLISTED` / `PUBLIC`), tags, a schema-version field, soft-delete support (`deletedAt`), and an optimistic-concurrency revision number so simultaneous edits across devices don't silently clobber each other. A working `restoreDocument`/`hardDeleteDocument` pair exists at the service layer, but no route currently exposes either — only soft-delete is reachable today (see [Known Gaps](#known-gaps--inconsistencies) #6).

### Master Profile

A single, canonical profile per user — every section a resume can have (basics, experience, education, skills, projects, certifications, languages, awards, publications, volunteer work, references, and more) stored as one JSON record, with no other structural fields.

- **How it's used:** when a user creates a _new_ resume, cover letter, or portfolio with no content yet, it auto-seeds from the Master Profile.
- **The one-way rule:** editing a specific document (a resume, say) never writes back to the Master Profile. Only an explicit action — importing GitHub/LinkedIn data with "replace master" checked, or directly editing the Master Profile page — updates it. This means a user can safely tailor one resume for a specific job without worrying it will change their canonical data or any other document.
- The Master Profile is managed inside Studio (`/profile/master`, plus an `/profile/advanced` raw-JSON editor) and is meant to be shared across Studio and Portfolio, though Portfolio's own profile page today is read-only and links out to Studio to actually edit it (see [Portfolio Builder](#portfolio-builder--feature-catalog)).
- **Gating:** the read/write endpoints (`GET`/`PUT /profiles/master`) and the auto-seed-on-create logic carry no entitlement check at all — Master Profile access is effectively available to every authenticated user today, regardless of plan. See [Known Gaps](#known-gaps--inconsistencies) #2.

### Local-first storage + cloud sync

Every document is written to the browser's localStorage first (so nothing is lost offline or before login), then — if the user is logged in and auto-sync is enabled — pushed to the backend through a background sync engine with retry handling, per-document conflict detection (local vs. cloud), and a per-document opt-out ("keep local only"). Guest (logged-out) users get a persisted local session (a 30-day guest cookie, `veriworkly-guest-mode`, HttpOnly) so they can keep using the builder without ever creating an account; login is only required for cloud sync, sharing, AI features, ATS, imports, and publishing. The Portfolio app runs a parallel, independently-implemented version of this pattern for the portfolio draft itself: a guest-local-draft vs. cloud-draft merge that compares `updatedAt` timestamps to avoid clobbering newer data on either side.

**A live data-integrity risk worth knowing about:** Studio's document sync engine has a known stale-snapshot race — if a user keeps typing while a sync network call is in flight, the sync's completion can overwrite newer local edits with the pre-sync snapshot it captured, silently losing the interim keystrokes (`document-sync-service.ts`). This is flagged in Studio's own internal audit as unresolved.

### Entitlements & credits, not simple booleans

Access isn't just "free vs. premium." Two systems work together:

- **Entitlements** — named capability grants (`ai_credits`, `portfolio_publish`, `custom_subdomain`, `seo_controls`, `analytics`, `watermark_removal`) that can come from an active subscription, a manual admin grant, a promotion, or the system itself. Each has its own start/end window.
- **AI credit wallet** — a full ledger (balance, reserved, lifetime credited/debited) with individual expiring credit grants, a two-phase reserve → commit/release flow for AI calls in progress (so a failed generation doesn't burn credits), and a complete transaction history. Under the hood, a debit doesn't just subtract from a single balance: a dedicated allocation table (`CreditUsageAllocation`) records exactly which credit grant(s) funded each transaction on a FIFO-by-expiry basis, so a user with multiple partial grants (e.g. a subscription grant plus a leftover top-up) gets billed from the soonest-to-expire grant first. AI actions have separate "standard" and "expert" cost tiers.

This is why free-tier limits aren't a single flat rule across the product — see [Pricing & Monetization](#pricing--monetization) and the reconciliation notes in [Known Gaps](#known-gaps--inconsistencies) for where this gets genuinely inconsistent between the pricing page and the backend logic.

---

## Document Builder (Studio) — Feature Catalog

The primary workspace at app.veriworkly.com. No AI/PDF-parsing happens client-side — Studio is the editor and UI; the server does extraction, AI generation, and scoring.

### Resume builder

Full section-based editor: Basics, Summary, Experience, Education, Projects, Skills, Links, Languages, Interests, Awards, Certifications, Publications, References, Volunteer, Achievements, plus custom/generic sections. Sections can be shown/hidden individually and reordered by **two working mechanisms**: drag-and-drop on the section cards in the left "Editor Map" sidebar (`Sidebar.tsx`, genuinely `draggable`), and a "Position" dropdown plus drag handles inside the section-visibility settings panel. _(An earlier version of this doc claimed the sidebar drag implementation was dead code that had never been made `draggable` — that is no longer true; it works.)_ A paged, live, pixel-accurate preview updates as you type. Seven resume templates today: **Executive Clarity** (id `executive-clarity`, refined spacing), **Precision ATS** (id `precision-ats`, dense single-column), **Modern Minimal** (id `modern-minimal`, rule-free and whitespace-led), **Timeline Focus** (id `timeline-focus`, fixed date gutter), **Corporate Brief** (id `corporate-brief`, split letterhead), **Bold Impact** (id `bold-impact`, centered high-contrast masthead), and **VeriWorkly Special** (id `veriworkly-special`, high-impact branded layout) — all freely selectable, no template lock for resumes. All seven are built on the shared skin engine in `apps/studio/templates/resume/shared/`, which derives the live preview and the PDF export from one type scale, one spacing model, and one content model, so the two cannot drift apart.

**A known, live export bug worth flagging:** blank date/role/company fields currently render as literal placeholder text (`"Start - End"`, `"Role"`, `"Company"`) in real PDF/DOCX/HTML/Markdown exports rather than being omitted — this isn't a display-only issue, it leaks into files a user actually downloads and sends.

### Cover letter builder

A dedicated editor with its own fields/schema, same live-preview and export pipeline as resumes. Five templates: **Professional** (id `professional`), **VeriWorkly Special** (id `veriworkly-special`), **Minimalist** (id `minimalist`), **Executive** (id `executive`), and **ATS Essential** (id `ats-essential`) — also all freely selectable.

**The export dispatcher is now genuinely type-driven.** `exportDocumentByType` switches on `document.type` (`RESUME` / `COVER_LETTER`), dispatches to a per-type format handler, and guards both switches with an `assertNever` exhaustiveness check — so adding a document type or an export format becomes a compile-time error until every branch is handled. _(An earlier version of this doc said the dispatcher "isn't type-driven — it currently branches on resume vs. assumed cover letter," and that a third document type would need real dispatcher work first. That refactor has since landed; a third type now mostly needs its own format handler rather than a dispatcher rewrite.)_

_(Only these two document types — resume and cover letter — exist in code today. Invoices, formal letters, and other document types described in the product vision are not yet built.)_

### Master Profile

Described above — its own dedicated, login-gated editor page (`/profile/master`) plus an `/profile/advanced` raw-JSON editor for deeper/manual detail.

### Import

Several distinct ways to get content into the builder, all backend-processed:

- **Generic JSON import** — bring in a document exported from elsewhere, via the editor toolbar's Actions menu.
- **Markdown import** — a hand-authored markdown resume/cover-letter format, hand-parsed (section headers, date ranges, bold/italic stripping), also via the toolbar Actions menu.
- **File extraction** — upload a PDF, DOCX, TXT, MD, or JSON resume (label advertises a 5MB max) and have its text extracted server-side for reuse, used both standalone and inside the ATS checker and the import flows below. The 5MB limit is enforced server-side but **not** checked client-side before upload — a larger file will still attempt to upload and only fail once it reaches the server.
- **GitHub import** — a real OAuth-based integration: pulls your connected GitHub profile plus up to 30 repositories, and _deterministically_ (no AI) maps languages to skills and repos to project entries. Free users can only import their own connected GitHub account, once per day. Paid users can import any GitHub username with no per-day quota check in the product-facing sense — but there is a hidden secondary cap of **50 imports/day per paid user**, put in place specifically to protect the single shared GitHub API token's 5,000-requests/hour budget from being exhausted by one heavy user; this cap has no user-facing messaging today.
- **LinkedIn import** — not an OAuth/API pull. A user pastes their exported LinkedIn profile text (or uploads a LinkedIn-exported PDF, which gets auto-extracted into the same paste box) and an AI call parses it into structured resume data. Free users get one import per month; paid users get unlimited, with no secondary cap (unlike GitHub, this path isn't bound to a rate-limited third-party API).
- Both GitHub and LinkedIn import share a single "Replace my Master Profile with this data" checkbox in the same modal, and always create a new resume document from the result.
- **AI resume conversion** — paste or upload an existing resume in any format and have AI restructure it into a proper, editable VeriWorkly document with any template applied. This is an explicit "Pro" feature gated by AI-credit entitlement/quota, and lives inside the ATS workspace ("Pro resume conversion" panel) rather than the main import modal.

### ATS Checker

A dedicated workspace (`/ats`, requires login) with two layers of analysis:

- **Core scan** — a deterministic, non-AI, free-of-AI-cost rules engine: word count, presence of email/phone/links, required sections (experience/education/skills), action-verb usage, quantified achievements, length, and formatting risk (tables, headers/footers that confuse ATS parsers). Produces a readiness score and, if a job description is pasted in, a keyword-match score. **Important nuance:** this core scan and the AI-powered analysis below draw from the _same_ scan-quota bucket, not separate meters — running the free core scan and then the AI analysis on the same resume consumes two scans against one shared quota, not one scan against each of two independent limits.
- **AI-powered deep analysis** — layers an LLM's explanation, missing-evidence detection, prioritized recommendations, and keyword opportunities on top of the core scan; can fetch a job description directly from a URL instead of requiring paste, with strong server-side SSRF protections (see [Platform capabilities](#platform--backend-capabilities)).
- **Quotas:** anonymous visitors get 1 scan per 48 hours; free logged-in users get 2 scans per 24 hours; paid subscribers get 300 scans per billing period (anchored to the subscriber's actual subscription period, not a calendar month).
- A previously saved Studio resume can be loaded directly as the scan source, or a resume can be uploaded/pasted fresh.

### AI writing assistance

An "Improve with AI" control embedded throughout the editors — select text or a section, choose Standard or Expert mode (different credit costs), optionally give free-text direction, and review the AI's draft before choosing to replace the field or discard it. The credit cost for the selected mode is shown on the mode buttons themselves and again on the Generate button before the user commits to spending credits. Underlying AI actions cover rewriting short text, rewriting/generating whole sections, generating a cover letter, tailoring a resume to a specific job description, and generating portfolio copy (used by the Portfolio product — see below). The model/route chosen per request is dynamically selected across Anthropic Claude and OpenAI GPT models to balance quality against AI cost.

### Sharing

Any document can be turned into a public link:

- **Password protection** (optional, can be added/removed after the fact; verified server-side with `scrypt` + a timing-safe comparison — not a general account-password scheme, just for share links).
- **Expiry control** (a specific date, or no expiry).
- **Username-scoped public URLs** (`/share/{username}/{token}`) — a username must be set before sharing is available.
- **View analytics** — total view count and last-viewed time per link. **One share link per document**, not many: `ShareLink` carries a `@@unique([userId, documentId])` constraint, so re-sharing updates the existing link rather than minting a second one. _(An earlier version of this doc claimed "multiple simultaneous share links per document are supported" — that is wrong and contradicted by the schema.)_ A link is independently revocable, which takes the public page down immediately.
- The public page shows a static snapshot from share time, not a live-linked document, so further private edits don't change what's already been shared until the link is refreshed. This is deliberate: a link already sent to a recruiter can't silently change under them mid-review.
- Password verification is rate-limited to **3 attempts / 5 minutes**, and repeat views from one IP within a 30-minute window are deduplicated before the counter increments.

### Export

Every document (resume or cover letter) can be exported as **PDF, DOCX, HTML, Markdown, plain text, or JSON**, all from one export menu, available both inside the editor and on the public share page's download menu.

### Workspace / dashboard

Document list and grid views, cross-document search, sync-status indicators (local-only / pending / syncing / synced / conflicted) with a details view for resolving conflicts, and a "New Document" flow that includes the import-from-LinkedIn/GitHub entry points described above. Beyond the document list itself:

- **Global command palette** — `Cmd/Ctrl+K` opens a fuzzy search across the whole document library (title/subtitle, sorted by recency, top 10 results).
- **Theme system** — light / dark / **follow-system**, all three surfaced as explicit options in `/settings` → Appearance (via `next-themes`), plus a toggle in the account menu. _(An earlier version of this doc said there was no UI path back to "follow system" once an explicit theme was picked — a `system` option now exists.)_
- **Sync settings page** (`/settings`) — three panels only: Appearance (theme), Sync (auto-sync toggle, manual "Sync Now", and the conflict-resolution details modal referenced above), and a link out to `/api-keys`. **There is no account-deletion control anywhere in Studio**, and Better-Auth's `deleteUser` endpoint is not enabled on the server — only the `databaseHooks.user.delete` hook and the deletion-confirmation email template exist. Account deletion is therefore a manual, support-driven process today (email `info@veriworkly.com`). Worth knowing before any privacy copy claims users can self-serve deletion "via Settings."
- **PWA support** — the app ships an installable web-app manifest (standalone display mode, maskable icons), not previously documented.
- **Destructive-action UX** — two different confirmation patterns coexist for conceptually similar actions: a typed-"DELETE" confirmation modal for whole-document deletion, versus a lighter one-click confirmation modal elsewhere; separately, the editor's "Reset to defaults"/"Empty all fields" toolbar actions wipe the entire document with **no** confirmation step at all. There's also no undo/redo anywhere in the resume/cover-letter editor.
- **Localization limit** — phone-number validation (both in the resume Basics section and Master Profile) is hard-coded to a 10-digit US format, a real constraint for a product otherwise marketed without geographic limits.
- **Internal debug tool** — `/pdf-debug/[type]/[templateId]` is a dev-only PDF-rendering debugger; its link is hidden in production but the route itself has no server-side gate.

### Credits & billing (in-app)

A `/credits` page showing wallet balance, per-action Standard/Expert credit costs, lifetime credited/used totals, expiry of upcoming credit grants, and full transaction history (each entry showing the action, reason, amount, and resulting balance — see the FIFO multi-grant allocation note in [Core Architecture Concepts](#core-architecture-concepts)); a `/billing` page for plan status, entitlements, credit top-up purchase, and managing/canceling a subscription; `/checkout` for the actual purchase flow, which validates the requested product key and billing interval against a whitelist before handing off to Dodo.

### Developer API keys

A full self-serve API key management UI (`/api-keys`, `/api-keys/create`, `/api-keys/[id]`): create a key with a chosen name and scopes, view/rotate/revoke existing keys, and see a one-time reveal of the generated secret. Keys are prefixed `vw_` followed by 64 hex characters.

**The backend accepts exactly eight scopes** (`ALLOWED_SCOPES` in `apiKeyService.ts`): `user:read`, `user:write`, `resume:read`, `resume:write`, `roadmap:read`, **`changelog:read`**, `github:read`, and **`ai:write`**. Requesting anything outside that set fails with `400 Unsupported API key scope(s)`.

Two precision notes worth carrying into any public copy:

- **There is no `roadmap:write` and no `github:write`.** Both of those surfaces are read-only for API keys. (Earlier docs listed both as supported; they never existed.)
- **`changelog:read` is issuable via the API but has no checkbox in Studio's scope picker** — `AVAILABLE_API_KEY_SCOPES` in the Studio UI lists only seven of the eight. A minor UI gap, not a backend one.

A key created without explicit scopes defaults to `user:read` only. Keys are stored as irreversible HMAC-SHA256 hashes (never plaintext), rate-limited per key (default 20 requests/15-minute window), auto-expiring (365 days by default unless set otherwise), and force-invalidated within 5 minutes of the owning account's subscription lapsing to canceled/inactive (the auth-result cache is explicitly busted the moment the billing webhook processes the cancellation, rather than waiting out its normal 5-minute TTL).

### Affiliate & Ambassador program

Full dashboards for both programs live in Studio. See the dedicated [Affiliate & Ambassador Programs](#affiliate--ambassador-programs) section below for complete detail on both, including how thin the Ambassador program's actual backend is relative to its public marketing.

### Admin tools

An internal admin area (`/admin/*`, gated by a real role check — `requireAdminUser()` on the frontend shell and `adminAuthMiddleware` authoritatively on every API route) covering:

Every admin API lives under a single Express router (`src/routes/admin/`), which applies the admin gate once so any route file added under it is protected by construction. Each domain has a matching controller in `src/controllers/admin/`, service in `src/services/admin/`, and validator in `src/validators/admin/`. Every mutating endpoint requires an audit reason and writes an `AdminAuditEntry`.

- **Overview** (`/admin`) — cross-domain summary plus an "action queue" of everything awaiting a human decision (pending ambassador applications, withdrawal requests, unreleased commissions, failed webhooks, suspended portfolios, stuck asset uploads).
- **Users** (`/admin/users`) — searchable roster filtered by role, subscription state, and affiliate/ambassador standing; a per-account 360° view (subscriptions, entitlements, credit ledger, documents, portfolio, API keys, sessions, admin history); role changes, session revocation, and confirmed account deletion. The account named by `ADMIN_EMAIL` cannot be demoted or deleted from the dashboard.
- **Ambassadors** (`/admin/ambassadors`) — the application review queue with approve/reject and a review note, a per-application detail view, and the roster of everyone currently holding the `AMBASSADOR` role.
- **Affiliates** (`/admin/affiliates`) — program summary, per-affiliate detail (referrals, commissions, payouts, top referrer hosts), tier/status moderation, plus dedicated commission, withdrawal, and referral queues.
- **Portfolios** (`/admin/portfolios`) — every published subdomain with owner and traffic, a per-portfolio view with a daily view series and top referrers, and moderation (suspend, which clears the Redis copy, the public list, and the portfolio app's ISR cache in one request; or a hard unpublish that frees the subdomain).
- **Documents & share links** (`/admin/documents`, `/admin/share-links`) — content moderation that can only reduce reach (an admin can force a document private or unlisted but never publish someone else's private document), soft delete/restore, and share-link revocation.
- **Billing** (`/admin/billing`) — subscriptions with a support override for lost webhooks, credit wallets and manual adjustments, entitlement grants/revocations, and the provider webhook log with replay for transiently failed events.
- **API keys** (`/admin/api-keys`) — disable, re-quota, or permanently revoke any issued key. Key material is never readable here; only the stored prefix/suffix are returned.
- **Audit log** (`/admin/audit`) — filterable, append-only trail of every mutating admin action with actor and reason.
- **System** (`/admin/system`) — per-dependency health probes, background job freshness, usage-metric charts, request-error log, a manual GitHub sync, and a cache flush restricted to platform-owned key prefixes (session records are deliberately unreachable, so no cache flush can sign every user out).
- **Roadmap CMS** (`/admin/roadmap`) — create/edit/delete public roadmap items with rich detail: problem/solution narrative, timeline, impact metrics, before/after comparisons. Writes are at `POST|PUT|DELETE /api/v1/admin/roadmap`; the public `/roadmap` router serves reads only.
- **Changelog CMS** — admin create/update/delete plus a manual GitHub-Releases sync trigger, at `POST|PUT|DELETE /api/v1/admin/changelog` and `POST /api/v1/admin/changelog/sync`. Still API-only — no dedicated Studio screen.

`/api/v1/admin/monetization` is retained unchanged as a compatibility surface for the pre-split single-page console; new work should use `/admin/billing` and `/admin/affiliates`.

---

## Portfolio Builder — Feature Catalog

> **Current rollout status:** Portfolio is a fully built, working product that's being brought to general availability in stages. The authenticated workspace (dashboard, editor, analytics, settings, profile) is already open to **every logged-in user in production** — anyone can build and preview a full portfolio today. The remaining rollout step is opening up **publishing** and **checkout** to every account:
>
> - **Publishing** — currently the admin account publishes first in production while the launch path gets validated end-to-end; both the client (Publish button) and the server (`PortfolioController.publish`) reflect this staging step. Draft editing and unpublishing an already-live site are unaffected and open to everyone.
> - **Checkout/payments** on the pricing page — same staged rollout, opening alongside publishing.
> - **The internal `/og-generator` tool** — an admin-only internal utility, unrelated to the public product rollout.
>
> All three currently use the same mechanism: a server-only `ADMIN_EMAIL` check (fail-closed — if `ADMIN_EMAIL` is unset, nobody is treated as an admin). This is separate from the feature-flag system described in [Affiliate & Ambassador Programs](#affiliate--ambassador-programs), which governs those programs' own rollout. As the general-availability rollout progresses, re-check this section against the code.

### Public marketing site

Landing page, a full template gallery with per-template long-form detail pages (design philosophy, style guide, FAQs, best-fit guidance), a live read-only preview of each template with demo content. **Note:** earlier versions of this preview page blocked right-click, view-source, text selection, devtools shortcuts, and printing to discourage copying a template's design pre-purchase — those protections have since been **deliberately removed** (not merely undocumented) because they were trivially bypassable and actively broke legitimate use (text selection, Ctrl+F, screen readers). Preview pages today behave like normal web pages. Also included: a pricing page, an FAQ page, per-template Open Graph image generation, JSON-LD structured data across the marketing pages, a sitemap that dynamically includes every live published portfolio subdomain, and a Content-Security-Policy header restricting script/resource origins to same-origin plus `*.veriworkly.com`.

### Templates

Four templates, sourced from a **private git submodule** (`template-library/`, pinned to a specific upstream commit — adding a template requires registering a loader in `registry.ts`, adding gallery metadata in `templates/catalog/templates.ts`, and advancing the submodule pointer) and rendered server-side:

| Template    | Personality                                            | Notable design elements                                                                                                                                                    | Access         |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Signal**  | Engineers/product leads — structured, technical        | Dual dark/light theme, scroll-stacking project cards, mouse-glow bento cards, a real local-time display in the hero                                                        | Free (default) |
| **Atelier** | Designers/creative builders — expressive, editorial    | Print/magazine-style asymmetric masonry, serif headlines, flat 0px-radius cards, drifting orbit spheres                                                                    | Free           |
| **Nimbus**  | Full-stack/frontend devs — atmospheric, tech-editorial | Cursor-follow ring, per-character text-scramble hover, marquee ticker, magnetic CTA buttons — deliberately **no cards, shadows, or blur anywhere** per its own design spec | **Premium**    |
| **Cipher**  | Developers — interactive terminal emulator             | Fully interactive draggable terminal window with command autocomplete and a hidden matrix-rain easter egg (plus a `sudo make-coffee` easter egg)                           | **Premium**    |

**Correction from an earlier version of this doc:** the "real local-time display" trait belongs to **Signal and Cipher**, not Nimbus — Nimbus's actual component has no clock anywhere, only a copyright-year stamp. This traces back to a mismatch inside the template library's own marketing "strengths" copy for Nimbus, which lists a live-time feature it doesn't have — worth fixing at the source, not just in this doc (see [Known Gaps](#known-gaps--inconsistencies) #16).

**Scope note from the submodule's own README:** only VeriWorkly-issued subdomains are supported at launch — custom-domain routing and certificate automation are explicitly out of scope for now.

### Editor

A three-pane workspace (section structure / content / live preview via a real `<iframe>` kept in sync over `postMessage`, with a mobile/tablet/desktop viewport-width toggle), autosaving every 12 seconds while dirty, plus a browser `beforeunload` warning if the user tries to navigate away with unsaved changes. Supports 18 section types (projects, experience, education, services, skills, writing, testimonials, awards, certifications, languages, interests, publications, patents, test scores, achievements, volunteer, custom, contact), each reorderable, hideable, and independently editable. **Important cross-check:** the backend's own publish-time content validator currently only accepts 9 of these 18 (`projects, experience, services, skills, education, writing, testimonials, awards, contact`) — see [Known Gaps](#known-gaps--inconsistencies) #9 for what that means in practice. Premium users additionally get **multi-page portfolios** — dedicated Work/Writing/About/Contact pages plus auto-generated detail pages per project (derived live from the Projects section's items), each with its own section list.

There's also a separate, distinct **private live-preview route** (`/preview/[documentId]`) — not the same as the editor's own preview pane or the published site — used for scenarios like a guest (logged-out) user previewing before ever saving, powered by a dedicated server-render endpoint that turns portfolio JSON into HTML on demand.

### Publishing

- Free: published at a shared path (`portfolio.veriworkly.com/portfolio/your-slug`).
- Premium: a true custom subdomain (`your-slug.veriworkly.com`) — enforced at the routing layer, not just the UI: a non-premium account hitting a custom-subdomain URL directly gets server-redirected back to the shared path, and multi-page slug routes 404 outright for non-premium accounts regardless of subdomain.
- Publishing (or re-publishing after an edit) with a premium-only template blocks non-premium users with an upgrade prompt.
- Unpublishing takes the site down while keeping the draft intact.
- See the rollout-status callout above: publishing itself is currently admin-only in production, independent of a user's plan tier.

### Dashboard

Portfolio views (all-time), published section/project counts, and a **readiness percentage** computed as `round(((identity-fields-completed + min(visible-sections, 4)) / 8) × 100)`, where identity-fields-completed counts how many of {name, headline, bio, email} are filled in (0–4). A health checklist covers four items: profile details complete, ≥2 visible sections, SEO metadata present (title + description both set), and publicly published. The "recommended next steps" panel is mostly static guidance copy (review your search preview, check your portfolio's reach) with only one line's wording conditional on whether the user has added projects yet — less dynamically personalized than the phrase "recommended next steps" might imply.

### Analytics

Total views, a recent-window trend, active days, and a referrer breakdown. **Premium-gated**, with two distinct locked states depending on context: a logged-out visitor sees a "Log In" prompt, while a logged-in free user sees the real metrics blurred behind an "Upgrade to Pro" overlay.

### Settings

Subdomain/slug editor (with an inline format hint), SEO meta title/description, and social share image upload — all disabled for free users (each individually re-checked, not just hidden), editable for premium, with an explicit banner explaining exactly which fields are locked.

### AI portfolio copy

The same AI writing assistant pattern as Studio (Standard/Expert modes, credit-metered), scoped here to portfolio bio/headline/section copy generation.

### Watermark

A floating "Built with VeriWorkly" badge appears on every free-tier published portfolio. Premium users get a per-portfolio toggle to remove it.

### Profile

Portfolio's own `/profile` page is a read-only summary of the identity fields already in the portfolio draft — it explicitly does not own Master Profile management; it links out to Studio for that.

---

## Affiliate & Ambassador Programs

Both programs share a genuine **feature-flag rollout mechanism** worth describing honestly rather than overselling: two boolean config values (`config.growth.affiliateProgramEnabled`, `config.growth.ambassadorProgramEnabled`), each read once from an environment variable at server boot, defaulting to **enabled outside production and disabled in production** unless explicitly turned on. When a flag is off, the corresponding API routes return a `503` ("...is not available yet") via a small `requireFeatureEnabled` middleware, and in Studio, the `/affiliate` and `/ambassador` route layouts swap in a shared "Coming Soon" screen instead of the real dashboard. This is genuinely useful as a rollout switch, but it's worth being precise about its actual shape: it's two hardcoded, config-only boolean gates, not a general feature-flag platform — there's no database-backed flag model, no per-user targeting, no admin UI to flip a flag, and no way to change one without a redeploy/restart. It also isn't used anywhere else in the product (the Portfolio app's admin-gating, described above, is a completely separate, unrelated mechanism).

### Affiliate program

A full affiliate dashboard in Studio (`/affiliate`, `/affiliate/tiers`, `/affiliate/referrals`, `/affiliate/commissions`, `/affiliate/payouts`, `/affiliate/leaderboard`):

- **Enrollment & status states** — not-enrolled (shows an Enroll button, with explicit copy that signups alone don't earn anything, only paid conversions do), pending, active, and suspended (existing earnings stay visible, new activity is disabled) are all handled as distinct UI states.
- **3-tier commission structure** — Tier 1 "Starter" 2% (0+ conversions), Tier 2 "Growth" 3% (10+ conversions), Tier 3 "Partner" 5% (50+ conversions). **Important nuance:** these thresholds are informational only — tier is not auto-upgraded by conversion count anywhere in the code; the only way an affiliate's tier actually changes is a human admin action in the monetization console.
- **Wallet & payouts** — available/pending balance, a $25 minimum withdrawal, and a payout-request flow. Commissions can only be marked `PAID` by an admin action, because Dodo Payments has no payout/transfer API (only a read-only settlements list) — payouts are always executed out-of-band (bank transfer, etc.) and then recorded manually.
- **Public leaderboard** — monthly and all-time boards, explicitly scoped to "released and paid commissions only."
- **Additional terms surfaced on the public marketing page** (`veriworkly.com/affiliate`): self-referral is blocked, one referral is allowed per account for life, referral attribution has no expiry window (called out as a differentiator from the typical 30-day industry norm), and affiliates are prohibited from bidding on VeriWorkly's own brand keywords in paid ads.

### Ambassador program

The Ambassador program is live and rolling out in phases, the same pattern the Affiliate program itself went through — application intake first, full rewards loop next.

> **This section was substantially stale as of 2026-07-24 and was rewritten on 2026-07-29.** The application schema grew from 2 fields to 7, a dedicated `AmbassadorApplication` model replaced the loose fields on `User`, the admin-review workflow shipped, and the apply form moved out of Studio onto the marketing site. Details below are re-verified against code.

**Data model.** A dedicated **`AmbassadorApplication`** model (one per user, `userId @unique`) holds `collegeName`, `graduationYear`, `whyJoin`, `superpower`, `funFact`, optional `vibeCheck` and `socialHandle`, a `status` enum (`PENDING` / `APPROVED` / `REJECTED`), and review metadata (`reviewedBy`, `reviewedAt`, `reviewNote`). The `User` record additionally carries a free-text `ambassadorStatus` (default `"NONE"`) mirroring that status, plus a dedicated `AMBASSADOR` role.

**Applying — 7 fields, not 2.** `POST /ambassador/apply` validates: `collegeName` (2–160 chars), `graduationYear` (a real 4-digit `19xx`/`20xx` year, checked client- and server-side), `whyJoin` (20–1,000 chars), `superpower` (2–300), `funFact` (2–300), `vibeCheck` (optional, ≤80), `socialHandle` (optional, ≤120). _(The earlier version of this doc described the payload as just college name + graduation year.)_ The application is **upserted**, so re-applying after a rejection is allowed and resets status to `PENDING` while clearing prior review metadata; applying while already `PENDING` or already an approved `AMBASSADOR` is rejected with a `400`. Applying also sets `User.ambassadorStatus = "PENDING"` in the same transaction.

**Where you apply.** The application form lives on the **marketing site** at `veriworkly.com/ambassador/apply` (`AmbassadorApplyExperience.tsx`), **not** in Studio. _(The earlier version of this doc said Studio's `/ambassador` page shows an "Apply Now" form for not-yet-applied users — it doesn't.)_

**Status.** `GET /ambassador/me` returns `role`, `ambassadorStatus`, `collegeName`, and `graduationYear`.

**Admin review — live, with a Studio screen.** `GET /admin/ambassadors` lists applications (paginated as `{ items, total, limit, offset }`, filterable by status/graduation year/free-text search, joined with the applicant); `GET /admin/ambassadors/:id` returns one application with its reviewer and audit history; `GET /admin/ambassadors/roster` lists everyone currently holding the role; `PATCH /admin/ambassadors/:id` takes `action: "APPROVE" | "REJECT"` plus an optional `reviewNote` (≤500 chars). All sit behind `adminAuthMiddleware`. Approving flips the application status **and** the user's `role` to `AMBASSADOR` in one transaction; rejecting sets the role back to `USER` — and neither ever changes a role it does not own, so an `ADMIN` reviewing their own application stays `ADMIN`. Every decision writes an `AdminAuditEntry` (`ambassador.application.approve` / `.reject`). An already-reviewed application cannot be reviewed twice — a second `PATCH` returns `400`. The Studio screen is at `/admin/ambassadors`. The singular `/admin/ambassador` path is still mounted as an alias, but its list response is now paginated rather than a bare array.

**Studio's `/ambassador` page:** now a status-only page with two states — pending ("Application Under Review") and active ambassador ("Active Campus Ambassador" badge). A rewards dashboard (referral tracking, redemption ledger, leaderboard) is still the next build milestone.

**What's still rolling out:** the full points economy previewed on the public marketing page (`veriworkly.com/ambassador`) — points for invites and invite conversions, `.edu`-verified badges, points for video/article contributions, a points-based redemption threshold for a 30-day **Creator Pro** voucher, an interactive points calculator, and a leaderboard. **None of this exists in the database today** — there is no points, redemption, or ambassador-leaderboard model. The marketing page is a preview of intent, not a live earning schedule, and should be read that way in any external communication.

---

## Marketing Site (site) — Feature Catalog

Beyond the pricing/affiliate/ambassador pages covered above and in [Pricing & Monetization](#pricing--monetization), `apps/site` (veriworkly.com) has a broader public footprint than earlier versions of this doc captured:

- **`/about`, `/contact`, `/faq`, `/features`, `/how-it-works`** — standard marketing/support pages. `/how-it-works` is a 5-step "keystroke to published page" explainer, and notably states plainly that PDF rendering happens **entirely client-side** in the browser via `react-pdf` — consistent with the actual codebase (no Playwright/Puppeteer dependency exists anywhere in the monorepo), but inconsistent with a stale page inside `docs-platform` — see [Known Gaps](#known-gaps--inconsistencies) #15.
- **`/security`** — a real responsible-disclosure policy (report → 24-hour acknowledgment → patch → coordinated disclosure) plus a plain-language "what data lives where" boundary breakdown.
- **`/stats`** — a public live board of the VeriWorkly GitHub repo's own dev activity (issues, PRs, completion rate), mirroring what the admin dashboard shows internally.
- **`/style-guide`** — a public showcase of the shared design system (colors, typography, components, brand assets, motion/effects, layout rules) — the public-facing counterpart to `packages/ui`.
- **`/roadmap`** and its subpages (`/roadmap/[id]`, `/roadmap/done`, `/roadmap/in-progress`, `/roadmap/todo`) — fully backend-driven from the same `RoadmapFeature` data admin manages in Studio. No voting/bookmarking/commenting UI exists anywhere on these pages, consistent with the backend gap noted below.
- **`/templates`, `/templates/[docType]`, `/templates/[docType]/[templateId]`** — a resume/cover-letter template showcase (distinct from the Portfolio template gallery, which lives in `apps/portfolio`).
- **`/og-generator`** — an internal Open Graph image tool, publicly reachable but excluded from search indexing via `robots.txt`.
- **An "AI answer engine" content layer** — `public/llms.txt` and `public/pricing.md` are machine-readable summaries of the product and pricing aimed squarely at AI crawlers and chat assistants, and `robots.ts` explicitly allowlists `GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and `CCBot`. This is a deliberate answer-engine-optimization strategy that isn't documented anywhere else in the product.
- **No customer testimonials exist anywhere on the site.** The "trust" section on the homepage is a marquee of the product's own tech-stack logos (Next.js, React, Dodo Payments, GitHub, LinkedIn), not customer logos or quotes. Two separate "how we compare" tables (one on the homepage, one on `/features`) use generic "industry"/"traditional competitors" framing rather than named competitors, and include at least one specific, unsourced claim ("99.9% ATS parse accuracy") worth treating cautiously in any external-facing use of this doc.

See [Known Gaps & Inconsistencies](#known-gaps--inconsistencies) for several site-internal content contradictions (pricing/plan naming, licensing claims, affiliate payout mechanics) uncovered during this audit that are worth fixing at the source regardless of what this doc says.

---

## Platform / Backend Capabilities

### Authentication

Passwordless email OTP plus Google, GitHub, and LinkedIn OAuth (LinkedIn OAuth here is for _signing in_, not for importing profile data — see the Import section above). Account linking across providers is supported. Sessions are Postgres-backed with a Redis cache layer, HttpOnly/Secure cookies shared across subdomains (so a login on Studio carries over to Portfolio), and rate-limited OTP send/verify. Welcome, new-device login-alert, and account-deletion emails are sent automatically (see the email templates list below). An admin user is auto-provisioned on server boot if none exists yet for the configured `ADMIN_EMAIL`.

### Billing engine

Dodo Payments is the payment provider (not Stripe — see [Known Gaps](#known-gaps--inconsistencies) #14 for a live inconsistency on the affiliate page about this). Subscriptions, one-off credit-pack purchases, and a customer billing portal are all supported, with webhook-driven, idempotent processing of payment/subscription events (backed by a dedicated `BillingWebhookEvent` table that records every webhook by its provider event ID, with retry-count tracking, and doubles as the user-facing "billing history" list) that automatically grants entitlements and credits, updates portfolio publish access, and triggers affiliate commissions. A 7-day free trial is auto-applied for first-time monthly Creator Pro subscribers specifically (not other plans/intervals). If a subscription lapses, portfolio publish access enters a grace period (7 days by default) before the site is actually suspended, enforced by a scheduled job (see below).

### Developer API

Beyond the Studio-facing key management UI (see §4): keys are stored as irreversible HMAC-SHA256 hashes (never plaintext, using a hash secret deliberately kept separate from the general auth secret), rate-limited per key, auto-expiring (365 days by default unless set otherwise), and immediately (within 5 minutes) invalidated if the owning account's subscription lapses to canceled/inactive.

### Public Roadmap

A database-backed, admin-managed roadmap shown publicly at `/roadmap` (both on `site` and referenced by Studio's admin CMS) with todo / in-progress / done columns, ETAs, tags, and rich per-item detail (why it matters, timeline, before/after). A data model for per-user votes, bookmarks, and comments on roadmap items exists (`RoadmapInteraction`) — and its data, if any rows exist, is actually returned as part of a feature's public detail response — but there is no route anywhere that lets a user create, update, or delete a vote/bookmark/comment. In practice this means the feature is read-visible but not write-reachable.

### Public changelog

**Not previously captured in this doc at all.** A database-backed product changelog (`ChangelogEntry`), one row per shipped release: a unique `version`, title, summary, a free-text `type` (`major`/`minor`/`patch`), publish date, GitHub URL, PR references, tags, and five categorised string arrays — `added`, `improved`, `fixed`, `breaking`, `security`.

- **Public read routes:** `GET /changelog`, `GET /changelog/stats`, `GET /changelog/:id` — all session-optional, and all gated by the `changelog:read` API-key scope when called with a key.
- **Admin write routes:** `POST /admin/changelog`, `PUT /admin/changelog/:id`, `DELETE /admin/changelog/:id`, plus `POST /admin/changelog/sync` to pull missing GitHub Releases on demand. (These moved off the public `/changelog` router when every admin capability was consolidated under `/api/v1/admin`.)
- **Scheduled sync:** a daily job imports releases automatically (see cron jobs above).
- A `seed:changelog` script and a `backfill:changelog-pr-authors` script exist in the server workspace.

### Health endpoints

Two distinct routes, and the distinction matters operationally:

- **`GET /health`** — a **liveness** check that touches **no** external dependency. It returns `{ status: "ok", timestamp }` only. This is deliberately what the Docker healthcheck polls, so an uptime probe doesn't keep serverless database compute awake.
- **`GET /health/ready`** — a **readiness** check that actively runs `SELECT 1` against Postgres and `PING` against Redis, returning `database`/`redis` connection state. On any failure it returns a plain `503` **without** naming which dependency failed — check the API logs to identify the culprit.

_(An earlier version of the public docs described `/health` itself as probing the database and Redis. That was true historically; it isn't now.)_

### Usage metrics & GitHub project stats

First-party, aggregate-only usage counters (resumes created/exported, logins, roadmap views, etc.) buffered in Redis and flushed daily to the database (`UsageMetricDaily`, with idempotency-batch markers so a crashed or racing flush can't double-count or silently drop data) for an internal dashboard — this is product telemetry, not individual user tracking or third-party analytics. Separately, the VeriWorkly open-source repo's own issue/PR activity is synced roughly twice daily (with exponential backoff and rate-limit-header awareness) to power public stats/roadmap context, using incremental (`since=`) syncs after the first full pass.

### Cron jobs & background processing

**Five** scheduled jobs run in `apps/server` (not four — a changelog job was added), each guarded by a Redis distributed lock so only one cluster worker executes a given job even across multiple server processes:

- **GitHub sync** — twice daily (`GITHUB_SYNC_CRON`, default `0 0,12 * * *`), refreshes repo issue/PR stats (skipped if existing data is under 12 hours old). Enabled by default (`GITHUB_SYNC_ENABLED` defaults to **`true`**, not `false`).
- **Changelog release sync** — daily (`CHANGELOG_RELEASE_SYNC_CRON`, default `0 6 * * *`), imports missing GitHub Releases into `ChangelogEntry`. Also enabled by default.
- **Views flush** — every 10 minutes, moves buffered portfolio-view and share-link-view counts from Redis into Postgres.
- **Usage metrics flush** — daily (`USAGE_METRICS_FLUSH_CRON`, default `10 0 * * *`), moves buffered usage-event counters from Redis into `UsageMetricDaily`, only for fully-completed UTC days.
- **Portfolio access job** — hourly (`0 * * * *`), does two things: suspends any portfolio stuck in a `GRACE` billing state whose grace period has actually expired, and garbage-collects abandoned image uploads (portfolio assets stuck `PENDING` for more than 24 hours), including deleting the associated R2 objects.

The GitHub sync, changelog sync, and usage-metrics jobs each also run a catch-up check on startup, so a window missed during downtime is partially covered.

### Node clustering & runtime resilience

The server clusters across CPU cores in production (via `throng`), with graceful shutdown handling (in-flight requests drained, then Redis/Prisma disconnected) per worker. A fail-fast configuration validator runs once in the master process before any worker starts, and in production additionally enforces things like: SMTP-only email delivery, a non-default auth secret, an HTTPS auth base URL, a dedicated API-key hashing secret distinct from the general auth secret, and the presence of Dodo/R2 credentials — so a misconfigured production deploy fails at boot rather than silently 503ing on the first real checkout or upload.

### Email & notifications

Seven distinct transactional email templates: OTP/one-time-passcode, welcome, new-device login alert, account-deletion confirmation, subscription-purchased, subscription-cancelled, and portfolio-published/updated — plus a shared HTML layout wrapper and a general contact-form relay. Delivery is via SMTP in production (the local/dev default is a console/no-op provider that doesn't actually send anything).

### Caching

Redis-backed, with resource-specific TTLs rather than one blanket policy — roughly: roadmap listings/stats/tags ~30 days (`2592000s`), **changelog ~30 days**, GitHub stats 12 hours (`43200s`), billing summary/history ~1 minute, credit wallet summary/history 30–60 seconds, affiliate dashboard 1 minute / leaderboard 5 minutes, document lists 30 minutes / a single document 1 hour, admin dashboard stats 30 minutes, and API-key auth results 5 minutes (explicitly busted immediately on a subscription-status-changing billing webhook, so a lapsed key can't keep working for the remainder of its cache window).

### Rate limiting

Tiered, with real per-route special cases layered on top of a general default: share-link password verification is capped at 3 attempts/5 minutes (anti-brute-force), the public contact form at 5/hour, usage-metrics ingestion at 15/minute, and AI endpoints use their own dedicated window/limit (credit/quota-based rather than raw-rate-limited, on top of the general limiter). The limiter is Redis-backed with a bounded in-memory fallback if Redis is unreachable, and normalizes dynamic path segments (IDs, UUIDs) to a placeholder before keying, so requests to different specific resources under the same route share one counter rather than each minting an unbounded number of rate-limit keys.

### CORS & security headers

CORS is scoped to an explicit allowed-origins list plus a regex-matched wildcard for `*.veriworkly.com` (portfolio subdomains, both dev and prod patterns) — credentials are only granted to explicitly-listed origins, not the wildcard-matched ones. Security headers are applied globally, and the Portfolio app additionally sets a Content-Security-Policy header on published/preview pages.

### Security & infrastructure notes, expanded

- **ATS job-description URL fetch** has comprehensive SSRF protections: HTTPS-only, standard-port-only, blocks localhost/`.local`/embedded-credential hostnames, DNS-resolves and rejects all private/loopback/link-local IP ranges (including IPv6 equivalents), **pins the resolved IP** for the actual outbound request (closing the DNS-rebinding gap between validation and fetch), caps redirects at 3 (re-validating each hop), caps response size at 2MB, enforces an 8-second timeout, and requires a minimum amount of extracted visible text before accepting the page as a real job description.
- **Portfolio image uploads** go through presigned R2 PUT URLs (10-minute expiry) plus a verify-on-complete step that HEAD-checks the actually-uploaded object's size/content-type/ETag against what was declared at presign time, before marking it usable — preventing a client from presigning for one file and uploading something else. Only jpg/png/webp, 5MB cap.
- **View-counting anti-gaming** — both portfolio views and share-link views dedupe repeat views from the same IP within a 30-minute window before incrementing anything, so refreshing a page repeatedly doesn't inflate analytics.
- **Password/secret handling is intentionally different per use case** — share-link passwords use `scrypt` (general-purpose, slow-by-design password hashing) since they're user-chosen secrets; API keys use HMAC-SHA256 (fast, deterministic) since they're high-entropy generated secrets looked up by hash rather than verified against a salted hash.

---

## Pricing & Monetization

_(Payments are currently disabled for all non-admin accounts in production for both Studio-side subscriptions and Portfolio's checkout page — see the rollout notes above. Figures below reflect what's built and configured, not what's actively being charged today.)_

|                             | **Free**                  | **Creator Pro** (`portfolio_pro`) | **AI Standalone** (`ai_credits`) | **Job Hunter Bundle** (`bundle`, recommended) |
| --------------------------- | ------------------------- | --------------------------------- | -------------------------------- | --------------------------------------------- |
| Monthly price               | $0                        | $9.99                             | $5.99                            | $14.99                                        |
| Annual price                | —                         | $95.88/yr (≈$7.99/mo)             | $59.90/yr (≈$4.99/mo)            | $143.88/yr (≈$11.99/mo)                       |
| Resume/cover letter editor  | ✅                        | ✅                                | ✅                               | ✅                                            |
| Private portfolio drafts    | ✅                        | ✅                                | ✅                               | ✅                                            |
| Public portfolio publishing | ❌ (shared path only)     | ✅ custom subdomain               | ❌                               | ✅ custom subdomain                           |
| Portfolio analytics         | ❌                        | ✅                                | ❌                               | ✅                                            |
| Watermark removal           | ❌                        | ✅                                | ❌                               | ✅                                            |
| AI writing credits          | ❌                        | ❌                                | ✅ 1,000/mo (12,000/yr)          | ✅ 1,000/mo (12,000/yr)                       |
| ATS score optimization      | limited (free scan quota) | —                                 | ✅ 300/period                    | ✅ 300/period                                 |

All prices are cents-denominated in `productCatalog.ts`; annual figures above are the exact catalog values (`9588`, `5990`, `14388`), not rounded marketing numbers.

**Entitlements, not plan names, are what actually gate features.** Creator Pro grants the five portfolio entitlements; AI Standalone grants `ai_credits`; the Bundle grants all six. This is why, e.g., Creator Pro alone does **not** raise the ATS scan quota — that check keys off `ai_credits` specifically.

**A UI nuance not obvious from the table:** the _only_ plan with a working annual-billing toggle in the live `/pricing` checkout UI is the Job Hunter Bundle — `PricingExperience.tsx` holds a single `bundleInterval` state, and `PricingAlaCarte.tsx` hardcodes `"monthly"` for the other two. The annual Creator Pro and AI Standalone prices are real and configured in the catalog, but no button on the page purchases them. **Still true as of 2026-07-29.**

**Purchasability depends on deployment config:** `publicCatalog()` reports only the intervals whose corresponding `DODO_PAYMENTS_*_PRODUCT_ID` env var is actually set, so what a given deployment offers is narrower than the catalog above if product IDs are missing.

**Time-boxed passes** (for short job-hunt sprints) are accurately described and fully wired end-to-end: a 3-Day pass ($2.99, ~150 AI credits) and a 7-Day pass ($5.99, ~400 AI credits), each bundling portfolio hosting + ATS tools + unlimited downloads for the window. (The backend's internal naming calls these `one_day`/`seven_day` intervals but maps them to 3 and 7 actual calendar days respectively — a naming quirk, not a functional bug.)

**One-time AI credit top-ups — now internally consistent.** The purchasable catalog (`creditPackCatalog` in `productCatalog.ts`) defines **two** packs:

| Pack key          | Credits | Expiry  | Published price |
| ----------------- | ------- | ------- | --------------- |
| `credit_pack_250` | 250     | 90 days | $2.99           |
| `credit_pack_500` | 500     | 90 days | $4.99           |

Prices are set on the corresponding Dodo products, not hardcoded in app code — the figures above are the currently published ones, mirrored in `apps/site/public/pricing.md` and the live `/faq`. Per the Terms of Service, pack credits may also expire immediately on cancellation of an associated subscription where stated. Monthly subscription credits do **not** roll over.

_(This replaces a genuinely bad earlier state, recorded here so the history stays honest: this doc previously described the catalog as **exactly one** pack of 100 credits with a 365-day expiry, while `pricing.md`/`llms.txt` advertised 250/$2.99 and 500/$4.99 and the `/faq` page advertised a third, different pair — 250/$1.99 and 600/$3.99. All four sources now agree on the two packs above. Re-verified 2026-07-29.)_

Note the packs still have **no working purchase button on `/pricing`** — they are purchasable through `/billing` in Studio.

**Affiliate commissions:** a 3-tier recurring commission structure — Tier 1 "Starter" 2% (no minimum), Tier 2 "Growth" 3% (10+ conversions), Tier 3 "Partner" 5% (50+ conversions) — paid out via a wallet system with a $25 minimum withdrawal. Tier promotion is admin-driven, not automatic — see [Affiliate & Ambassador Programs](#affiliate--ambassador-programs).

⚠️ **See [Known Gaps & Inconsistencies](#known-gaps--inconsistencies)** — the table above is the _marketing-page_ version of the plan comparison; the backend's actual enforcement logic for the resume/cover-letter document cap doesn't fully match it, and several site-internal naming/pricing contradictions exist independent of this doc.

---

## Known Gaps & Inconsistencies

Flagged here rather than silently resolved, so the product narrative stays honest about what's settled vs. what needs a decision. Items are grouped roughly from "documented product-vs-marketing mismatch" toward "internal content bugs on the site," but all are worth someone's attention.

1. **Free/paid document-count limits don't fully agree with each other.** The pricing page says Creator Pro still caps a user at 1 active resume/letter (only the Bundle plan removes that cap), but the backend's own document-creation logic lifts the 1-per-type cap for _any_ user holding either the `ai_credits` **or** the `portfolio_publish` entitlement — meaning a Creator Pro subscriber (who only holds `portfolio_publish`) should already be unlimited per that code path, contradicting the marketing copy. Needs a product decision on which is correct, then the other side fixed.
2. **Master Profile gating is ambiguous.** The pricing comparison table lists "Master Profile unlocked" as a Bundle-only perk (in some copy), but the actual Master Profile read/write endpoints and the auto-seed-new-document logic show no entitlement check at all today — it behaves as available to everyone. Needs the same kind of reconciliation.
3. **LinkedIn import is AI-parsed text, not a real LinkedIn integration**; GitHub import, by contrast, is a genuine OAuth/API integration — but even its "unlimited" paid tier has a hidden 50-imports/day cap to protect the shared GitHub API token budget, which has no user-facing messaging today. Worth being precise about both distinctions in any public messaging.
4. **~~`ai:write` API-key scope isn't actually issuable~~ — RESOLVED.** An earlier version of this doc flagged this as a live gap. It is not: `ai:write` is present in both the backend's `ALLOWED_SCOPES` set and the Studio scope-picker UI, and the backend's own code comment references this exact issue as something already fixed ("the `ai:write` incident this fixed"). Kept here as a closed item so the doc's history stays honest rather than silently vanishing.
5. **Roadmap voting/bookmarking/comments** have a data model and are readable (any existing interaction rows are returned as part of a feature's public detail response), but there's still no route anywhere that lets a user actually create one — the feature is read-visible but not write-reachable. Likely either unfinished or intentionally not yet turned on.
6. **Document hard-delete/restore** exist as fully working methods at the service layer but aren't wired to any route — only soft delete is currently reachable.
7. **Cipher template drift, confirmed still unresolved:** the template's own internal design document describes it as a secondary "mode" toggled from within the Nimbus template, but it ships as a fully independent, separately selectable, premium-gated template in the actual catalog.
8. **Document types are narrower than the product vision** — but the dispatcher blocker is gone. Only Resume and Cover Letter exist as buildable document types today; `PORTFOLIO` and `LINK_IN_BIO` exist in the `DocumentType` enum, but Portfolio is a separate product surface with its own editor and Link-in-bio is unbuilt. Invoices, formal letters, and other planned types remain vision-stage. _(This item previously also said "the export dispatcher isn't type-driven yet — adding a third type would need real dispatcher work." That's no longer accurate: `exportDocumentByType` now switches on `document.type` with an `assertNever` guard, so a third type needs its own format handler and editor, not a dispatcher rewrite.)_
9. **Portfolio section-type mismatch between editor and publish validation.** The portfolio editor offers all 18 section types (including certifications, languages, interests, publications, patents, test scores, achievements, volunteer, custom). The backend's publish-time content validator only accepts 9 of them (projects, experience, services, skills, education, writing, testimonials, awards, contact). A portfolio using any of the other 9 section types would fail server-side validation at publish time. This needs resolving — either broaden the validator to match the editor, or narrow what the editor offers.
10. **~~Ambassador program's rewards layer is the next rollout milestone~~ — PARTIALLY RESOLVED.** The **admin-review workflow has shipped end to end** — API (`GET /admin/ambassadors`, `GET /admin/ambassadors/:id`, `GET /admin/ambassadors/roster`, `PATCH /admin/ambassadors/:id`, transactional and audit-logged) **and** the Studio screen at `/admin/ambassadors`, which closes the "no admin UI" gap this item used to call out. The application schema grew from 2 fields to 7 behind a dedicated `AmbassadorApplication` model. What remains genuinely unbuilt: the points economy, `.edu` verification, voucher redemption, and the ambassador leaderboard — none of which have any database model — plus the ambassador rewards dashboard in Studio. See [Affiliate & Ambassador Programs](#affiliate--ambassador-programs).
11. **~~Credit top-up pack catalog disagrees with itself in three different places~~ — ✅ RESOLVED (verified 2026-07-29).** The backend now defines two packs (250 credits and 500 credits, both 90-day expiry), and `pricing.md`, `llms.txt`, and the live `/faq` all now state 250/$2.99 and 500/$4.99, matching. The earlier three-way disagreement (a single 100-credit/365-day backend pack vs. 250/500 in `pricing.md` vs. 250/$1.99 and 600/$3.99 on `/faq`) is gone. Kept as a closed item. _Residual:_ the packs still have no purchase button on `/pricing` — they're bought via `/billing`.
12. **~~"Creator Pro" vs. "Portfolio Pro" naming inconsistency~~ — ✅ RESOLVED (verified 2026-07-29).** A repo-wide search across `apps/site`, `apps/studio`, and `apps/portfolio` returns **zero** occurrences of the string "Portfolio Pro". Everything says "Creator Pro". Note the internal `productKey` is still literally `portfolio_pro` and `Subscription.productKey` defaults to it — that's an internal identifier, not user-facing copy, and is fine as-is.
13. **~~Licensing claim mismatch (MIT vs. AGPLv3)~~ — ✅ RESOLVED (verified 2026-07-29).** `apps/site/public/llms.txt` no longer says "Open Core (MIT/AGPLv3)"; it now states MIT, with an explicit carve-out that the private `template-library` submodule is closed-source. That matches `LICENSE`, the ToS, and the FAQ. **Note the `LICENSE` file's copyright holder is "Gautam Raj," not "VeriWorkly Team"** — worth keeping consistent in any copy that quotes it.
14. **~~Affiliate marketing page contradicts itself on payout mechanics (Stripe)~~ — ✅ RESOLVED (verified 2026-07-29).** A repo-wide search of `apps/site` returns **zero** occurrences of "Stripe". Payout copy now consistently reflects the actual mechanism: Dodo has no payout API, so payouts are executed out-of-band and recorded manually by an admin.
15. **~~docs-platform contradicts itself on PDF rendering architecture~~ — ✅ RESOLVED (2026-07-29).** The Operations runbook no longer describes a server-side Playwright/headless-browser renderer. The docs now state consistently that all six export formats are generated client-side and that no headless browser exists in the repo.
16. **~~Nimbus's marketing copy claims a live clock it doesn't have~~ — ✅ RESOLVED (verified 2026-07-29).** The template registry's `strengths` for Nimbus now read `["GSAP animations", "Bento mouse-glow", "Cursor-follow interactions"]` — no live-time claim. For the record, the live local-time display genuinely belongs to **Signal and Cipher**; both call `toLocaleTimeString` on an interval, and Nimbus has no clock component at all.
17. **Portfolio's anti-copy preview protections have been intentionally removed, not merely left undocumented.** Right-click/devtools/text-selection/print blocking on template preview pages was deliberately deleted (it was trivially bypassable and broke legitimate use like Ctrl+F and screen readers). Any lingering public messaging implying preview pages are "protected" from copying should be retired.
18. **~~The blog's architecture post omits `apps/portfolio`~~ — ✅ RESOLVED (verified 2026-07-29).** The post now lists `apps/portfolio` in its app enumeration and gives it its own section covering the template gallery, editor, and published sites.
19. **Only the Job Hunter Bundle has a working annual-billing toggle in the live `/pricing` checkout UI** — **still true.** `PricingExperience.tsx` holds a single `bundleInterval` state and `PricingAlaCarte.tsx` hardcodes `"monthly"` for Creator Pro and AI Standalone, even though both have real, configured annual prices in `productCatalog.ts` ($95.88/yr and $59.90/yr). See [Pricing & Monetization](#pricing--monetization).
20. **The docs-platform production build is currently broken by a dependency conflict.** `fumadocs-openapi@10.10.3` imports `useTranslations` from `fumadocs-ui/contexts/i18n`, but `fumadocs-ui@16.13.0` renamed that export to `useI18n`. Both floated in on `^` ranges, so `npm run build:docs` fails at SSR bundling. The MDX content itself is fine (all 39 pages compile). Fix is a dependency decision: pin `fumadocs-ui`/`fumadocs-core` back to a compatible 16.9–16.12, or upgrade `fumadocs-openapi` to 11.x (a major bump that may change the `api-page.tsx` integration).
21. **`compose.yaml` had a broken API build context — fixed 2026-07-29.** It specified `context: ./server` with `dockerfile: Dockerfile`, but there is no `./server` directory at the repo root; `apps/server/Dockerfile` explicitly documents that it expects the **repository root** as its build context. `docker compose up --build` could never have succeeded. Now corrected to `context: .` / `dockerfile: apps/server/Dockerfile`. Recorded here because the docs' self-hosting flow depends on it.
22. **The repository root defines no `test` script.** Contributor docs previously instructed `npm test` from the root, which fails. The real commands are `npm test -w @veriworkly/server` (Vitest) and `npm run test:contracts -w @veriworkly/studio`. Worth either adding a root `test` script that fans out, or keeping the workspace-scoped commands documented — currently the latter.
23. **No self-service account deletion exists.** Better-Auth's `deleteUser` endpoint is not enabled and no Studio UI calls it, yet the account-deletion email template and the `databaseHooks.user.delete` hook both exist. Deletion is a manual, support-driven process today. Any privacy copy claiming users can delete their account "via Settings" is inaccurate — the docs have been corrected, but this is worth building.
24. **~~`apps/site`'s privacy policy states user data lives in IndexedDB~~ — ✅ RESOLVED.** All references to IndexedDB across `apps/site`, `apps/studio`, `apps/portfolio`, and `apps/docs-platform` have been updated to `localStorage`.
25. **`AuditLog` is modelled but has no writer.** A generic HTTP request/error audit table exists in the schema, but a repo-wide search of the server source turns up nothing that writes to it. `AdminAuditEntry` is the audit table actually in use. Either wire `AuditLog` up or drop it.
26. **`TRUST_PROXY=true` is rejected in production** — worth knowing because it's easy to set wrongly. A bare `true` trusts every hop and lets a client spoof `X-Forwarded-For`, defeating IP-based rate limiting; the boot validator requires an explicit hop count or CIDR instead. Not a bug, but a deploy-time footgun.

---

## Vision & Roadmap

Direction the product is heading, in the founder's own words, reconciled with current state:

- **More document types.** Beyond resume and cover letter: invoices, formal letters, and other everyday professional documents, all sharing the same Master Profile-driven prefill, editor shell, and export pipeline that resumes and cover letters already use. Not yet started in code — but the prerequisite work has landed: the export dispatcher is now genuinely type-driven with an `assertNever` guard, so a third type needs its own format handler and editor rather than a dispatcher rewrite (see [Known Gaps](#known-gaps--inconsistencies) #8).
- **General portfolio availability.** The authenticated workspace (dashboard, editor, analytics, settings) is already open to every logged-in user in production as of this writing. The remaining rollout step is opening the publish action and checkout to every account — both are staged behind the same admin-first launch validation today, and both are on track to open up as the general-availability rollout completes.
- **Deeper LinkedIn integration.** The long-term intent is closer to true LinkedIn data import (not just paste-and-parse), matching the GitHub OAuth-based import model.
- **AI everywhere.** Continuing to expand AI assistance across every surface — documents, portfolio copy, ATS feedback — while keeping the existing transparency principle (show cost/mode before generating, require explicit replace).
- **Master Profile as the connective tissue.** Keep expanding what auto-seeds from the Master Profile across all document types and the portfolio builder, while preserving the one-way rule (editing a document never mutates the Master Profile).
- **Keep the free tier genuinely usable.** No login wall to start building; free users should always be able to produce one clean resume, one cover letter, and a working (if watermarked and less customizable) portfolio.
- **Ambassador program's rewards layer.** Application intake **and admin review** are both live now; the remaining build phase is the points/verification/redemption system already previewed on the public marketing page, plus an admin review _screen_ and the ambassador rewards dashboard in Studio (see [Known Gaps](#known-gaps--inconsistencies) #10) — bringing the program to full parity with what Affiliate already has live.

The live, granular, day-to-day roadmap — with real ETAs, status, and community voting (once the write-side of that feature is turned on) — is admin-managed product data, browsable at `/roadmap` on the live site. This file captures direction and values; it isn't a substitute for that backlog.

---

## Documentation & Content Debt

**docs.veriworkly.com — brought fully current on 2026-07-29.** Every page under `content/docs` was audited line-by-line against the codebase and rewritten where wrong. It now covers: getting started (quick start, local setup, Docker), architecture (monorepo, state management, export pipeline, auth, database schema, resume schema, design system), a **Product Guides** section (Master Profile, cover letter builder, the full Portfolio product across four pages, ATS checker, AI writing assistant, billing & credits, affiliate program, ambassador program), user guides, an Operations section (environment variables, API-key security runbook, service status), legal pages, and a contributing guide. The API reference now documents affiliates, AI, ambassador, ATS, billing, documents, portfolios, portfolio assets, profile, profile-import, and shares in addition to the original auth/API-keys/GitHub/health/roadmap/users.

**Errors that were corrected in that pass**, listed because they're the class of thing that recurs and because several of them originated in _this_ file:

- **IndexedDB → `localStorage`** (documented in 3 places; there is no IndexedDB in the repo).
- **Radix UI and React Hook Form** were listed in the stack table; neither is a dependency of any workspace.
- **`docx`** was listed as a backend dependency; it's a Studio client-side one.
- **API key scopes** listed `roadmap:write` and `github:write` (which don't exist and are rejected) and omitted `ai:write` and `changelog:read`.
- **`/health`** was documented as probing Postgres and Redis; that behaviour moved to `/health/ready`.
- **Share links** were described as reflecting edits live and as supporting multiple links per document; both are wrong — they serve a static snapshot and are unique per document.
- **Account deletion** was documented as available in Settings; it isn't implemented.
- **OTP window** was documented as 10 minutes; it's 5.
- **PDF exports** were credited with semantic structure tags and Author/Keywords metadata; react-pdf emits untagged PDFs and only `title` is set.
- The **database schema page** documented `Resume` and `ResumeShareLink` models that don't exist (they're `Document` and `ShareLink`), and the **resume schema page** omitted `customSections` and most of `ResumeCustomization`.
- Broken setup instructions: `cd veriworkly-resume`, a root `npm test` that doesn't exist, the docs README citing port 3001 instead of 3002, and no mention of `apps/portfolio` or the private template submodule.

**A caveat on the docs' build:** the content is correct and all 39 MDX pages compile, but `npm run build:docs` currently fails on a `fumadocs-openapi` / `fumadocs-ui` version conflict — see [Known Gaps](#known-gaps--inconsistencies) #20.

**blog.veriworkly.com currently has 21 published posts** (covering multi-app architecture, career advice, ATS optimization, and affiliate/ambassador reward structures).

**Separately, `apps/site` runs its own machine-readable "documentation for AI" layer** (`llms.txt`, `pricing.md`, an AI-crawler-allowlisted `robots.txt`) aimed at answer engines rather than human readers — a third content channel alongside docs-platform and blog-platform, with its own staleness risk. Its credit-pack and licensing claims have caught up with the backend; its **privacy policy has not** (see [Known Gaps](#known-gaps--inconsistencies) #24).

**Four content channels now exist, and they drift independently.** In rough order of how quickly they go stale: `apps/site` marketing copy → `llms.txt`/`pricing.md` → blog → docs. This file is the reconciliation point; when they disagree, verify against code and fix the source, not just the symptom.

---

## Appendix: Data Model Reference

Plain-language summary of the core backend data model (PostgreSQL via Prisma, `apps/server/prisma/schema.prisma`), for anyone (including future documentation writers) who needs to reason about how the pieces fit together.

**Identity/auth (Better-Auth tables plus VeriWorkly-specific fields on `User`)**

- **User** — one account. Better-Auth's own fields (email, unique `username`, name, emailVerified, image) plus VeriWorkly-specific fields: `autoSyncEnabled` (**default `true`**), affiliate status/tier/code/enrollment-date, `role` (`USER`/`AMBASSADOR`/`ADMIN`), `ambassadorStatus` (free-text, default `"NONE"`), a one-to-one `ambassadorApplication` relation, and the last-run timestamps for GitHub/LinkedIn import (used to enforce the free-tier cooldowns). **Note:** `collegeName`/`graduationYear` no longer live on `User` — they moved to the `AmbassadorApplication` model. `username` is what gates public share links, since share URLs are username-scoped.
- **Session / Account / Verification** — standard Better-Auth session, OAuth/credential, and email-verification tables.

**Documents / profile**

- **Document** — the unified record for resumes, cover letters, portfolios, and link-in-bio pages: `type` (`RESUME`/`COVER_LETTER`/`PORTFOLIO`/`LINK_IN_BIO`), title, JSON `content`, optional `metadata`, template ID, `visibility` (`PRIVATE`/`UNLISTED`/`PUBLIC`), a per-user-unique `slug`, tags, schema version, `revision` (optimistic concurrency), and a soft-delete `deletedAt` timestamp.
- **MasterProfile** — one JSON blob per user, no other structural fields, no entitlement gating.
- **ShareLink / ShareView** — **at most one link per (user, document)**, enforced by `@@unique([userId, documentId])`, with a second `@@unique([userId, slug])` on the public slug. Carries an optional `scrypt`-hashed password, optional expiry, view count, last-viewed time, and a `snapshot` of the document at share time (the public page serves the snapshot, not the live document). `ShareView` holds individual per-view records feeding the buffered view-analytics flush.

**Billing / entitlements / credits**

- **Subscription** — provider/customer/price/subscription IDs, a free-text `productKey`, `status` (`INACTIVE`/`TRIALING`/`ACTIVE`/`PAST_DUE`/`CANCELED`), `interval` (`ONE_DAY`/`SEVEN_DAY`/`MONTHLY`/`ANNUAL`), grace-period end date, cancel-at-period-end flag, and a last-webhook timestamp used to keep out-of-order webhook delivery from corrupting state.
- **EntitlementGrant** — a named capability key, its source (`SUBSCRIPTION`/`MANUAL`/`PROMOTION`/`SYSTEM`), and a start/end/revoked window.
- **CreditWallet / CreditGrant / CreditTransaction / CreditReservation** — the credit ledger: wallet balance and lifetime totals, individual expiring grants, a full transaction history, and a two-phase reserve/commit/release flow for in-flight AI calls.
- **CreditUsageAllocation** — a join table recording exactly which credit grant(s) funded each transaction, FIFO by expiry, so multi-grant balances get consumed in the right order.
- **BillingWebhookEvent** — every Dodo webhook received, keyed by provider event ID (idempotency), with a processing status and retry count. This table is also what powers the user-facing "billing history" list.

**Portfolio**

- **PortfolioPublication** — a published portfolio's live state: status (`LIVE`/`GRACE`/`SUSPENDED`), unique subdomain, a content snapshot, the published revision number, and suspension metadata.
- **PortfolioAsset** — uploaded portfolio images (avatar/project-cover/social-image), their R2 upload status (`PENDING`/`READY`), checksum, and size — abandoned `PENDING` uploads over 24 hours old are garbage-collected by a scheduled job.
- **PortfolioViewDaily** — daily aggregated view counts per publication, date, and referrer host.

**Affiliate**

- **AffiliateReferral** (status: signed up / converted / rejected), **AffiliateClick**, **AffiliateCommission** (status: pending / available / reversed / paid, with a basis-points rate and cent amount), **AffiliateWallet** (pending/available/paid cent totals), **AffiliateWithdrawal** (status: requested / approved / rejected / paid). Tier rates live in `AFFILIATE_TIER_RATE_BPS` (`TIER_1` 200 bps, `TIER_2` 300, `TIER_3` 500); the withdrawal minimum is `AFFILIATE_MINIMUM_WITHDRAWAL_CENTS = 2500`.

**Ambassador**

- **AmbassadorApplication** — one per user (`userId @unique`): `collegeName`, `graduationYear`, `whyJoin`, `superpower`, `funFact`, optional `vibeCheck`/`socialHandle`, a `status` enum (`PENDING`/`APPROVED`/`REJECTED`), and review metadata (`reviewedBy`, `reviewedAt`, `reviewNote`). Approval flips this status and the user's `role` in one transaction. **No points, redemption, or ambassador-leaderboard model exists** — the marketing page's points economy is unbuilt.

**Roadmap & changelog**

- **RoadmapFeature** — public roadmap items: a free-text status (`"todo"`/`"in-progress"`/`"done"`, not a database enum), full description, why-it-matters narrative, timeline, and completed-quarter fields.
- **RoadmapInteraction** — per-user votes/bookmarks/comments on a feature; has data and is read-visible via the feature detail endpoint, but has no write-side route today.
- **ChangelogEntry** — one row per shipped release: a unique `version`, title, summary, free-text `type` (`"major"`/`"minor"`/`"patch"`), `publishedAt`, `githubUrl`, `prRefs` (JSON), `tags`, and five categorised string arrays: `added`, `improved`, `fixed`, `breaking`, `security`. Populated manually via the admin routes or automatically by the daily GitHub-Releases sync job.

**Usage / observability**

- **UsageMetricDaily** — daily event counters flushed from Redis, one row per (date, event).
- **UsageMetricFlushBatch / ViewFlushBatch** — idempotency markers so a crashed or racing flush job can't double-count or silently drop a batch.
- **GitHubSync / GitHubSyncItem** — the VeriWorkly repo's own issue/PR sync state and synced items (etag, last sync status, next sync time).
- **AdminAuditEntry** — the admin action log actually used by the monetization console (credit/entitlement grants, affiliate moderation, withdrawal decisions).
- **AuditLog** — a separate, more generic HTTP request/error audit table that exists in the schema but, as far as a repo-wide search of the server's source turned up, nothing currently writes to it — effectively unused today despite being modeled.

**Developer API**

- **ApiKey** — a hashed secret (HMAC-SHA256, never plaintext; keys are issued as `vw_` + 64 hex chars), a display prefix/suffix, an array of granted scopes (defaulting to `["user:read"]` if none are requested), a per-key rate limit (default 20 / 15 min), and expiry/revocation timestamps. The eight valid scopes are `user:read`, `user:write`, `resume:read`, `resume:write`, `roadmap:read`, `changelog:read`, `github:read`, `ai:write`.

---

## Change log for this file

Kept so the reference's own accuracy is auditable.

| Date           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2026-07-29** | Full re-verification against `master`. Corrected: the section-reorder "dead code" claim (drag works), the export dispatcher claim (now type-driven), the theme "no system option" claim, the "multiple share links per document" claim (it's one), the API-key scope list (added `changelog:read`, noted the Studio picker gap), the ambassador section (rewritten — 7-field application, dedicated model, admin review live, apply form moved to the marketing site), the credit-pack catalog (250/500 at 90 days, now consistent across all surfaces), cron job count (4 → 5), and stack versions. Added: the public changelog feature, health-endpoint split, and Known Gaps #20–26. Marked resolved: #11, #12, #13, #14, #15, #16, #18, and partially #10. |
| **2026-07-24** | Prior full verification, on branch `feat/ambassador-program`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
