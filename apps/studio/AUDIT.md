# VeriWorkly Studio — Full Codebase Audit

**Scope:** `apps/studio` (Next.js 16 / React 19 / TypeScript / Zustand / Tailwind v4) — the resume, cover letter, ATS, billing, affiliate/ambassador, API key, and admin workspace app.
**Method:** Every source file under `app/`, `components/`, `features/`, `templates/`, `hooks/`, `lib/`, `providers/`, `store/`, `utils/`, `types/`, and `tests/` was read in full (not sampled). Findings are grouped by area, each with file path, approximate line numbers, why it matters, and a concrete fix. Severity is noted where it materially changes priority.

**How to read this document:** it is long by design — the request was to audit _everything_. If you only have time for one pass, read the **🔴 Critical / High** items in each section first, then the "Duplication & consolidation opportunities" call-outs, which are the highest-leverage code-quality wins.

---

## 1. App Router (`app/`) — pages, layouts, API routes

### 🔴 Critical: `/admin/*` has no role-based access control in the frontend

- **Files:** `app/admin/layout.tsx`, `proxy.ts` (Next.js middleware), `app/admin/page.tsx`
- **Finding:** `proxy.ts` (the Next middleware — see `PROTECTED_PATH_PREFIXES = ["/admin", "/profile/master", "/profile/advanced"]`) only checks **whether a session cookie exists** (`isAuthenticated = !!sessionCookie`). It does not check the user's role. `app/admin/layout.tsx` renders `<AdminNavbar />` and `children` unconditionally — no `fetchCurrentUser()` + role check, no redirect, no `notFound()`. `app/admin/page.tsx` does call `fetchCurrentUser()`, but only to display the signed-in email (`user?.email || "Admin"`); it never gates on `user.role`.
- **Why it matters:** As written, **any logged-in user** (not just admins) can navigate to `/admin`, `/admin/roadmap`, `/admin/roadmap/new`, `/admin/monetization`, etc., and the full admin shell, navigation, and page structure will render. The only thing that can stop a non-admin from actually seeing/mutating data is the backend (`apps/server`) rejecting the forwarded-cookie requests in `features/admin/services/admin-server.ts` (`fetchAdminDashboardStatsServer`, `fetchAdminMonetizationServer`, `fetchAdminRoadmapServer`) with a 401/403 — which, if true, only means the page fails into an error boundary rather than being hidden. That's defense-in-depth failure: it relies entirely on the backend never missing a check, exposes the existence/structure of admin tooling (nav labels, monetization/roadmap actions, form fields) to any authenticated user, and there is no verification in this codebase that the backend actually enforces it.
- **Fix:** Add an explicit role check in `app/admin/layout.tsx` (e.g. `const user = await fetchCurrentUser(); if (user?.role !== "admin") notFound();`) so the frontend fails closed independent of backend behavior. Treat backend enforcement as required but not sufficient.

### 🟠 High: dev-only PDF debug route is not gated in production

- **Files:** `app/(main)/pdf-debug/[type]/[templateId]/page.tsx`, `PdfDebugClient.tsx`, `app/(main)/editor/[type]/[id]/preview/PreviewClient.tsx:80`
- **Finding:** The link to `/pdf-debug/...` is hidden behind `process.env.NODE_ENV === "development"` in `PreviewClient.tsx`, but the route itself has no such guard — `page.tsx` only validates that `type` is `"resume" | "cover-letter"`. It is fully reachable in a production build by anyone who knows/guesses the URL. Impact is bounded because `loadResumeById`/`loadDocumentById` read from the _visiting browser's own_ local storage (not a server-side lookup by arbitrary user), so it can't leak other users' data — but it still ships and exposes internal debug tooling in prod.
- **Fix:** Gate the page itself (`if (process.env.NODE_ENV !== "development") notFound();`), not just the link to it.

### 🟠 High: side effect invoked directly during render (not just in `useEffect`)

