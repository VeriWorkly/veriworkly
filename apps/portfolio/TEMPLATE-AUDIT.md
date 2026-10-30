# Portfolio Template Library — Audit

**Date:** 2026-08-03
**Scope:** all four templates in the `portfolio-templates` submodule (`apps/portfolio/template-library/`), plus the registry/catalog/runtime layer that mounts them and the app-level CSS and font tokens they inherit.

**Status: all 11 findings fixed** (2026-08-04). Each section below keeps its original problem statement for the record and carries a **Resolution** note describing what was actually changed. See the [resolution log](#resolution-log) at the end for the aggregate result and the two places where the original report overstated a problem.

**Verification after fixes:** `npx tsc --noEmit` (clean) · `npx eslint .` (0 errors, 3 pre-existing warnings) · `npx vitest run` (**63/63 passing**, up from 30) · `npx next build` (exit 0). CSS chunk sizes were re-measured from a clean rebuild.

**Note on repository layout:** `template-library/` is a git submodule pointing at `github.com/VeriWorkly/portfolio-templates`. The template changes need their own commit in that repo plus a submodule pointer bump here. The changes in _this_ repo are: `app/globals.css`, `app/api/template/{nimbus,cipher}/og/route.tsx`, `tests/template-library.test.tsx`, `tests/stubs/next-font-google.ts`, and `vitest.config.ts`. They were committed in 0df521ad (2026-08-05).

**Later (2026-10-30):** the submodule was then pinned to a commit that replaced all four templates with mocks (8e01127). #353 restored the real templates with these fixes and more (VeriWorkly/portfolio-templates#1, pinned at 784fa53), and `next.config.ts` now fails a production build on the mock unless `CI` is set. File paths under `app/` predate #355: `app/layout.tsx` is now `app/(platform)/layout.tsx`, and `app/portfolios/...` is now `app/(published)/portfolios/...`. Line numbers below are from 2026-08-03.

Severity: **HIGH** (trust, correctness, or measurable performance cost on the most-served page) · **MEDIUM** (real bug or notable UX/a11y gap) · **LOW** (polish, consistency, minor optimization).

---

## Inventory

Registered in [`template-library/registry.ts`](template-library/registry.ts), surfaced through [`templates/catalog/templates.ts`](templates/catalog/templates.ts), mounted server-side by [`templates/runtime/registry.tsx`](templates/runtime/registry.tsx).

| id        | Name    | Tier    | Aesthetic                                                                       | TSX lines | CSS lines | Built CSS                    |
| --------- | ------- | ------- | ------------------------------------------------------------------------------- | --------- | --------- | ---------------------------- |
| `signal`  | Signal  | Free    | Mint-emerald tech-editorial; GSAP stacking project cards; dual dark/light theme | 1999      | 2526      | **147.9 KB** (750 selectors) |
| `atelier` | Atelier | Free    | Warm sand print/editorial; flat card geometry; drifting orbit spheres           | 1398      | 1406      | 27.3 KB (549 selectors)      |
| `nimbus`  | Nimbus  | Premium | Brutalist broadsheet; amber accent; cursor-follow ring, text scramble, marquee  | 1741      | 2244      | 36.8 KB (575 selectors)      |
| `cipher`  | Cipher  | Premium | CRT terminal emulator; cold-boot sequence; command line; matrix rain            | 1862      | 775       | 14.5 KB (247 selectors)      |

Signal is the default and the most complete — it renders 17 section types against Atelier's and Nimbus's smaller sets. It is also where the majority of the findings sit, which matters disproportionately because it is the free tier and therefore the most-served template in the product.

Shared contract lives in [`template-library/types.ts`](template-library/types.ts): `PortfolioProject`, the `itemText`/`itemTags`/`itemAssetUrl` accessors, and the `safeExternalUrl` sanitizer. All four templates consume it correctly; no XSS vectors were found (no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`).

---

## 1. HIGH ✅ FIXED — Signal fabricates credentials onto published portfolios

**Files:** `template-library/signal/SignalTemplate.tsx`

Roughly twenty `itemText(item, key, fallback)` calls in Signal supply _real-sounding institutional names_ as their fallback. When a portfolio owner leaves a field blank, the published page asserts a credential they never entered:

| Line | Code                                               | Rendered when field is blank |
| ---- | -------------------------------------------------- | ---------------------------- |
| 880  | `itemText(item, "school", "Stanford University")`  | "Stanford University"        |
| 881  | `itemText(item, "degree", "Master of Science")`    | "Master of Science"          |
| 882  | `itemText(item, "field", "Computer Science")`      | "Computer Science"           |
| 687  | `itemText(item, "company", "Synthetix Labs")`      | "Synthetix Labs"             |
| 686  | `itemText(item, "role", "Staff Systems Engineer")` | "Staff Systems Engineer"     |
| 929  | `itemText(item, "issuer", "SIGGRAPH Academy")`     | certification issuer         |
| 1128 | `itemText(item, "issuer", "SIGGRAPH Journal")`     | publication venue            |
| 1200 | `itemText(item, "issuer", "US Patent Office")`     | patent authority             |
| 1270 | `itemText(item, "issuer", "Google")`               | test-score issuer            |
| 1269 | `itemText(item, "score", … "100/100")`             | a perfect score              |
| 1365 | `itemText(item, "issuer", "Synthetix Corp")`       | achievement issuer           |
| 1424 | `itemText(item, "issuer", "Code For All")`         | volunteer org                |
| 1480 | `itemText(item, "issuer", "Type League")`          | award issuer                 |
| 1609 | `itemTitle(item, "CTO")`                           | testimonial author           |

Also date fallbacks that invent a year outright: `itemText(item, "year", "2026")` (591), `itemText(item, "date", "2025")` (1129, 1201, 1366, 1481), `"Class of 2022"` (879), `"June 2026"` (1540).

This is a trust problem, not a cosmetic one. A live portfolio claiming a Stanford MS, a US patent, and a perfect Google-issued score is a misrepresentation the owner never made and may not notice.

**Nimbus and Atelier already do this correctly** — they fall back to `""` and let the field collapse (`itemText(item, "name", itemTitle(item, ""))` throughout `NimbusTemplate.tsx` and `AtelierTemplate.tsx`). Signal is the outlier.

**Recommended fix:** replace every institutional and date fallback in Signal with `""`, and guard the surrounding markup so an empty value renders nothing rather than an empty badge — the pattern Nimbus already uses. Generic structural fallbacks (`"Project"`, `"Certification Title"`) are fine to keep; the ones naming a real institution, issuer, score, or date are not.

---

## 2. HIGH ✅ FIXED — Signal ships ~120 KB of duplicated CSS on every portfolio page

**Files:** `template-library/signal/styles.css:2`, `app/globals.css:1`

[`signal/styles.css:2`](template-library/signal/styles.css#L2) declares `@import "tailwindcss"`, but [`app/globals.css:1`](app/globals.css#L1) already imports it for the whole app. Because `signal/styles.css` is imported from a `"use client"` component, Next emits it as its own CSS chunk — carrying a **second full copy** of Tailwind's preflight and utility layer.

Measured from `.next/static/chunks/` after `next build`:

```
1vwkvm993-ih3.css   147.9 KB   750 signal- selectors   (+ full Tailwind preflight)
1-diapgfl0jlb.css   146.8 KB   app global chunk        (+ full Tailwind preflight)
2n1prrtu1_zwq.css    36.8 KB   575 nimbus- selectors
1myne8t4lmnl7.css    27.3 KB   549 atelier- selectors
02v11oy98hcrx.css    14.5 KB   247 cipher- selectors
```

Signal has a selector count in the same range as Nimbus and Atelier but is **4–5× their file size**. The `-webkit-text-size-adjust` preflight marker is present in both the Signal chunk and the app global chunk, confirming the duplication. A visitor loading a Signal portfolio downloads roughly **295 KB of CSS**, about 120 KB of it redundant.

**Recommended fix:** delete line 2 of `signal/styles.css`. The template's own rules are plain CSS plus Tailwind utility classes used in the TSX, which the app-level Tailwind build already covers via `@source` scanning. Verify after removal that the utility classes Signal uses inline (e.g. `signal-project-card-image` sibling utilities) are still emitted — if `@source` in `globals.css` does not currently reach into `template-library/`, add that path rather than restoring the import.

---

## 3. HIGH ✅ FIXED — Atelier renders in the wrong typeface

**Files:** `template-library/atelier/styles.css`, `app/tokens.css:31`

`atelier/styles.css` sets `font-family: var(--font-display)` and `var(--font-mono)` throughout (lines 43, 101, 163, 231, 281, 292, 317, 344, …) but **never defines either variable**. Unlike Signal, Nimbus, and Cipher, Atelier declares no `@font-face` and loads no webfont.

Both names resolve instead to the app-level tokens in [`app/tokens.css:31-32`](app/tokens.css#L31-L32):

```css
--font-display: var(--font-outfit), "Geist", "Inter", Arial, Helvetica, sans-serif;
--font-mono: "Geist Mono", "SFMono-Regular", Consolas, monospace;
```

So Atelier renders in **Outfit — a geometric sans** — on both the published route and the `/templates/atelier` preview.

Atelier's stated identity, in its own [`design.ts`](template-library/atelier/design.ts) and `design.md` (which are rendered verbatim to prospective users on the template detail page), is:

> "Italic Serif Type Contrast: Employs elegant serif display italic headlines (featuring tight, negative letter-spacing) paired with clean, lightweight sans-serif body copy."

None of that renders. The template is currently advertising a design it does not produce, and it is the only one of the four whose visual identity is broken rather than merely inconsistent.

**Recommended fix:** define `--atelier-display` / `--atelier-mono` scoped to `.atelier-site` with a real serif stack, and switch the template's rules to the scoped names so it can never silently inherit an unrelated app token again. Load the serif alongside the font-loading change in §4. Nimbus scopes its tokens correctly (`.nimbus-site { --nimbus-paper: … }`) — mirror that.

---

## 4. HIGH ✅ FIXED — Google Fonts loaded via render-blocking CSS `@import`

**Files:** `template-library/signal/styles.css:1`, `template-library/nimbus/style.css:6`, `template-library/cipher/style.css:1`

```css
/* signal */
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Space+Mono:…");
/* nimbus */
@import url("https://fonts.googleapis.com/css2?family=Fraunces:…&family=DM+Mono:…");
/* cipher */
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:…");
```

A CSS `@import` of a remote stylesheet is discovered only _after_ the importing stylesheet has been downloaded and parsed, producing a serial chain before text can paint in the right face:

```
HTML → template CSS chunk → fonts.googleapis.com/css2 → font files
```

Three round trips, all render-blocking, on every published portfolio page. This is a direct LCP and FCP cost on the product's primary output.

Two aggravating factors:

- **Signal downloads Outfit twice.** [`app/layout.tsx:13`](app/layout.tsx#L13) already loads Outfit through `next/font/google`, which self-hosts it and preloads it. The Google CDN copy in `signal/styles.css:1` is redundant on top of being slow.
- **Third-party request on every visitor page load.** Every visitor to a customer's portfolio hits `fonts.googleapis.com`, exposing their IP to Google. For a hosted portfolio product with EU users this is a live GDPR consideration, not a hypothetical one.

**Recommended fix:** move all four templates' fonts to `next/font/google` with CSS variables, mirroring the existing Outfit setup — self-hosted, preloaded, no third-party request, no chained fetch. Expose each as a scoped token (`--signal-display`, `--nimbus-display`, …) so the templates stay self-contained. This also resolves §3, since Atelier needs a real font declared anyway.

---

## 5. MEDIUM ✅ FIXED — Signal's "Explore work" hero CTA is a dead link

**File:** `template-library/signal/SignalTemplate.tsx:415`

```tsx
<a className="signal-btn-secondary" href="#work">
```

No element anywhere in the template has `id="work"`. Sections render `id={section.id}` — a UUID from the stored document. The only two real anchor targets are `id="top"` (389) and `id="contact"` (1662).

One of the hero's two calls-to-action scrolls nowhere. It also renders unconditionally, including on portfolios that have no projects section at all.

**Recommended fix:** give the projects section a stable secondary anchor (`<section id={section.id} …>` plus a `<span id="work" />` target, or resolve the projects section id in the parent and interpolate it into the `href`), and hide the CTA when no visible projects section exists.

---

## 6. MEDIUM ✅ FIXED — Signal's hardcoded copy contradicts its own marketing

**Files:** `template-library/signal/SignalTemplate.tsx` (16 `note=` strings), `template-library/signal/design.ts:26`

Every section description in Signal is hardcoded and written exclusively for a graphics/systems engineer:

| Line | Section        | Copy                                                                  |
| ---- | -------------- | --------------------------------------------------------------------- |
| 583  | Projects       | "digital systems, graphics engines, and production interfaces"        |
| 794  | Skills         | "Programming languages, rendering engines, compiler workflows…"       |
| 923  | Certifications | "specialized technical licenses, and advanced system training"        |
| 1122 | Publications   | "academic journals, and engineering contributions"                    |
| 1194 | Patents        | "US Patent registry entries and documented UI engineering frameworks" |
| 1602 | Testimonials   | "Endorsements from directors, core CTOs, and peer engineers"          |

Plus placeholder titles in the same register: `itemTitle(item, "WebGL Engine Architecture")` (748), `itemTitle(item, "Algorithmic Typography Shaders")` (1127), `itemTitle(item, "Layout Stacking System Patent")` (1199). The experience section hardcodes a headline card reading "Iterating on visual, tactile interfaces and reliable compiler-optimized systems" (669), and the footer hardcodes "Subscribe to Technical Logs / updates on creative engineering and WebGL development" (1944–1946).

Meanwhile [`signal/design.ts:26`](template-library/signal/design.ts#L26) markets the template to:

> Medical professionals & doctors · Lawyers & legal advisors · Writers & journalists · Consultants & strategists

A physician who picks Signal gets a certifications section captioned "specialized technical licenses, and advanced system training."

**Decision (2026-08-03): narrow the marketing rather than rewrite the copy.** Correct `design.ts` `bestFor` and `system.targetProfessions` to reflect who Signal actually serves — engineers, technical founders, systems architects, researchers — and drop the medical, legal, and journalism claims. Signal's visual language (monospace metadata, "Direct Dispatch", terminal-adjacent framing) is genuinely engineer-shaped; making the copy profession-neutral would dilute what makes it good without making it right for a physician. If a non-technical audience is wanted later, it should be a separate template rather than a neutered Signal.

This leaves an open product gap: **the library currently has no template aimed at non-technical professionals.** Three of four are developer-facing and Atelier is design-facing. Worth considering as a future addition.

---

## 7. MEDIUM ✅ FIXED — Zero-padded index breaks past nine items

**Files:** `signal/SignalTemplate.tsx:613, 757, 1090, 1148, 1560`; `atelier/AtelierTemplate.tsx:636, 811, 858`

```tsx
<span className="signal-project-card-num">0{index + 1}</span>
```

The `0` is a literal prefix, so the tenth item renders `010`, the eleventh `011`. Affects Signal's project cards, service cards, interest cards, publication badges (`[010] PUBLISHED`), and writing rows, plus three sites in Atelier.

**Recommended fix:** `String(index + 1).padStart(2, "0")`.

---

## 8. MEDIUM ✅ FIXED — Cipher is unusable on touch devices

**File:** `template-library/cipher/CipherTemplate.tsx`

Zero `touchstart`, `touchmove`, `pointerdown`, or `pointermove` handlers in the entire template. Window dragging is bound to `mousemove` / `mouseup` only (`CipherTemplate.tsx:586-587`), so the draggable terminal window — the template's headline interaction, called out first in its own `design.md` feature list — does nothing on a phone or tablet.

Nimbus handles this properly at [`NimbusTemplate.tsx:412`](template-library/nimbus/NimbusTemplate.tsx#L412):

```tsx
const isTouch = window.matchMedia("(pointer: coarse)").matches;
if (isTouch) { document.body.classList.add("has-touch"); … }
```

Cipher has no equivalent. It also runs a `requestAnimationFrame` matrix-rain canvas loop (523–548) with no coarse-pointer or reduced-motion gate, which is a battery cost on mobile.

Cipher is a **premium** template, so this is a paid feature that silently doesn't work for mobile visitors.

**Recommended fix:** add pointer events (`pointerdown`/`pointermove`/`pointerup` replace both mouse and touch paths cleanly), and gate the matrix-rain RAF loop behind `(pointer: fine)` or pause it via an `IntersectionObserver` when off-screen.

---

## 9. MEDIUM ✅ FIXED — Signal's scroll-hidden nav stays keyboard-focusable

**File:** `template-library/signal/SignalTemplate.tsx:176-194`

On scroll-down the nav animates to `y: -120, opacity: 0` — but nothing sets `visibility: hidden`, `inert`, or `pointer-events: none`. The links remain in the tab order, so a keyboard user tabbing forward lands on an invisible off-screen element with no visible focus indicator, and the page appears to stop responding to Tab.

**Recommended fix:** add `inert` to the nav container while hidden (or `visibility: hidden` at the end of the hide tween), and reveal it on `focusin` so keyboard users can still reach it.

---

## 10. MEDIUM ✅ FIXED — Both premium templates have zero test coverage

**File:** `tests/portfolio-contract.test.tsx:4-5`

```ts
import AtelierTemplate from "@/template-library/atelier/AtelierTemplate";
import SignalTemplate from "@/template-library/signal/SignalTemplate";
```

The contract suite renders Signal and Atelier only — asserting section ordering, `data-section` presence, and malformed-input resilience. **Nimbus and Cipher, the two paid templates, are never rendered by any test.** Neither the section-ordering contract nor the malformed-data guards are verified for them, despite Cipher being the most stateful template in the library (boot sequence, command parser, drag state, timers).

**Recommended fix:** extend the existing parametrised contract tests to cover all four registry entries rather than a hardcoded pair — ideally driven off `templatesRegistry` so a fifth template is covered automatically.

---

## 11. LOW ✅ FIXED — Assorted

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                              | Location                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 11.1 | **"Local Time" shows the visitor's clock, not the owner's.** The hero Profile Summary card lists Location and directly beneath it Local Time, fed by `new Date().toLocaleTimeString()` in the visitor's own timezone. Reads as the owner's local time; is not. Either derive a timezone from `identity.location` or relabel it "Your time".                                                                                          | `signal/SignalTemplate.tsx:99-112, 437-442`      |
| 11.2 | **Duplicate React keys on tag lists.** `key={tag}` and `key={kw}` use the tag string itself; a portfolio listing the same skill twice produces colliding keys and a reconciliation warning.                                                                                                                                                                                                                                          | `signal/SignalTemplate.tsx:629, 807`             |
| 11.3 | **Unbounded localStorage growth.** `signal_messages` and `signal_subscribers` are read, pushed to, and rewritten with no cap. A visitor who submits repeatedly grows the array without limit. Cap at ~50 entries or drop the log entirely — it is explicitly not the delivery mechanism. **Later (#353):** the log and the newsletter are gone; Signal writes no visitor data to `localStorage`.                                     | `signal/SignalTemplate.tsx:1741-1744, 1898-1901` |
| 11.4 | **Unscoped `document.querySelector`.** The nav-hide effect queries `.signal-nav-container` globally rather than through `containerRef`, unlike every other selector in the same `useGSAP` scope. Breaks if two Signal instances mount (editor preview beside a live render).                                                                                                                                                         | `signal/SignalTemplate.tsx:174`                  |
| 11.5 | **OG image routes exist for two of four templates.** `app/api/template/signal/og/` and `app/api/template/atelier/og/` have routes; `nimbus` and `cipher` do not — so the two premium templates have no template-specific social card.                                                                                                                                                                                                | `app/api/template/`                              |
| 11.6 | **No skip-to-content link in any template.** Signal in particular puts a floating nav, a theme widget, and a full hero ahead of the first section, with no bypass for keyboard and screen-reader users (WCAG 2.4.1).                                                                                                                                                                                                                 | all four                                         |
| 11.7 | **Reduced-motion block is a blunt instrument.** `.signal-site * { transform: none !important; filter: none !important; }` disables _all_ transforms under `prefers-reduced-motion`, including any that are layout-critical (centering translates, etc.) rather than decorative. Currently harmless, but it will silently break the first layout transform anyone adds. Scope it to the animated classes already listed alongside it. | `signal/styles.css:2512-2526`                    |

---

## Resolution log

All 11 findings were fixed on 2026-08-04. What changed, and what it produced:

### Measured result — CSS

Clean `next build`, before → after:

```
                        BEFORE                    AFTER
signal   chunk         147.9 KB (+ preflight)    47.0 KB   ← −101 KB
nimbus   chunk          36.8 KB                  45.0 KB
atelier  chunk          27.3 KB                  32.6 KB
cipher   chunk          14.5 KB                  16.4 KB
app global chunk       146.8 KB (+ preflight)   146.8 KB
```

A Signal portfolio visitor now downloads **193.8 KB of CSS instead of 294.7 KB**. The duplicated Tailwind preflight is gone — the `-webkit-text-size-adjust` marker now appears in the app global chunk only.

The three non-Signal chunks grew by 5–8 KB each. That is the self-hosted `@font-face` CSS that `next/font` now emits in place of the remote stylesheet request each template used to make — a local, cacheable, same-origin cost replacing a blocking third-party round trip.

**Verified no utility was lost** by removing `@import "tailwindcss"` from `signal/styles.css`: Signal's arbitrary utilities (`tracking-[-.045em]`, `clamp(2.5rem,5.5vw,4.8rem)`, `origin-bottom-left`) all resolve from the app global chunk via the new `@source "../template-library"` in `globals.css`, while Signal's own custom classes stay in the Signal chunk.

### Measured result — fonts

64 `.woff2` files are now emitted under `.next/static/`, and **no CSS chunk contains any reference to `fonts.googleapis.com` or `fonts.gstatic.com`**. The serial `HTML → CSS → Google CSS → font files` chain is eliminated, as is the third-party request on every visitor's page load.

### Test coverage

30 → **63 passing tests**. `tests/template-library.test.tsx` renders all four templates (Nimbus and Cipher had none before) against the demo portfolio, an empty portfolio, empty-object items, and hostile `javascript:` URLs, and adds regressions for §1, §4, §5, and §7. The table of templates is asserted against `templatesRegistry`, so a fifth template cannot be added without being covered.

`next/font/google` is a build-time transform with no runtime implementation, so importing any template threw under Vitest. `tests/stubs/next-font-google.ts` provides deterministic loaders, aliased in `vitest.config.ts`.

### Corrections to this report

Two items above overstated the problem. Recording them rather than quietly editing the claim:

- **§8** stated the matrix-rain loop had "no coarse-pointer or reduced-motion gate". The reduced-motion gate was already there (`cipher/CipherTemplate.tsx`, the `!showMatrix || reducedMotion || systemStatus !== "active"` early return), and the rain is opt-in behind a toggle, so gating it further on pointer type would override a deliberate user choice. **The loop was left as-is.** The genuine half of §8 — the mouse-only drag — was real and is fixed.
- **§11.7** called the blunt reduced-motion reset "currently harmless". It was, but the fix landed anyway since `transform` was being reset across the whole subtree; `animation`/`transition` now reset broadly and `transform`/`filter` only on the elements that actually animate them.

### Additional problems found and fixed while implementing

Not in the original report, same class of defect, found while editing:

- **Signal hardcoded a five-star rating on every testimonial** — `"★".repeat(5)` with `aria-label="5 star rating"`, rendered unconditionally regardless of data. This is the same fabrication as §1: it asserts a review nobody gave. Now driven by an optional `rating` field and omitted when absent.
- **Signal invented a full score gauge and "Grade A+"** for test-score items with no score entered (`percent` defaulted to `100`). Now `null` when unparseable, and the gauge and grade are both omitted.
- **Signal's language proficiency meter drew 3-of-5 bars for a blank level.** Now omitted when no level is entered.
- **Signal declared `--font-sans` and `--font-mono` on `:root`**, so loading the template silently overrode the _app's_ global `--font-mono` for the whole page. Now scoped to `.signal-site`.
- **Nimbus rendered literal `"Role"`, `"Degree"`, and `"Institution"`** placeholders for blank fields — milder than Signal's fabricated institutions but the same failure. Now collapses.
- **Atelier and Nimbus rendered a dangling `"at"`** between an empty role and empty company. Now only joins when both halves exist.
- **Signal's `0{index+1}` also affected the publications badge** (`[010] PUBLISHED`) and writing rows, beyond the sites §7 listed.
- **Missing OG routes were a live 404, not just an inconsistency.** `app/portfolios/[username]/[[...slug]]/page.tsx:56-59` builds `/api/template/${templateId}/og` from the portfolio's own template id with no fallback — so every Nimbus and Cipher portfolio without a custom social image pointed `og:image` at a route that did not exist and shared with no preview card. Both routes now exist, styled to their template's palette.

### Open follow-ups

- **No template targets non-technical professionals.** §6 was resolved by narrowing Signal's marketing rather than broadening its copy, which is the right call for Signal but leaves the gap: three of four templates are developer-facing and Atelier is design-facing. A fifth template is the fix, not a change to an existing one.
- **Cipher has no skip link.** Signal, Atelier, and Nimbus now all have one. Cipher is a terminal emulator whose command input takes focus on boot and whose tab rail is reachable immediately, so a skip link has no clear destination — left deliberately.
- **The submodule now depends on `next/font`.** The templates were previously framework-agnostic React plus CSS. This is acceptable because the submodule has exactly one consumer, but it does mean the templates can no longer be dropped into a non-Next app without replacing `fonts.ts`.