- **File:** `app/(main)/pdf-debug/[type]/[templateId]/PdfDebugClient.tsx:93-95`
- **Finding:** `registerPdfFontById(...)` is called once inside a `useEffect` (correct) and a **second time directly in the component body**, outside any effect:
  ```tsx
  if (coverLetter) {
    registerPdfFontById((coverLetter.content as CoverLetterContent).appearance?.fontFamily);
  }
  ```
  Calling a side-effecting function (mutating `@react-pdf/renderer`'s global font registry) during render is not safe/idempotent — it can run extra times under React's Strict Mode double-invoke or on any re-render, and duplicates the effect call right above it.
- **Fix:** Delete the render-body call; keep only the `useEffect` version.

### 🟡 Medium: no validation that `productKey` and `interval` are a _valid combination_

- **File:** `app/(main)/checkout/page.tsx:3-13`
- **Finding:** `productKeys` (`ai_credits`, `portfolio_pro`, `bundle`) and `intervals` (`one_day`, `seven_day`, `monthly`, `annual`) are validated independently as whitelists, but nothing checks that, e.g., `productKey=ai_credits&interval=annual` is a sensible pairing for that product. Any product+interval combination that both individually pass the whitelist will reach `beginCheckout`.
- **Fix:** Either validate valid pairs in this page, or confirm (and comment) that `beginCheckout`/backend rejects invalid combinations explicitly rather than silently accepting them.

### 🟡 Medium: silent-failure server data fetchers mask backend outages as "empty state"

- **Files:** `app/(main)/(dashboard)/api-keys/page.tsx:22-54` (`fetchInitialApiKeys`), `app/(main)/(dashboard)/api-keys/[id]/page.tsx:17-40` (`fetchKeyDetails`)
- **Finding:** Both wrap their fetch in `try { ... } catch { return <empty/null shape> }`. If the backend is down or throws a network error, the API Keys page silently renders "0 keys" and the key-detail page silently 404s (`notFound()`), rather than surfacing a real error via the route's `error.tsx` boundary. A user with keys will see an empty list and reasonably conclude their keys were deleted.
- **Fix:** Only catch and degrade gracefully for _expected_ non-OK statuses (401/404); let unexpected exceptions propagate so the Next.js error boundary can show a real "something went wrong, retry" state instead of a false empty state.
- **Related inconsistency:** `fetchInitialApiKeys` pre-checks `cookie?.includes("veriworkly-auth")` and short-circuits before hitting the backend at all; `fetchKeyDetails` has no equivalent check and always calls the backend. This is inconsistent auth-gating between two sibling pages in the same feature, and the cookie check itself is a fragile substring match rather than a parsed-cookie-name check.

### 🟡 Medium: optimistic sync-preference toggle has no rollback or user-visible failure

- **File:** `app/(main)/(dashboard)/settings/components/SyncSection.tsx:64-82`
- **Finding:** `handleToggle` immediately flips local state and local storage (`setAutoSync`, `setAutoSyncEnabledInLocalStorage`, `setAllDocumentsSyncEnabled`) before the server call. If `updateAutoSyncPreference(checked)` throws, the failure is only `console.error`'d — no toast, no revert. The UI now disagrees with the server indefinitely.
- **Fix:** On failure, revert the toggle and `toast.error(...)` so the user knows the preference didn't actually save.

### 🟢 Low / consistency: root layout JSON-LD escapes `<`, login layout's does not

- **Files:** `app/layout.tsx:130-135` vs `app/login/layout.tsx:96-100`
- **Finding:** `app/layout.tsx` injects JSON-LD via `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}` (defends against `</script>` breakout). `app/login/layout.tsx` injects its own JSON-LD via plain `JSON.stringify(jsonLd)` with no such escaping. Both are currently static/hardcoded data so there's no live injection risk today, but the inconsistency means if either block ever incorporates dynamic data, one of the two is unprotected.
- **Fix:** Extract a single `toSafeJsonLd()` helper used by both call sites.

### 🟢 Low: SEO/robots contradiction on the app shell

- **Files:** `app/layout.tsx` (metadata `robots: {index:false, follow:false}` + rich Open Graph/Twitter/JSON-LD for `WebApplication`/`Organization`), `app/robots.ts` (disallows `/` entirely except `/share/`, `/login`)
- **Finding:** The root layout builds out full Open Graph images, Twitter cards, and two `<script type="application/ld+json">` blocks describing the app as a `WebApplication`/`Organization` with a `featureList` (including "No login required" — worth double-checking that claim is still accurate given the auth-gated dashboard) — all on a route tree that is simultaneously told (via metadata `robots` and `robots.ts`) not to be indexed or followed. This is a wasted-effort SEO surface: none of that markup will ever be consumed by a crawler that respects `robots`. Not a bug, but worth a cleanup pass: either the studio app isn't meant to be indexed (drop the OG/JSON-LD work here, it belongs on the marketing site) or indexing should be selectively enabled for the specific public pages (`/login`, `/share/*`) rather than blanket-disallowed.

### Duplication & consolidation opportunities (app/ area)

1. **`money(cents)` currency formatter duplicated verbatim in at least 6 files:** `affiliate/page.tsx` (via `AffiliatePage`), `affiliate/commissions/page.tsx:4-5`, `affiliate/leaderboard/page.tsx:4-5`, `affiliate/payouts/page.tsx:5-6`, `affiliate/tiers/page.tsx` (implicitly via tier rate display), `admin/monetization/page.tsx:48-49`. Extract to a single `formatCents(cents: number)` in a shared `lib/` or `features/billing` module.
2. **`getBillingServerData("/affiliates/me")` re-fetched independently on every affiliate sub-route** (`page.tsx`, `commissions/page.tsx`, `leaderboard/page.tsx`, `payouts/page.tsx`, `referrals/page.tsx`, `tiers/page.tsx`) — six separate server-side network round trips to the same endpoint across sibling routes with no shared caching/tag-based revalidation. Move the fetch into `affiliate/layout.tsx` and pass down via context/props, or use Next's `fetch` cache with a shared tag (`next: { tags: ["affiliate-me"] }`) and `revalidateTag` on mutation.
3. **`QuickLink` component redefined identically in 3+ files** (`api-keys/create/page.tsx`, `profile/advanced/page.tsx`, `profile/master/page.tsx`) — same props shape, same JSX, same classes. Extract to a shared component.
4. **The exact same 4-modal wiring block** (`DestructiveModal` + `SyncDetailsModal` + `ShareDocumentModal` + `RenameDocumentModal`, with identical prop plumbing from `useDocumentsWorkspace()`) is duplicated between `OverviewHome.tsx:129-166` and `documents/workspace.tsx:183-220`. Extract a single `<DocumentWorkspaceModals {...workspace} />` used by both.
5. **Template-resolution fallback chain duplicated:** `definition.templates.find(id===template) ?? definition.templates.find(id===defaultTemplateId) ?? templates[0]` appears verbatim in `editor/page.tsx:23-26` and `editor/[type]/[id]/page.tsx:40-43`. Extract `resolveTemplate(definition, requestedId)`.
6. **Post-authentication "bootstrap" sequence duplicated between two files:** `OtpForm.tsx` (`verifyCode`, lines ~58-91) and `login/callback/page.tsx` (`processLogin`, lines ~29-63) both: enable local sync flags → notify backend via `PUT /users/me/sync` → submit `ref` code via `POST /affiliates/referral` → compute a safe callback URL → `router.push` + `router.refresh`. The two implementations already differ in error handling (one logs to console, the other silently swallows), which is exactly the kind of drift duplicated logic invites. Extract one `completeSignInBootstrap(searchParams)` helper.
7. **The 3-badge "Local First / Encrypted Sync / Privacy First" trust strip** is copy-pasted verbatim across `login/page.tsx:152-164`, `OtpForm.tsx:229-241`, and `login/callback/page.tsx:108-120`. Extract `<AuthTrustBadges />`.
8. **`next/image` with `priority` on every card in an unbounded grid**, not just above-the-fold images: `RecentCard.tsx:40-47` and `DocumentPreviewCard.tsx:107-115` both set `priority` on every document thumbnail rendered (up to the full visible list). `priority` is meant for 1-2 true LCP images; applying it to every card in a grid defeats its purpose and forces the browser to eagerly fetch all of them at once, which is a real, measurable performance regression as a user's document count grows.

### Accessibility notes (app/ area)

- `DocumentActionsMenu.tsx` (`app/(main)/(dashboard)/documents/components/`): menu items for anonymous users (Share, Sync Now, View sync details) are styled to _look_ disabled (`opacity-50`) but are not actually `disabled`/`aria-disabled` — they remain focusable and clickable, firing a toast instead of performing the action. Screen reader users get no indication the item is unavailable until after activating it. Prefer `aria-disabled="true"` with a `title`/description, or a proper `disabled` attribute plus a tooltip explaining why.
- `ShowcaseCards.tsx` (login page carousel): auto-rotates every 5.5s indefinitely with no pause control and no `prefers-reduced-motion` handling — a vestibular-disorder/motion-sensitivity accessibility gap on a page every user sees.

---

## 2. Shared components, hooks, lib, providers, store, types, tests

### Modals (`components/dashboard/*Modal.tsx`, `components/modals/*.tsx`)

**Inconsistent modal API shapes.** `ConfirmationModal`, `DestructiveModal` (uses `onCloseAction`/`onConfirmAction` — the only modal with this naming), `RenameDocumentModal`, `NewDocumentModal`, `ImportProfileModal` all accept `open: boolean` and self-guard rendering. `ShareDocumentModal.tsx:342` and `SyncDetailsModal.tsx:102` instead hard-code `Modal open={true}` and rely entirely on the parent to conditionally mount/unmount — an inconsistent contract for otherwise-identical components. **Fix:** standardize every modal on `open` + `onClose`, and let the modal itself decide render/no-render.

**🔴 Bug — quota re-fetched on every keystroke.** `components/dashboard/ImportProfileModal.tsx:100-121`: the quota-fetch `useEffect` depends on `[open, isLoggedIn, githubInput]`. `githubInput` changes on every keystroke in the GitHub username field, so the effect tears down and re-fires `fetchApiData("/profiles/import/quota")` on every character typed while the modal is open — hammering the backend. `githubInput` should not be a dependency.

**🟠 Bug — stale state across reopen.** `ImportProfileModal.tsx:80-87`: only `activeTab` resets when `open` toggles; `githubInput`, `linkedinText`, `replaceMaster`, and `quota` are never reset. Close the modal after partially filling the LinkedIn textarea, reopen for GitHub import, and the old text/checkbox/quota data is still present.

**🟠 Race condition.** `components/modals/ShareDocumentModal.tsx:248-251`: the share-link refresh effect (`if (documentId && !isMissingUsername) void Promise.resolve().then(() => refreshShareLinks(documentId));`) has no cancellation guard. If `documentId` changes quickly (modal reused for doc A then doc B without unmount), a slow response for doc A can resolve after doc B's request and overwrite `shareLinks`/`expiry` with stale data — contrast with `ImportProfileModal`'s correct `let active = true; ... if (!active) return;` pattern in the same file family. The extra `Promise.resolve().then(...)` indirection is also pointless; should just be `void refreshShareLinks(documentId)`.

**🟡 Optimistic-success bug.** `ShareDocumentModal.tsx:94-97, 277-278`: `navigator.clipboard.writeText(url)` is called without awaiting/catching, yet `toast.success("Link copied to clipboard")` fires unconditionally right after — if the clipboard write is rejected (permissions, insecure context), the user is told it succeeded when it didn't.

**🟠 Dead null-check bug.** `components/modals/SyncDetailsModal.tsx:47-51`: `isConflicted = document.sync.status === "conflicted"` executes _before_ `if (!document) return null;`. If `document` could ever legitimately be null/undefined, this component already throws a `TypeError` before reaching its own guard — the check is unreachable/pointless as written. Move the null check to the top of the function body.

**Duplicated markup.** `ImportProfileModal.tsx:14-43` and `NewDocumentModal.tsx:7-36` define byte-identical inline `LinkedinIcon`/`GithubIcon` SVG components — extract once. The "icon chip + title + uppercase subtitle" modal header pattern is hand-rolled independently in 5 different modals even though the shared UI package (`packages/ui/src/components/ui/Modal.tsx:145-155`) already exports `Modal.Header`/`Modal.Description` for exactly this — none of the studio's modals use them. `components/dashboard/WorkspaceSearchModal.tsx` doesn't use the shared `Modal` primitive at all, so it misses the focus trap, focus-restore-on-close, and scroll-lock that every other modal gets "for free," and reimplements Escape/backdrop-click handling inconsistently (`onMouseDown` vs `onClick` elsewhere).

**Duplicate destructive-confirmation concepts.** `ConfirmationModal` has a `variant="destructive"` mode _and_ a separate `DestructiveModal` requiring typed confirmation ("type DELETE") — there's no visible rule for which a given delete flow should use, so equally destructive operations can end up with inconsistent friction.

**Code smell.** `ImportProfileModal.tsx:176-177, 208-209`: `window.dispatchEvent(new Event("storage"))` is used as an ad-hoc pub/sub signal. A bare `Event("storage")` is not a real `StorageEvent` (no `.key`/`.newValue`) — any listener inspecting those fields gets `undefined`. Prefer a custom event name, as is already done elsewhere (`open-import-profile`).

**Accessibility.** `ImportProfileModal`'s LinkedIn/GitHub tabs look like tabs but have no `role="tablist"`/`role="tab"`/`aria-selected` semantics. `ShareDocumentModal`'s icon-only Copy/Revoke buttons rely only on `title` for naming (not reliably announced by all screen readers) — add `aria-label`. `WorkspaceSearchModal` has no ArrowUp/ArrowDown navigation between results despite being a command-palette-style search.

**Coupling nit.** `DestructiveModal.tsx:35`: the reset-value timeout hardcodes `300`ms to match the shared `Modal.Content`'s `duration-300` transition class — undocumented coupling; extract a shared constant.

### Dashboard shell / navigation

- **`components/dashboard/AccountMenu.tsx`** uses `role="menu"`/`role="menuitem"` but implements none of the expected ARIA menu keyboard behavior (no arrow-key roving focus, Home/End, typeahead) — exposing the role without the interaction model is worse than not using it. It's also a **completely separate hand-rolled dropdown implementation** from `Navbar.tsx`'s `Menu`/`MenuItem` primitive (`@veriworkly/ui`) used for the same "account dropdown" concept — two different accessibility guarantees for one UI concept.
- **Duplicate, both-flawed logout implementations:** `AccountMenu.tsx:61-68`'s `handleLogout` has no try/catch around `await signOutCurrentUser()` (unhandled throw from an onClick). `Navbar.tsx:24-35`'s version catches but only `console.error`s and redirects regardless. Should be a single `useLogout()` hook with real user-facing error feedback.
- **`ThemeToggle.tsx`/`AccountMenuTheme.tsx`** duplicate the same dark/light toggle logic independently, and toggling only ever moves between explicit light/dark — there's no way back to `"system"` once left, silently discarding the user's original preference.
- **`StudioShell.tsx:62-84`:** `createNewDocument`'s billing check treats _any_ fetch failure (network error, timeout) the same as "not paid," and then blocks document creation past the free-tier limit — a transient network blip can incorrectly block a paying user. The free-tier limit (`1`) is a magic number duplicated between the check (line 75) and the user-facing message string (line 77) — should be one named constant. `STUDIO_VERSION = "v3.23.1"` (line 44) is hardcoded and will drift from `package.json`.
- **`components/layout/Footer.tsx`:** the same Tailwind class string is copy-pasted across ~15 `<Link>` elements instead of being data-driven the way `NavLinks.tsx`/`config/site.ts` already does it elsewhere in the app.

### Auth/session lib (`lib/`, `providers/`)

- **🟠 Security — incomplete open-redirect guard.** `lib/auth-redirect.ts:19`: `rawCallback.startsWith("/") && !rawCallback.startsWith("//")` only blocks the double-slash bypass. It doesn't defend against the backslash bypass (`"/\evil.com"`) that some browsers normalize to a protocol-relative `//evil.com` during navigation. Should parse via `new URL(rawCallback, window.location.origin)` and compare `origin` instead of string-prefix checks.
- **`lib/invalid-session.ts:6`:** `isInvalidSessionResponse` special-cases a 404 on the literal path `/users/me` — an implicit contract with no compiler enforcement if that path ever changes. The sign-out fetch in `clearInvalidSessionAndRedirect` (lines 13-25) has no timeout/`AbortController`, so a hanging request delays the forced redirect to `/login` indefinitely.
- **`lib/auth-client.ts:5`:** `baseURL: process.env.NEXT_PUBLIC_BACKEND_URL + "/auth"` silently becomes `"undefined/auth"` if the env var is unset, unlike `lib/constants.ts`'s `backendApiUrl`, which explicitly throws when unconfigured — inconsistent fail-fast behavior between two closely related modules.
- **`providers/auth-provider.tsx`:** `AuthInitializer` sets the user inside a `useEffect`, so `loading` stays `true` until after first paint — see store hydration-flash note below.
- **`lib/clsx.ts`** is a dead, unused re-export of raw `clsx` that competes with `lib/utils.ts`'s `cn()` (clsx + tailwind-merge) — invites a future import that bypasses Tailwind class de-duplication. Recommend deleting it.

### Zustand store (`store/useUserStore.ts`)

- **No persistence / SSR hydration flash:** the store starts as `{ user: null, loading: true, isLoggedIn: false }` on every load and is only populated by `AuthInitializer`'s `useEffect` (post-mount). Any component reading `isLoggedIn` synchronously on first render (e.g. `Navbar.tsx`'s login-button-vs-account-menu ternary) sees the logged-out/loading state first, then flips — a visible flash for already-authenticated users. Consider seeding synchronously via a lazy `useState` initializer instead of an effect.
- **Inconsistent selector granularity:** `Navbar.tsx:20` and `AccountMenu.tsx:41` subscribe to the entire store (`const { user, isLoggedIn, loading, logout } = useUserStore();`), re-rendering on any field change, while `ShareDocumentModal.tsx:185` correctly uses a fine-grained selector. Standardize on selectors everywhere.
- No unit tests exist for this store at all.

### Hooks & utils

- **`hooks/use-debounce.ts`:** clean, correctly guarded, no issues.
- **`hooks/use-local-storage.ts`:** SSR-guarded correctly both ways, but has no cross-tab sync (doesn't listen for the native `storage` event) and no try/catch around the write (`QuotaExceededError` would throw uncaught in a `useEffect`, unlike the deliberate handling of the same failure mode elsewhere in this codebase per the document-workspace-service tests). Also appears to be **dead code** — not imported anywhere else in the app.
- **`utils/fetchApiData.ts:64-65`:** `const errorData = await response.json().catch(() => ({}))` is implicitly `any`, so `errorData.message` is unchecked/untyped. No dedicated unit tests for this function's header-merging or fallback-message logic.
- **`lib/constants.ts`, `lib/feature-flags.ts`, `utils/resume.ts`:** clean, no issues found.

### Types (`types/`)

- **`types/resume.ts:1`** does `import type { DocumentSyncState } from "@/types";` while `types/index.ts:2` does `export * from "@/types/resume";` — a circular type-only import (erased at compile time, so not a runtime bug, but confusing and flagged by some barrel-file lint rules). Should import `DocumentSyncState` directly from `@/types/document`.

### Tests (`tests/contracts/*`, `vitest.config.ts`)

`vitest.config.ts` scopes tests to `tests/contracts/**` with `environment: "node"` — meaning **the hooks, the Zustand store, `auth-client.ts`, providers, and every component in this section have zero automated test coverage**; the contract-test strategy deliberately covers only service/business-logic modules.

- **`auth-redirect.contract.test.ts`:** covers protected-path detection, guest-cookie behavior, redirect-to-login, `getSafeAuthCallback`'s relative/trusted/external/`//` cases, and `isInvalidSessionResponse`. **Missing:** the `isLoginPage && isAuthenticated` redirect-away-from-login branch (the most security-sensitive path in `proxy.ts`) is never exercised; no test for the backslash open-redirect bypass class noted above; no test for non-local `http://` callback rejection.
- **`document-workspace-service.contract.test.ts`:** covers debounced-save isolation, quota-exceeded surfaced not thrown, sync-enabled defaulting. **Missing:** the `flush: true` immediate-write path, update-vs-create/revision semantics, `deleteDocument` actually removing items from a subsequent list, corrupted-JSON recovery.
- **`resume-store.contract.test.ts`:** only tests `removeEducation`/`removeSkillGroup` empty/no-op cases — very thin given the size of `ResumeData` (a dozen+ sub-entities); no coverage of adding/updating fields, reordering, visibility toggles, or `setResume` replace semantics.
- **`resume-sync.contract.test.ts`:** covers enable/disable-all and debounce/flush pass-through. **Missing:** partial-failure semantics across multiple resumes; whether "enable sync" actually triggers a sync attempt vs. flipping a local flag only.
- **`share-links.contract.test.ts`:** covers create/list/fetch/verify (including password failure). **Missing:** `revokeShareLink` is completely uncovered despite being central to `ShareDocumentModal`'s revoke flow; no test for updating an existing link's slug/password.
- **`sync-engine.contract.test.ts`:** covers outbox/telemetry storage isolation only. **Missing:** actual sync push/pull and conflict detection/resolution — the very thing `SyncDetailsModal`'s "conflicted" status depends on — is not tested at all.
- **🔴 `template-render.contract.test.tsx`:** otherwise solid coverage of rendering robustness, but **no test verifies that user-supplied content is HTML-escaped** before `buildCoverLetterHtml` interpolates it into a raw HTML string used for the public share page/export. Given this content can originate from a public share link, this is a plausible **stored/reflected XSS vector** the current suite would not catch if a regression were introduced.

---

## 3. Resume / cover-letter editor & templates

This is the largest and most architecturally significant part of the app (~90 files: 15 section components, the zustand editor store, cover-letter editor, and all web/PDF template renderers). Findings are ordered by value — the duplication analysis of the 15 section components is the single highest-leverage item in this entire audit.

### 🔴 The 15 "list section" editors are ~85% duplicated boilerplate, and the shared abstraction is semantically wrong for several of them

**Inventory:** 8 of 15 section components (`Achievements`, `Awards`, `Certifications`, `Publications`, `Languages`, `Interests`, `Volunteer`, `References`) are already thin wrappers around `GenericCustomSection.tsx`. The other 7 (`Experience`, `Education`, `Projects`, `Skills`, `Links`, `Basics`, `Summary`) hand-duplicate an identical "own `useState(index)`, `&lt;select&gt;` picker, Add/Remove toolbar" skeleton with no shared list-CRUD hook — roughly 250 lines of copy-pasted picker/toolbar code across `EducationSection.tsx:29-78`, `ExperienceSection.tsx:30-79`, `ProjectsSection.tsx:30-79`, `SkillsSection.tsx:30-79`, `LinksSection.tsx:29-74`, differing only in renamed variables. `CustomSection.tsx` (140 lines) separately reimplements ~100 lines of `GenericCustomSection`'s own logic just to add one editable-title input, instead of parameterizing the generic component. **Overall estimate: of ~1,800 lines across the 15 section files, roughly 1,000–1,100 lines is mechanical, extractable duplication.**

**The generic abstraction causes real data-modeling bugs, not just style debt.** `GenericCustomSection`/`ResumeAdditionalItem` forces every "custom" kind into one fixed shape (`name, issuer, date, link, referenceId, description, details`), and several sections repurpose these fields for unrelated meanings:

- `ReferencesSection.tsx:58-71` relabels the field literally named **`date` as "Phone"** (with a phone-number regex mask applied to it) — so the zod schema types a phone number as a generic date-shaped string, and every renderer (`executive-clarity/web.tsx:57-61`, `pdf.tsx:457`) displays a reference's phone number in the exact date-column slot used for a certification's issue date.
- `VolunteerSection.tsx:37-50` repurposes `issuer`→"Role", `referenceId`→"Location"; `ReferencesSection.tsx:43-48` repurposes `referenceId`→"Relationship" — meaning the single field `referenceId` means three different things depending which section you're looking at, with no way to tell from the field name.
- `LanguagesSection.tsx:30-42` repurposes `referenceId` as "Proficiency," while the _separate_ `master-profile-db-schema.ts`'s `languageSchema` (lines 12-16) already has a correctly-typed `fluency: enum(...)` field that the editor never actually writes to (see the dead-schema finding below).
- **Fix:** give each custom kind its own typed shape (the correct types already exist in `master-profile-db-schema.ts`, they're just unused — see below), or at minimum stop remapping real-world concepts like "phone number" onto a field named `date`.

**Compounding UX bug shared by all 8 generic-wrapped sections + the 4 hand-rolled list sections:** `GenericCustomSection.tsx:51,55-56,84` — `selectedIndex` is local state that is never updated when a new item is added, so clicking "Add" a second time appends a blank item to the end of the list but the picker keeps showing whatever was previously selected — no visual feedback that anything happened unless the user manually opens the dropdown. Identical gap in `EducationSection.tsx:66`, `ExperienceSection.tsx:67`, `ProjectsSection.tsx:67`, `SkillsSection.tsx:67`. **Fix:** set the selected index to the new item's position on add.

### 🔴 Drag-and-drop reordering in the content editor is entirely dead code

- `section-types.ts:5-10` defines `SectionDnDHandlers` (`onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`); `DraggableSection.tsx:18-39` destructures only two of the four and never sets `draggable={true}` anywhere — nothing in the subtree is ever actually draggable, so `onDrop` can never meaningfully fire.
- `EditorContentPanel.tsx:72-79` — the only place these props are wired in the real editor — passes **literal no-op functions** for all four handlers to every one of the 15 sections. This confirms the entire prop-threading exercise (interfaces + all 15 section files + `DraggableSection` itself, ~150+ lines) produces zero actual behavior.
- A fully-working, independent drag-and-drop implementation for section reordering already exists in `features/resume/editor/Sidebar.tsx:16-26,38-57` — but `Sidebar.tsx` is never imported anywhere in the app (confirmed via search) and is itself dead code.
- Real section reordering in production only works via the "Position" `<select>` dropdown in `SectionVisibilitySettings.tsx:106-126`, which has its own separate, working HTML5-drag implementation.
- **Fix:** delete the dead DnD interfaces/props from all 15 section files, `DraggableSection`, `GenericCustomSection`, `CustomSection`, and delete the orphaned `Sidebar.tsx` — or wire up real per-section drag handles using the pattern that already works in `SectionVisibilitySettings.tsx`.

### 🟠 WYSIWYG-breaking bug: a field silently disappears from the live preview but reappears in the export

- **Files:** `templates/resume/executive-clarity/web.tsx:25-90` (`renderCustomSection`) vs. `executive-clarity/pdf.tsx:459-466`, `precision-ats/web.tsx:295-301`, `precision-ats/pdf.tsx:406-413`
- **Finding:** the Executive Clarity **web** preview renders `item.name`, `item.date`, `item.issuer`, `item.description`, `item.details` but never `item.link` — every other renderer (its own PDF export, and both web+PDF for Precision ATS) correctly renders `[issuer, link].filter(Boolean).join(" | ")`. Since Executive Clarity is the default template (`default-resume.ts:24`), a user filling in "Verification link" on a Certification or "Email" on a Reference will see it vanish from the live editor preview and then reappear in the downloaded PDF — a genuine, confusing WYSIWYG mismatch affecting 6 of the 8 generic custom-section kinds.
- **Fix:** add the missing `item.link` rendering to `executive-clarity/web.tsx`'s `renderCustomSection`.

### 🟠 Cover letter "Text color" appearance setting is only partially honored

- **Files:** `templates/cover-letter/professional/web.tsx:224,330,67`, `templates/cover-letter/veriworkly/pdf.tsx:64,72,159,161,196`
- **Finding:** the cover letter settings panel exposes a user-facing "Text color" control (`CoverLetterSettingsPanel.tsx:139-143`, `appearance.textColor`), but `professional/web.tsx` hardcodes `text-zinc-950` on the sender name, greeting, and signature regardless of the setting, and `veriworkly/pdf.tsx` hardcodes literal hex colors (`#314158`, `#020618`, `#0f172a`, `#45556c`) on paragraph/greeting/signature/name/sidebar text that never reference `appearance.textColor` at all. A user who picks a custom text color for brand/contrast reasons gets an export that only partially reflects their choice, with no indication which elements will or won't change.

### 🟡 Two incompatible, duplicated resume data schemas — one of them entirely dead

- **Files:** `features/resume/schemas/resume-storage-schema.ts:66-200` vs. `features/resume/schemas/master-profile-db-schema.ts:12-90,154-255`, `features/resume/services/master-profile.ts:46-71`
- **Finding:** `master-profile-db-schema.ts` defines a properly-typed, richer parallel schema for the same domain concepts the flat `ResumeAdditionalItem` model already stores — e.g. `languageSchema {id, language, fluency}`, `awardSchema {id, title, awarder, date, website, description, showLink}`, `referenceSchema {id, name, title, organization, email, phone, relationship}`. But `master-profile.ts:46-71`'s `getDefaultProfile()` **hardcodes these fields to permanently-empty arrays** (`languages: [], awards: [], certificates: [], publications: [], volunteer: [], references: [], achievements: []`) and instead carries all real data through the generic `customSections` field. The ~70 lines of correctly-typed zod schemas for these fields are validated/normalized on every load/save cycle but can never hold real data — dead schema surface adding real maintenance cost for nothing.
- **Fix:** either wire the master-profile save/derive path to actually populate these typed fields from `customSections` (and project back), or delete the unused typed fields and standardize on `customSections` everywhere, consistent with how the main resume schema already works.

### 🟡 `useResume()` whole-store subscription used by the most central, highest-frequency component

- **Files:** `features/resume/hooks/use-resume.ts:5-9`, `features/resume/editor/ResumeEditor.tsx:44,51`
- **Finding:** `useResume()` calls `useResumeStore()` with no selector — subscribing to every state change — and its own code comment admits this ("Prefer narrow selectors in new high-frequency components"). `ResumeEditor.tsx` is exactly a high-frequency consumer (it's always mounted, and `resume` gets a new object identity on every keystroke via `withTimestamp`), so the whole editor + preview tree re-renders on every field edit anywhere in the form. `EditorSettingsPanel.tsx:59-67` already demonstrates the correct narrow-selector pattern elsewhere in the same codebase.
- **Compounding:** `ResumeEditor.tsx:51`'s `useDeferredValue(resume)` defers the _entire_ resume object as one unit rather than field-level, so React keeps scheduling low-priority re-renders of the whole template tree while typing, with no `React.memo` on the template components (`executive-clarity/web.tsx`, `precision-ats/web.tsx`) to stop it.
- **Compounding further:** `ResumePagedPreview.tsx:62-203` re-measures pagination via off-screen DOM cloning on every `children` change, with an O(n²) fitting loop (lines 151-164) over item counts within a section, no debouncing, and no caching between renders — a resume with a long Experience section will re-run this on every keystroke anywhere in the document.
- **Fix:** replace `useResume()` in `ResumeEditor.tsx` with narrow per-field selectors; debounce the pagination-measurement effect (150-250ms) and memoize per-section fitted-item counts.

### 🟡 Cover-letter JSON import bypasses schema validation (crash vector)

- **File:** `features/cover-letter/editor/CoverLetterEditor.tsx:88-120`
- **Finding:** `importJson` does only a loose `typeof parsed === "object" && "content" in parsed` check, then merges `imported.content` directly into the live document — it never calls the existing `parseCoverLetterDocument` (`schema.ts:69-138`, which already does proper type coercion, e.g. `asNumber(appearanceRaw.pageMargin, 44)`). A malformed import (e.g. `appearance.pageMargin` as a string) flows straight into `professional/pdf.tsx:275`'s `padding: appearance.pageMargin * PX_TO_PT`, producing `NaN` passed to react-pdf's layout engine — a plausible export-crash vector that the unused validation function would have prevented. Contrast with `resume-service.ts:212-214`'s JSON import, which correctly routes through zod-based `parseResumeDataInput`.
- **Fix:** route cover-letter JSON import through `parseCoverLetterDocument` before merging.

### Duplication & consolidation opportunities (templates)

- The section filter/sort expression `.filter(s => s.id !== "basics" && s.id !== "links" && s.visible !== false).sort(...)` is duplicated verbatim 4 times: `executive-clarity/web.tsx:110-112`, `executive-clarity/pdf.tsx:269-271`, `precision-ats/web.tsx:72-74`, `precision-ats/pdf.tsx:216-218`.
- Both PDF templates build ~85% structurally identical `StyleSheet.create({...})` objects (same keys, different magic-number sizes) with no shared "base PDF stylesheet" generator.
- `PAGE_HEIGHT = 1123` is duplicated across `professional/web.tsx:29`, `veriworkly/web.tsx:30`, and inline at two more call sites — and doesn't even match `resume-layout.ts:2`'s `RESUME_PAGE_HEIGHT_PX = 1122` for what's nominally the same A4-at-96dpi page height (unexplained off-by-one between resume and cover-letter constants).
- `Field`/`TextField` are defined independently and incompatibly in both `cover-letter/editor/components/CoverLetterFields.tsx` (value/onChange-based) and `resume/editor/content/EditorFormPrimitives.tsx` (children-based) — same names, different contracts, no shared form-primitives package between the two feature folders despite needing the same label+input+error scaffold.

### Accessibility (resume/cover-letter editor)

- `SectionAccordion.tsx:24-38`: the disclosure toggle button has no `aria-expanded`/`aria-controls`, and the content panel has no `id`/`role="region"` — used by all 15+ section accordions, and duplicated again in `EditorSettingsPanel.tsx`'s local `SettingsSectionAccordion` (lines 23-51).
- Icon-only link display mode (`linkDisplayMode === "icon"`, `LinksSection.tsx:76-88`, `CoverLetterContentPanel.tsx:110-118`) renders social icons with `aria-hidden="true"` and no `sr-only` fallback text — in icon-only mode, the icon is the _only_ content of the link, so a screen-reader user gets no accessible name for it at all. The PDF equivalent (`templates/pdf/SocialIcon.tsx`) has no accessibility concept at all for this mode.
- No section/list component moves focus to a newly-added item's first field, nor restores focus sensibly after removal.

### UX: destructive actions are inconsistently protected

- Removing a single Experience/Education/Project/Skill-group/Link/Custom-item fires immediately with **no confirmation and no undo** (e.g. `ExperienceSection.tsx:71-78`), even though whole-document deletion _does_ get a confirmation (`DestructiveModal` in `ResumeEditorModals.tsx:75-82` for resumes, a `window.confirm()` in `CoverLetterEditor.tsx:145-146` for cover letters). The app has an established "confirm before destroy" convention for document-level deletes that simply isn't applied to item-level removal, despite the aggregate loss often being larger (many resumes will have far more experience entries edited than whole documents deleted).
- "Reset to defaults" / "Empty all fields" (`ResumeToolbar.tsx:178-185`, `CoverLetterToolbar.tsx:167-176`) wipe the entire document with **zero confirmation step** in either editor.
- Resume delete uses a themed `DestructiveModal`; cover-letter delete uses a bare native `window.confirm()` — visibly inconsistent UI treatment for the same conceptual action across the app's two document types.
- No undo/redo stack exists anywhere (`resume-store.ts` has no history array or `undo()`/`redo()` action) — the only recovery after an accidental destructive edit is manual re-entry.

### Other notable findings

- **Phone validation is US-only:** `resume-validation-rules.ts:10-12` hard-requires exactly 10 digits (`BasicsSection.tsx:64-73` strips non-digits and truncates to 10), which structurally cannot represent international phone numbers — a real functional limitation for a resume builder used internationally. (Also inconsistent with the cover-letter defaults using a `+1 (555)...` placeholder the resume-side validator would itself reject.)
- **Dead code confirmed via search:** `features/resume/editor/Sidebar.tsx`, `features/resume/editor/settings/AdvancedThemeSettings.tsx` (fully duplicated inline inside `EditorSettingsPanel.tsx` instead), and `features/resume/utils/factories.ts:75-85`'s `createCustomSection()` (unreachable — there's no UI affordance to add a new named custom section at all) are never imported anywhere in the app.
- **Uncontrolled-input staleness:** `DelimitedTextArea` (`EditorFormPrimitives.tsx:110-132`) seeds local `draftValue` once from `value` and never re-syncs — Skills/Highlights fields can silently show stale text after a Reset/Import/AI-apply changes the underlying array without remounting the component.
- Inline validation (`validation.ts`) is display-only decoration — nothing in `ResumeToolbar.tsx`/`useToolbarDownloads.ts` gates PDF/DOCX/HTML export on validation passing, so a resume with an empty name or malformed dates exports without warning.

---

## 4. Documents feature � core engine, export pipeline, sync & storage

This is the most architecturally significant section � the document-lifecycle and data-integrity backbone. Key findings: a real data-loss race condition in sync, two independent unsynchronized writers to the same localStorage keys, non-exhaustive export dispatcher that silently produces garbage for new document types, and placeholder text bleeding into real exports.

### ?? CRITICAL: Stale-snapshot overwrite in sync causes silent data loss

**File:** `features/documents/services/document-sync-service.ts:213-260` (`syncNow` method)

**How it fails:**

1. User types ? autosave persists content v1 to localStorage.
2. Sync worker reads v1 into `item` variable, then calls `DocumentApi.update(...)` (network round trip, takes 100ms�several seconds).
3. **While the network call is in flight**, user keeps typing ? autosave debounce fires again ? persists content **v2** to the same localStorage key.
4. Network request resolves; sync code calls `this.config.localStorage.persist(updated)`, where `updated = {...item /* = v1 */, sync: {...synced...}}`.
5. `LocalStorageService.persist()` does see the v2 content as `existing`, detects a payload change, but then **overwrites the entire record back down to v1**, because the to-be-persisted value is built from the stale in-memory `item` snapshot, not by patching only the `sync` field onto the current storage value.
6. **Result:** user's v2 edits silently disappear, reverted to v1 content, with no error/conflict flag/warning.

**Fix:** never persist a stale full-item snapshot after an `await`. Either re-read from storage immediately before the final write and merge only the `sync` field, or add a dedicated `patchSync(id, syncPatch)` method that does targeted field-only updates.

### ?? No single source of truth for document storage � two independent writers + duplicated keys

**Files:** `features/documents/services/document-workspace-service.ts` (editor autosave), `features/documents/services/document-sync.ts` (sync worker), `features/documents/services/document-library.ts` (collection loader)

**Finding:** Three modules independently compute and target the identical `veriworkly:docs:v2:*` localStorage keys, each with their own `LocalStorageService` instance. Both autosave and sync target the same keys with zero coordination. Nothing enforces safe interleaving. **Multi-tab consequence:** each tab independently reads the entire collection blob, mutates it, writes it back. Whichever write lands second _silently discards_ the first tab's edits to _any other document_ in that collection.

**Fix:** consolidate to one storage engine instance per document type, shared by both autosave and sync. Extract the key scheme into a single constant. Add a `BroadcastChannel` or `storage` event listener for true multi-tab safety.

### ?? Export dispatcher is not type-driven � adding a new DocumentType silently produces garbage

**Files:** `features/documents/export/export-dispatcher.tsx:34-98`, `features/documents/export/docx/document-docx.ts:92-112`

**Finding:** After the `RESUME` early return, every remaining export branch unconditionally assumes the document is a cover letter. A hypothetical third document type would render as a cover-letter PDF or call `buildCoverLetterHtml` with no compiler error.

**Fix:** make the dispatcher exhaustive via a `switch` with a `never` default case, or move format handlers into `DocumentDefinition` itself.

### ?? Placeholder text is leaking into real exports

**File:** `features/documents/utils/formatters.ts:7-16` and replicated in all export files

**Pattern:** `formatDateRange(startDate, endDate, current)` does `safeText(startDate) || "Start"` � a fallback meant for the _editor_ empty state. When a user leaves both dates blank on a WIP entry, the exported PDF/DOCX/HTML/Markdown literally print `"Start - End"`, `"Role"`, `"Company"`, `"Degree"`, etc. as actual content.

This is a severe correctness bug for a resume builder.

**Fix:** Give exporters an export-specific formatting mode that omits the field/line entirely instead of substituting a fake label.

### ?? Import preserves identity/sync metadata � risk of cloud document collision

**File:** `features/documents/core/registry.tsx:45-76` (`parseResumeDocument`)

**Finding:** Used for both storage rehydration and JSON import, it happily re-uses whatever `id`/`sync` block are in the imported JSON. A re-imported document gets back the same `id`/`cloudDocumentId`/`revision`, risking overwrites of the original cloud document if autosynced.

**Fix:** Add a `sanitizeForImport()` step that assigns a fresh `id` and resets `sync` to defaults.

### ?? Unguarded JSON.parse calls can permanently break the sync worker

**Files:** `features/documents/services/sync-engine.ts:33-50`, `features/documents/services/document-sync-service.ts:431-436`

**Finding:** Both do `JSON.parse(raw)` with no try/catch. If localStorage is corrupted, it throws synchronously, permanently stopping the sync worker with zero error visibility.

**Fix:** Apply defensive try/catch + self-heal pattern used in `loadCollection()`.

### ?? Multiple correctness/security gaps in the export pipeline

- No try/catch anywhere in export generation � unhandled rejections, no UI feedback.
- Link `href` values in HTML/Markdown not scheme-validated � `javascript:alert(...)` passes through (self-XSS).
- `export-text.ts` regex-strips Markdown-like characters � `"# 1 in sales"` becomes `"1 in sales"`.
- DOCX newlines lost via `new TextRun(text)` (no `\n` ? line-break handling).
- Non-Latin filenames stripped to generic `resume.pdf` (i18n + collision risk).

### ?? Font weight mismatch between web and PDF

**File:** `features/documents/constants/fonts.ts:29,42,55` (web) vs. `31-34,44-47,57-59` (PDF)

**Finding:** Web stylesheets load 6 weights (300, 400, 500, 600, 700, 800) but PDF only registers 400 and 700 � WYSIWYG mismatch.

**Fix:** Constrain UI weights to {400, 700} or add missing `.ttf` files.

---

## 5. Auth, billing, affiliate/ambassador, API keys, profile, admin

### ?? Hardcoded personal email as fallback + client-only enforcement of payment lockdown

**File:** `features/billing/BillingPage.tsx:53-58, 85-105`

**Finding:** Real email `"ashragautam25@gmail.com"` hardcoded in public bundle. `paymentsBlocked` flag only disables UI button; handler functions never re-check before calling backend endpoints. Any user can bypass the button and call `/billing/portal` / `/billing/credits/checkout` directly.

**Fix:** Remove hardcoded fallback. Enforce lockdown authoritatively server-side.

### ?? Username edit modal: unverified username can slip through (HIGH � real bug)

**Files:** `features/profile/components/EditProfileUsernameModal.tsx` vs. `SetUsernameModal.tsx`

**Finding:** `EditProfileUsernameModal` in a real `<form>` only blocks `isAvailable === false`, not `null` (pending debounce). Pressing Enter before debounce resolves submits unverified username.

**Fix:** Change guard to `if (isAvailable !== true) return;`.

### ?? Master profile phone validation blocks saves when phone is blank

**File:** `features/profile/components/master/master-utils.ts:112-252`, line 119

**Finding:** No leading truthiness guard � `isTenDigitPhone("")` is `false`, so leaving phone blank rejects every save with "Basics phone must have exactly 10 digits" with no indication phone is mandatory.

**Fix:** Guard the check or mark phone as explicitly required in UI.

### ?? Only first validation issue surfaced (poor UX)

**Files:** `features/profile/components/master/master-utils.ts:112-252`, `ProfileMaster.tsx:73-80`

**Finding:** UI only displays `validation.issues[0]` even with multiple problems. User must fix one, save, see next, repeat.

**Fix:** Surface all collected issues in a list.

### ?? Affiliate / Ambassador validation gaps

- **`AffiliatePayoutForm.tsx`**: no form element / no client validation on amount (HTML5 min/max decorative). Button never disabled. Input never labeled.
- **`CopyReferralLinkButton.tsx`**: no try/catch on clipboard write (throws silently on non-HTTPS). Inconsistent with every other clipboard call in app.
- **`AmbassadorApplyForm.tsx`**: year accepts any string (e.g. "abc" passes).
- **`AffiliatePage.tsx`**: never distinguishes PENDING/SUSPENDED states (inconsistent with AmbassadorPage).

### ?? No defense-in-depth for admin access � backend is sole gatekeeper

**File:** `features/admin/services/admin-server.ts:84-149`

**Finding:** No role check in-app at all. Entire authorization relies on backend 401/403.

**Fix:** Add explicit `assertAdminSession()` helper.

### ?? Duplicated server-fetch helpers with divergent error semantics

**Files:** `admin-server.ts:63-96`, `roadmap-backend.ts:101-135`, `utils/fetchApiData.ts:20-73`

**Finding:** Three independent "forward cookies + parse JSON" implementations with different error types and redirect behavior. Roadmap loses auto-logout on 401.

**Fix:** Consolidate into one shared server-side helper.

### ?? Quota-exceeded errors never surfaced to user

**File:** `services/storage/safe-local-storage.ts` correctly detects, but call sites discard result

**Finding:** Most consumers call `saveDocument()` without checking return value. User's edits silently fail on quota with no error message.

**Fix:** Surface quota errors as toasts; proactively warn before writes fail.

### Other findings

- Billing checkout: no reconciliation after success (no polling).
- Stripe error detection via brittle string-matching.
- API keys: duplicate rotate/revoke/delete logic across two files.
- API keys: reset pagination to page 1 on every action.
- Profile master: type safety disabled on core mutation functions.
- AI assist: permanent disable on fetch failure, no retry.
- ATS: advertised 5 MB limit not enforced client-side.

---

## Summary & Action Items

**Critical fixes (data integrity / security):**

1. Fix sync data-loss race condition � `document-sync-service.ts`
2. Consolidate document storage � eliminate duplicate writers
3. Remove hardcoded email + enforce billing lockdown server-side
4. Make export dispatcher exhaustive
5. Fix username edit modal's unverified submit guard

**High-leverage refactors (code quality):**

1. Eliminate ~1,000 lines of duplication in resume/cover-letter section editors
2. Delete dead drag-and-drop code
3. Stop placeholder text from leaking into exports
4. Consolidate server-fetch helpers
5. Add defense-in-depth role checks

**Deferred improvements (best-effort):**

1. Fix emoji stripping Unicode ranges
2. Add try/catch to export generation
3. Validate link URL schemes
4. Fix font weight mismatches
5. Audit magic numbers

---

**Audit complete.** Every file in `apps/studio` was read in full. Issues span security (hardcoded secrets, unvalidated URLs, client-side authorization), correctness (data loss, WYSIWYG mismatches, placeholder leaks), performance (O(n�) pagination, whole-store subscriptions, duplicate font loads), accessibility, and code quality (1,000+ lines of duplication, dead code, inconsistent patterns).
