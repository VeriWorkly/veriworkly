# VeriWorkly Design System

The complete specification for how VeriWorkly looks, reads, and behaves — across the
marketing site, the studio app, the docs and blog platforms, portfolio templates, and
every share card and brand asset we publish.

## How to use this document

| If you want to…                     | Go to                                       |
| :---------------------------------- | :------------------------------------------ |
| Copy a colour value                 | [Colour](#colour)                           |
| Set a heading correctly             | [Typography](#typography)                   |
| Use the logo                        | [Logo](#logo)                               |
| Build a page layout                 | [Spacing & layout](#spacing--layout)        |
| Pick a component                    | [Component library](#component-library)     |
| Animate something                   | [Motion](#motion)                           |
| Write UI or marketing copy          | [Voice](#voice)                             |
| Change a token                      | [Changing the system](#changing-the-system) |
| Know what is currently inconsistent | [Known deviations](#known-deviations)       |

### Sources of truth

Three files define the system. Everything else consumes them.

| File                                 | Owns                                                                                                      |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/styles/themes.css`  | Every colour token, in both themes. What the product actually renders.                                    |
| `packages/ui/src/styles/globals.css` | Base element styles, `.surface-grid`, the page gradient, reduced-motion.                                  |
| `apps/site/config/brand.ts`          | The published description of the system — palette, type scale, logo manifest, motion tokens, press facts. |

`apps/site/config/brand.ts` is what `/style-guide`, `/brand-kit`, and the downloadable
`.zip` all render from. It mirrors `themes.css` by hand, because CSS custom properties
cannot be imported into a React tree or a Node build script. **Change the two together
in the same commit.** A token that disagrees between them is a published lie.

This document is the third description of the same palette, so it can drift too. It does
not have to be taken on trust:

```bash
cd apps/site && npm run check:design
```

compares all three, token by token, and fails if any of them disagree.

Live, interactive versions of everything below:

- `https://veriworkly.com/style-guide` — the full system, with working components
- `https://veriworkly.com/brand-kit` — the outward-facing press kit

---

## Brand foundation

**Product.** VeriWorkly is a free-to-use, open-core, privacy-first AI career workspace:
resumes, cover letters, and web portfolios, with no login required to start.

**Core metaphor.** The Master Profile is one verified record of a career. Every document
is a view of it — never re-typed, never out of sync.

**Essence line.** _One profile. Every document._

**Design stance.** Warm ivory rather than stark white. One blue accent doing all the
work. Generous negative space. Type carries the page; ornament does not. Motion confirms
an action and then gets out of the way.

**Name.** `VeriWorkly` — one word, capital V and W. Never _Veriworkly_, _veriworkly_,
_Veri Workly_, or _VeriWorkly.ai_.

**Licence.** MIT. Copyright © 2026 Gautam Raj.

---

## Logo

The mark is a faceted **W** with a period below its centre vertex — a wordmark
abbreviation reduced to a single glyph. There is no separate wordmark lockup; when a text
label is needed, set "VeriWorkly" in Geist Sans Semibold beside the mark.

### Geometry

Authored on a `512 × 512` canvas, exactly symmetric about `x = 256`.

| Property     | Value                                                                                               |
| :----------- | :-------------------------------------------------------------------------------------------------- |
| Canvas       | `viewBox="0 0 512 512"`                                                                             |
| Mark bounds  | `x` 66 → 446, `y` 117 → 395                                                                         |
| Occupies     | 74% of canvas width, 54% of height                                                                  |
| Silhouette   | One closed path, 13 vertices                                                                        |
| Period       | Circle at `(256, 381.8)`, `r = 12.3`                                                                |
| Construction | Facet polygons are clipped to the silhouette, so the outline stays crisp independent of facet edits |

The silhouette path, for reference:

```
M66 117H156l57.2 137.6L236.1 200h39.8l22.9 54.6L356 117h90L322 395h-35.6L256 324l-30.4 71H190Z
```

### Facet palette

Five planes, lightest to darkest. These are the mark's own colours and are **not** theme
tokens — the logo does not recolour with the theme.

| Plane            | Value                 |
| :--------------- | :-------------------- |
| Highlight        | `#58C2F0`             |
| Centre peak      | `#2DAFEB`             |
| Base             | `#0299DA`             |
| Outer descending | `#0D6EB5`             |
| Core / period    | `#055390` / `#065898` |

### Variants

| File                              | Use                                                            |
| :-------------------------------- | :------------------------------------------------------------- |
| `veriworkly-logo-256.png`         | Primary mark. For websites, headers, and media placements.     |
| `veriworkly-icon-512.png`         | Store listings, app launchers, and high-DPI displays.          |
| `veriworkly-icon-192.png`         | Android home screen, manifest, and favicons.                   |
| `veriworkly-icon-apple-touch.png` | iOS home screen and web clip.                                  |

All live in `apps/site/public/brand/logo/`. The manifest is `logoAssets` in
`apps/site/config/brand.ts`; the `.zip` is built from that list, so adding a file there
and re-running the build is the whole process.

### Usage rules

| Rule                 | Value                                  |
| :------------------- | :------------------------------------- |
| Clear space          | 25% of the mark's width, on every side |
| Minimum display size | 16 px                                  |

Nothing enters the clear-space box — not type, rules, other logos, or the edge of a
photograph.

**Never** recolour the mark, distort its proportions, rotate it, add shadows, glows,
gradients, or outlines, or place it on a ground that breaks its contrast.

---

## Colour

Every token carries two values. The light column applies on pale grounds, the dark column
under `.dark`. Values below are authoritative and match
`packages/ui/src/styles/themes.css`.

### Core palette

| Token                 | Light                    | Dark                        | Role                                                       |
| :-------------------- | :----------------------- | :-------------------------- | :--------------------------------------------------------- |
| `--background`        | `#F5F4EF`                | `#0D1117`                   | Page ground. Warm ivory, not white.                        |
| `--foreground`        | `#171717`                | `#F3F4F6`                   | Primary text.                                              |
| `--card`              | `#FFFFFF`                | `#121924`                   | Raised surfaces, one step off the page.                    |
| `--muted`             | `#5F5C54`                | `#94A3B8`                   | Secondary text, metadata, captions.                        |
| `--border`            | `rgba(23, 23, 23, 0.12)` | `rgba(148, 163, 184, 0.25)` | Dividers and outlines. Always alpha, never a solid grey.   |
| `--accent`            | `#2563EB`                | `#60A5FA`                   | Links, CTAs, focus rings. Lifted in dark to hold contrast. |
| `--accent-foreground` | `#F8FBFF`                | `#0F172A`                   | Text and icons on an accent fill.                          |

### Status palette

Semantic status is deliberately separate from `--accent`: accent means "this is
VeriWorkly", status means "this is the state of your data". There are four states and four
tokens. Informational states reuse `--accent` rather than introducing a fifth hue.

| Token                      | Light     | Dark      | Role                                        |
| :------------------------- | :-------- | :-------- | :------------------------------------------ |
| `--destructive`            | `#DC2626` | `#EF4444` | Errors, destructive actions, failed states. |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` | Text on a destructive fill.                 |
| `--success`                | `#047857` | `#34D399` | Completed, valid, passing.                  |
| `--success-foreground`     | `#FFFFFF` | `#052E1F` | Text on a success fill.                     |
| `--warning`                | `#B45309` | `#FBBF24` | Needs attention but has not failed.         |
| `--warning-foreground`     | `#FFFFFF` | `#271A02` | Text on a warning fill.                     |

### Internal tokens

| Token                | Light                     | Dark                     | Role                                                      |
| :------------------- | :------------------------ | :----------------------- | :-------------------------------------------------------- |
| `--muted-foreground` | `#171717`                 | `#171717`                | Text on a muted fill. Identical in both themes by design. |
| `--fd-accent`        | `rgba(96, 165, 250, 0.2)` | `rgba(130, 139, 2, 0.8)` | Fumadocs search/menu highlight. Docs platform only.       |

### Tailwind mapping

Tokens become utilities through an `@theme inline` block in each app's `globals.css`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Mapped in `apps/site`, `apps/studio`, `apps/blog-platform`, and `apps/docs-platform`.
`apps/portfolio` runs a parallel system — see [Portfolio](#portfolio).

**A token that is not mapped produces no utility.** `text-muted-foreground` currently
resolves to nothing anywhere, because `--color-muted-foreground` is absent from every
`@theme` block. If you add a token to `themes.css` and intend to use it as a class, map it
in all four apps.

### Conventions

- **Tinted fills.** A status or accent surface is a `10%` fill with a `25%` border of the
  same token: `bg-success/10 border-success/25 text-success`. That combination reads
  correctly on both `--background` and `--card` without a second variant.
- **Alpha borders.** `--border` is always an alpha value so it composites over whatever
  sits behind it. Never substitute a solid grey.
- **The dark theme is not an inversion.** `--accent` lightens from `#2563EB` to `#60A5FA`
  specifically so it keeps contrast on near-black. Do not assume a token can be derived
  from its counterpart.
- **No raw palette colours in product code.** `emerald-500`, `blue-600`, `zinc-200` and
  friends do not follow the theme and appear in no palette, which makes them invisible to
  this document.

### Contrast

Measured WCAG 2.1 ratios for the pairs that matter. Normal text needs 4.5:1; large text
and UI boundaries need 3:1.

| Pair                          | Light                               | Dark        |
| :---------------------------- | :---------------------------------- | :---------- |
| Foreground on Background      | 16.28 — AAA                         | 17.20 — AAA |
| Foreground on Card            | 17.93 — AAA                         | 16.03 — AAA |
| Muted on Background           | 6.06 — AA                           | 7.38 — AAA  |
| Muted on Card                 | 6.68 — AA                           | 6.88 — AA   |
| Accent on Background          | 4.69 — AA                           | 7.44 — AAA  |
| Accent-foreground on Accent   | 4.98 — AA                           | 7.02 — AAA  |
| Success on Background         | 4.98 — AA                           | 9.84 — AAA  |
| Warning on Background         | 4.56 — AA                           | 11.34 — AAA |
| **Destructive on Background** | **4.39 — fails AA for normal text** | 5.03 — AA   |

`--destructive` at `#DC2626` on `#F5F4EF` is 4.39:1 — under the 4.5:1 threshold. It is
safe for icons, borders, and text at 18px+ (or 14px+ bold). For error text at body size on
a light ground, darken to roughly `#B91C1C` (6.0:1), or pair the colour with an icon and
explicit wording so colour is not the only signal.

---

## Typography

### Families

| Role      | Family     | Variable            | Loaded by                                             |
| :-------- | :--------- | :------------------ | :---------------------------------------------------- |
| Interface | Geist Sans | `--font-geist-sans` | `packages/ui/src/lib/fonts.ts` via `next/font/google` |
| Mono      | Geist Mono | `--font-geist-mono` | same                                                  |

Consumed by `apps/site`, `apps/studio`, `apps/blog-platform`, and `apps/docs-platform` —
each spreads `globalFontVariables` onto its root element. `apps/portfolio` uses **Outfit**
instead; see [Portfolio](#portfolio).

Both Geist faces are released by Vercel under the SIL Open Font License 1.1 and are
available from Google Fonts. `next/font` self-hosts them at build time, so there is no
runtime request to Google and nothing to license to typeset the VeriWorkly name.

**Geist Sans** carries interface and body copy. **Geist Mono** carries labels, metadata,
file paths, dimensions, token names, and code — anything the reader should recognise as a
machine value rather than prose.

### Scale

Seven steps. Everything on a VeriWorkly surface should be one of them.

| Step           | Tailwind                                                        | Rendered        | Weight | Tracking | Line height | Use                                      |
| :------------- | :-------------------------------------------------------------- | :-------------- | :----- | :------- | :---------- | :--------------------------------------- |
| **Display**    | `text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight` | 36 → 48 → 60 px | 600    | −0.025em | 1.0         | Page-opening headline. One per page.     |
| **Section**    | `text-3xl font-semibold tracking-tight`                         | 30 px           | 600    | −0.025em | 36 px       | Section headings.                        |
| **Component**  | `text-xl font-semibold tracking-tight`                          | 20 px           | 600    | −0.025em | 28 px       | Card and panel titles.                   |
| **Body Large** | `text-base leading-8 md:text-lg`                                | 16 → 18 px      | 400    | 0        | 32 px       | Lead paragraphs, marketing copy.         |
| **Body**       | `text-sm leading-relaxed`                                       | 14 px           | 400    | 0        | 1.625       | Descriptions, list items, dense UI.      |
| **Eyebrow**    | `text-xs font-semibold tracking-[0.24em] uppercase`             | 12 px           | 600    | 0.24em   | 16 px       | Label above a heading. Always uppercase. |
| **Mono Meta**  | `font-mono text-xs`                                             | 12 px           | 400    | 0        | 16 px       | Token names, paths, dimensions, code.    |

The canonical copy of this table is `typeScale` in `apps/site/config/brand.ts`.

### Rules

- **Weights.** 400 for prose, 600 for every heading and label. 500 appears on some
  interactive text; 700 and above are reserved for the share-card title, which is
  optically compensating for downscaling in social feeds.
- **Tracking.** Headings tighten to `−0.025em`. Uppercase eyebrows open to `0.24em` —
  uppercase without added tracking reads as shouting.
- **Measure.** Keep running prose near 65 characters. `max-w-2xl` on lead paragraphs,
  `max-w-3xl` on explanatory blocks.
- **Balance.** Multi-line headings get `text-wrap: balance`.
- **Numerals.** Any column of digits gets `tabular-nums`.

---

## Spacing & layout

### Container

```tsx
<Container>…</Container> // packages/ui/src/components/layout/Container.tsx
```

Renders `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` — 1280 px maximum, with 16 px of
gutter on mobile, 24 px from `sm`, 32 px from `lg`. Accepts `as` to change the element. Do
not hand-roll a container; reach for this one so gutters stay identical across every page
and app.

### Breakpoints

Tailwind v4 defaults, unmodified.

| Prefix | Min width       |
| :----- | :-------------- |
| `sm`   | 640 px (40rem)  |
| `md`   | 768 px (48rem)  |
| `lg`   | 1024 px (64rem) |
| `xl`   | 1280 px (80rem) |
| `2xl`  | 1536 px (96rem) |

### Page rhythm

- **Marketing page shell:** `pt-28 pb-20 lg:pt-36` on the outer wrapper. The top padding
  clears the fixed navbar.
- **Between sections:** `space-y-16 md:space-y-24`.
- **Inside a section:** `space-y-8`, with `space-y-4` to `space-y-6` inside a card.
- **Anchored sections:** `scroll-mt-24`, so a deep link does not land under the navbar.
- **Sibling groups** are spaced with flex or grid `gap`, not per-element margins — margins
  collapse and double in ways that are hard to see and harder to fix.

### Radius scale

| Token          | Value | Applied to                                                        |
| :------------- | :---- | :---------------------------------------------------------------- |
| `rounded-md`   | 6 px  | Checkbox                                                          |
| `rounded-lg`   | 8 px  | Small inputs                                                      |
| `rounded-xl`   | 12 px | Medium inputs, menus, small tiles                                 |
| `rounded-2xl`  | 16 px | Large inputs, select, textarea, accordion, tooltip, nested panels |
| `rounded-3xl`  | 24 px | `Card`, modal                                                     |
| `rounded-4xl`  | 32 px | Major landing sections                                            |
| `rounded-full` | pill  | Buttons, badges, switch, chips                                    |

Radius tracks size: the larger the surface, the larger the corner. Controls that accept
text are pills or 12–16 px; containers that hold other things are 24–32 px.

---

## Surfaces, elevation & patterns

### Surface grid

The signature background. 28 px, drawn from `--border` at 60% so it follows the theme.

```css
.surface-grid {
  background-image:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--border) 60%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--border) 60%, transparent) 1px,
      transparent 1px
    );
  background-position: center;
  background-size: 28px 28px;
}
```

28 px is the system's grid unit. Share cards use it too — if you draw a grid anywhere, it
is 28 px.

### Page gradient

Applied globally to `body` in `packages/ui/src/styles/globals.css`. Two accent radials in
the top corners over the page ground.

```css
background:
  radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%),
  radial-gradient(circle at top right, rgba(96, 165, 250, 0.08), transparent 22%), var(--background);
```

When reproducing it in a component, compose from tokens rather than baking the hexes, so
the swatch follows the theme:

```css
background:
  radial-gradient(
    circle at top left,
    color-mix(in srgb, var(--accent) 12%, transparent),
    transparent 28%
  ),
  radial-gradient(
    circle at top right,
    color-mix(in srgb, var(--accent) 8%, transparent),
    transparent 22%
  ),
  var(--background);
```

### Card depth

A 145° linear gradient gives card surfaces a soft, paper-like fall-off.

```css
background: linear-gradient(
  145deg,
  var(--card),
  color-mix(in oklab, var(--card) 88%, var(--foreground))
);
```

### Shadows

| Name            | Value                                            | Use                               |
| :-------------- | :----------------------------------------------- | :-------------------------------- |
| Card default    | `shadow-sm`                                      | Every `Card`                      |
| Premium / float | `shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)]`    | Landing sections, floating panels |
| Accordion       | `shadow-[0_12px_35px_-28px_rgba(15,23,42,0.65)]` | Accordion shell                   |
| Menu            | `shadow-xl ring-1 ring-black/5`                  | Dropdowns                         |
| Modal           | `shadow-2xl`                                     | Dialog                            |

The premium shadow is deliberately large-blur and heavily negative-spread: it reads as
depth rather than as a drop shadow.

### Selection

```css
::selection {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
}
```

---

## Motion

Motion confirms an action; it never announces itself. Anything longer than 250 ms on an
interaction reads as latency.

| Token            | Duration   | Easing                          | Use                                                |
| :--------------- | :--------- | :------------------------------ | :------------------------------------------------- |
| Micro transition | 200 ms     | `ease` (default)                | Hover and focus colour changes                     |
| Enter            | 200 ms     | `cubic-bezier(0.16, 1, 0.3, 1)` | Popovers, dropdowns, dialogs (`animate-scale-in`)  |
| Shimmer          | 2.2 s loop | `ease-in-out`                   | Skeleton placeholders (`animate-shimmer`)          |
| Pulse ring       | 2.4 s loop | `cubic-bezier(0.4, 0, 0.6, 1)`  | Live / recording indicators (`animate-pulse-ring`) |

Registered in each app's `@theme` block. Canonical list: `motionTokens` in
`apps/site/config/brand.ts`.

Component-level transitions run at `duration-200`, occasionally `duration-300` for
accordion height. Transform-based hover affordances signal direction of travel — links
move right (`translate-x-0.5`), downloads move down (`translate-y-0.5`), external links
move up-right.

### Reduced motion

A global rule in `packages/ui/src/styles/globals.css` collapses every animation and
transition to `0.01ms` and disables smooth scrolling:

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

You do not need to handle this per component. But **never encode meaning in motion
alone** — for some readers there will be none.

---

## Focus & accessibility

Every interactive element needs a visible keyboard focus state, on `:focus-visible` only
so a mouse click stays quiet.

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
```

`Button` uses `focus-visible:ring-accent/40`; form controls use `ring-accent/10` to
`ring-accent/20` paired with `focus-visible:border-accent/40`, because a filled control
already carries a border to strengthen.

Checklist for anything interactive:

- Reachable by keyboard, in a sensible tab order.
- Visible focus ring with an offset — never `outline: none` alone.
- Decorative icons get `aria-hidden="true"`; meaningful ones get a label.
- Icon-only controls get `aria-label`.
- Colour is never the only carrier of state — pair it with an icon, a label, or wording.
- Touch targets are at least 44 px tall (`size="md"` is 44 px, `size="lg"` is 48 px).
- Wide content (tables, code, diagrams) scrolls inside its own `overflow-x: auto`
  container so the page body never scrolls sideways.

---

## Component library

Exported from `@veriworkly/ui` (`packages/ui/src/index.ts`). Reach for these before
writing a new one.

### Layout

| Component         | Notes                                                                            |
| :---------------- | :------------------------------------------------------------------------------- |
| `AppShell`        | `flex min-h-screen flex-col` with `navbar` / `footer` slots and a `flex-1` main. |
| `Container`       | 1280 px max, responsive gutters. See [Container](#container).                    |
| `MarketingNavbar` | Fixed marketing nav; desktop nav, mobile sheet, actions, and logo as sub-parts.  |
| `MarketingFooter` | Shared marketing footer.                                                         |
| `ThemeToggle`     | Light / dark switch. Toggles `.dark` on the root element.                        |
| `SocialIcons`     | Brand social icons, sourced from `apps/site/public/icons/socials/`.              |

### Controls

**`Button`** — `rounded-full`, `font-medium`, `transition`, focus ring `accent/40`,
`disabled:opacity-50`.

| Variant     | Style                                                                       |
| :---------- | :-------------------------------------------------------------------------- |
| `primary`   | `bg-accent text-accent-foreground shadow-sm hover:opacity-90`               |
| `secondary` | `bg-card text-foreground ring-1 ring-inset ring-border hover:bg-background` |
| `ghost`     | `bg-transparent text-foreground hover:bg-card`                              |

| Size | Height | Padding | Text  |
| :--- | :----- | :------ | :---- |
| `sm` | 36 px  | 12 px   | 14 px |
| `md` | 44 px  | 16 px   | 14 px |
| `lg` | 48 px  | 20 px   | 16 px |

Supports `asChild` (clones the child — e.g. a `Link` — with the button classes), `loading`,
and `loadingText`. **One primary button per view.**

**`Input`** — variants `outline` (default), `filled`, `ghost`; sizes `sm` (36 px,
`rounded-lg`), `md` (44 px, `rounded-xl`), `lg` (48 px, `rounded-2xl`). Takes `error` to
swap the border and ring to `--destructive`. Note the prop is `inputSize`, not `size`,
because `size` collides with the native attribute.

**`TextArea`** — `min-h-30` (120 px), `rounded-2xl`, non-resizable, same error treatment.

**`Select`** — 44 px, `rounded-2xl`, `focus:ring-accent/20`.

**`Checkbox`** — 20 px, `rounded-md`, `border-2`; checked and indeterminate both fill with
`--accent`. Tick animates in over 200 ms.

**`Switch`** — 24 × 44 px track, 20 px knob, `bg-accent` on / `bg-muted/80` off, 200 ms,
focus ring on `focus-within`.

**`Badge`** — `rounded-full border px-3 py-1 text-xs font-medium`, neutral by default. For
status, add the tinted-fill triplet: `bg-success/10 border-success/25 text-success`.

### Surfaces & overlays

**`Card`** — `bg-card rounded-3xl p-5 shadow-sm overflow-hidden`. The default padding is
routinely overridden (`p-6`, `p-8`), and `p-0` is used when children own their own padding
— a divided list, for instance.

**`Modal`** — `bg-black/50 backdrop-blur-sm` overlay; a bottom sheet on mobile
(`items-end`, `rounded-t-3xl`, 6 × 48 px drag handle) that becomes a centred
`max-w-lg rounded-3xl` dialog from `md`.

**`Menu`** — absolutely positioned, `z-30`, `rounded-xl` / `rounded-2xl` by size,
`shadow-xl ring-1 ring-black/5`; items are `rounded-xl` with `hover:bg-accent/10`;
separators are `bg-border h-px`.

**`Accordion`** — `rounded-2xl border-border/70 bg-card/90`; animates `grid-template-rows`
over 300 ms; the chevron rotates 180°.

**`Tooltip`** — `rounded-2xl`, `max-w-[280px]`, `backdrop-blur-2xl`. Deliberately
**inverted** against the page: near-black in light mode, near-white in dark. A tooltip is
a temporary overlay, so it should read as separate from the surface beneath it.

### Icons

**Lucide React** (`lucide-react` ^1.27), 1.5 px stroke, sized in 4 px steps from 16 to
24 px (`size-4`, `size-5`, `size-6`). Icons inherit `currentColor`.

---

## Share cards (Open Graph)

Generated on request by `apps/site/app/api/og/route.tsx` (edge runtime, Satori) rather
than designed one at a time, so no page ships without one.

| Property    | Value                                                                                                           |
| :---------- | :-------------------------------------------------------------------------------------------------------------- |
| Canvas      | 1200 × 630 (1.91:1)                                                                                             |
| Composition | Centred: pill badge, title, description, with the domain locked to the bottom                                   |
| Ground      | `--background`, two accent radials in the top corners, 28 px grid                                               |
| Badge       | Inline mono mark at 34 px + "VeriWorkly" in mono 700, on a token-tinted pill                                    |
| Title       | 84 px / weight 900 / `−0.05em`, dropping to 60 px past 40 characters, filled with a Foreground → Muted gradient |
| Description | 32 px / weight 500 / `--muted`, `max-width` 850 px                                                              |
| Footer      | `veriworkly.com`, 18 px, `0.2em` tracking, uppercase, 50% opacity                                               |
| Cache       | `public, immutable, max-age=31536000`                                                                           |

| Parameter     | Behaviour                                       |
| :------------ | :---------------------------------------------- |
| `title`       | Up to 120 characters. Defaults to "VeriWorkly". |
| `description` | Up to 250 characters.                           |
| `theme`       | `light` (default) or `dark`.                    |
| `showDesc`    | `false` for a title-only card.                  |

Two constraints worth knowing before editing this route:

1. **Satori has no CSS custom properties.** The theme values are repeated as literals in a
   `t` object at the top of the route. They must stay equal to `themes.css`.
2. **No network dependencies.** The mark is drawn as an inline `<path>`, not fetched as a
   PNG. A remote image that fails to resolve does not fail the render — it silently
   produces a card with no logo. The faceted mark needs a `clipPath` and seven gradients
   that Satori does not support reliably, which is why the badge uses the single-colour
   mark.

Text is stripped of control, zero-width, and bidi-override codepoints and length-capped,
so the endpoint cannot be used to mint a convincing card that says something we did not
write.

---

## Surfaces & sub-brands

One system, five surfaces. None of them introduces a separate brand.

| Surface      | App                  | Font       | Tokens                       |
| :----------- | :------------------- | :--------- | :--------------------------- |
| Marketing    | `apps/site`          | Geist      | Shared                       |
| Studio (app) | `apps/studio`        | Geist      | Shared                       |
| Docs         | `apps/docs-platform` | Geist      | Shared + `--fd-*` (Fumadocs) |
| Blog         | `apps/blog-platform` | Geist      | Shared                       |
| Portfolio    | `apps/portfolio`     | **Outfit** | **Parallel — see below**     |

### Portfolio

The portfolio product is a system-managed app surface that extends the platform without
introducing a separate brand.

- **Marketing pages** — asymmetric editorial product tour with a structured template
  gallery.
- **App pages** — workbench layout: grouped editing cards, contextual help, publish
  readiness, and a persistent private preview.
- **Public templates** — may use distinct local palettes and typography, so portfolio
  owners get a real creative choice. Template palettes must be declared as named CSS
  tokens in each template stylesheet (`apps/portfolio/template-library/*/`).
- **Motion** — CSS-first reveal, hover lift, and state transitions. Spatial motion
  collapses under `prefers-reduced-motion`.
- **Editor stance** — section-aware inputs, plain-language guidance, compatible snapshot
  parsing, visible focus, and no destructive action without a label.

Portfolio declares its own token layer in `apps/portfolio/app/tokens.css` under a different
vocabulary — `paper`, `panel`, `ink`, `line` instead of `background`, `card`, `foreground`,
`border` — plus its own spacing scale (`--space-xs` … `--space-4xl`, 4 → 112 px), radius
scale (`--radius-xs` … `--radius-xl`, 6 → 20 px), easings, and durations (`--dur-fast`
160 ms, `--dur-medium` 320 ms, `--dur-slow` 700 ms).

The underlying colour values are the platform palette:

| Portfolio            | Platform equivalent                           |
| :------------------- | :-------------------------------------------- |
| `--color-paper`      | `--background` (`#F5F4EF` / `#0D1117`)        |
| `--color-panel`      | `--card` (`#FFFFFF` / `#121924`)              |
| `--color-ink`        | `--foreground` (`#171717` / `#F3F4F6`)        |
| `--color-muted`      | `--muted` (`#5F5C54` / `#94A3B8`)             |
| `--color-line`       | `--border` (12% / 24% alpha)                  |
| `--color-accent`     | `--accent` (`#2563EB` / `#60A5FA`)            |
| `--color-accent-ink` | `--accent-foreground` (`#F8FBFF` / `#0F172A`) |

Portfolio's `--color-success` / `--color-warning` / `--color-danger` are authored in `oklch`
and are **not** the platform's `--success` / `--warning` / `--destructive`. Treat them as
template-layer colours, not platform status.

---

## Voice

How we write about VeriWorkly, in product and in public.

**Direct, not hypey.** Lead with what the product does, not adjectives. "No login required
to start" beats "revolutionary, game-changing career platform."

**Privacy-forward.** Be specific about what stays local, what syncs, and why. Vague privacy
claims read as marketing; specifics read as true.

**Built by the same people who use it.** Written by people who build resumes, not a brand
team. Plain language over jargon; explain ATS, JSON Resume, and similar on first use.

**Confident about being free and open.** "Free-to-use and open-core" is a real
differentiator, not an apology. State it plainly rather than hedging.

### UI copy

- Write from the reader's side of the screen. A person manages _notifications_, not
  _webhook config_.
- Active voice. A control says exactly what happens — "Publish", then a toast that says
  "Published".
- Errors explain what went wrong and how to fix it. No apologies, no vagueness.
- Specific beats clever.

### Product terms

| Term                  | Meaning                                                                                                             |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **VeriWorkly**        | The company and product. One word, capital V and W.                                                                 |
| **VeriWorkly Resume** | Only when disambiguating from other VeriWorkly products (e.g. the repo name).                                       |
| **Master Profile**    | The canonical career-facts record that seeds resumes, cover letters, and portfolios. Capitalised as a product term. |

### Boilerplate

- **One-liner** — Free AI resumes, cover letters & web portfolios. No login required.
- **Short** — VeriWorkly is a free, open-core, privacy-first AI career workspace — a resume,
  cover letter, and portfolio builder that requires no login to start and keeps data
  local-first with optional cloud sync.
- **Long** — see `siteConfig.description` in `apps/site/config/site.ts`.

Press and brand enquiries: `info@veriworkly.com`.

---

## Changing the system

### Adding or changing a colour token

1. Edit `packages/ui/src/styles/themes.css` — **both** `:root` and `.dark`.
2. Mirror the change in `brandColors` in `apps/site/config/brand.ts`, with a description
   and a `core` flag (`true` puts it on `/brand-kit`; every token appears on
   `/style-guide`).
3. If it needs a Tailwind utility, add `--color-<name>: var(--<name>)` to the
   `@theme inline` block in `apps/site`, `apps/studio`, `apps/blog-platform`, and
   `apps/docs-platform`. Skipping this leaves a dead class.
4. Check contrast against `--background` and `--card` in both themes.
5. Run `npm run build:brand-kit` from `apps/site` to regenerate the download.

### Adding a logo asset

1. Drop the file in `apps/site/public/brand/logo/`.
2. Add it to `logoAssets` in `apps/site/config/brand.ts` with its size, format, and a
   one-line usage note.
3. Run `npm run build:brand-kit`. The script fails loudly if a referenced file is missing,
   so the manifest and the folder cannot drift.

### Rebuilding the brand kit

```bash
cd apps/site && npm run build:brand-kit
```

Writes `public/brand/veriworkly-brand-kit.zip` — logos, `palette.json`, and a generated
`README.txt` — from `config/brand.ts`. Output is byte-identical across runs (timestamps are
pinned), so a rebuild with no content change produces no diff. The ZIP writer is
dependency-free and lives in `apps/site/scripts/build-brand-kit.mts`.

Never hand-edit anything inside the archive. The README says so too.

### Verifying the system agrees with itself

```bash
cd apps/site && npm run check:design
```

Compares all three descriptions of the palette — `themes.css`, `brand.ts`, and the tables
in this document — token by token, and reports any token that is defined but never mapped
into a Tailwind `@theme` block. Exits non-zero on drift, so it belongs in CI.

Two tokens are expected in the "not mapped" list: `--fd-accent`, which Fumadocs reads as a
raw CSS variable rather than a utility, and `--muted-foreground`, which is a real gap — see
[Known deviations](#known-deviations).

### Review checklist

Before merging anything visual:

- [ ] Renders correctly in **both** themes — not just the one you were working in.
- [ ] No raw Tailwind palette colours (`emerald-500`, `blue-600`, `zinc-200`).
- [ ] Type is one of the seven scale steps.
- [ ] Interactive elements have a visible `:focus-visible` ring.
- [ ] Spacing comes from layout `gap`, not ad-hoc margins.
- [ ] Wide content scrolls in its own container.
- [ ] Any new token is mapped in all four `@theme` blocks.
- [ ] `npm run check:design` passes.

---

## Known deviations

An honest list of places the codebase does not yet match this document. Each is real and
verified; none is a reason to copy the pattern.

**`Card` border is not themed.** `packages/ui/src/components/ui/Card.tsx` uses
`border-zinc-200/50` where `border-border` exists. Because `zinc-200` does not respond to
the theme, every card in dark mode carries a light-grey outline instead of the
`rgba(148, 163, 184, 0.25)` the system specifies. It is a one-line fix, but it changes the
look of every card surface in every app, so it wants a deliberate visual review.

**Two dead token references.**

- `--border-hover` is used by `Input` and `TextArea` (`hover:border-border-hover`) but is
  defined in no theme or `@theme` block. The class generates nothing, so those controls
  have no hover border state.
- `--muted-foreground` exists in `themes.css` but is never mapped to
  `--color-muted-foreground`, so `text-muted-foreground` in `Checkbox` and
  `placeholder:text-muted-foreground/40` in `Input` and `TextArea` are inert. Input
  placeholders fall back to the browser default rather than a brand colour.

**Raw blue utilities in the shared chrome.** Roughly 406 occurrences of `text-blue-600`,
`dark:text-blue-400`, `border-blue-500/*`, and `bg-blue-500/*` across 30+ files in
`apps/site` hand-roll the accent token at approximately its own values. Converting them to
`text-accent` is mechanical but touches a lot of surface, so it wants to be its own
reviewed change.

**Raw zinc in two components.** `Input`'s `filled` variant uses `bg-zinc-500/10`, and
`Tooltip` uses `zinc-950/90` and `white/95`. The tooltip inversion is intentional; the
input fill is not, and should become an alpha of `--foreground` or `--muted`.

**`--destructive` fails AA on light.** 4.39:1 against `--background`. See
[Contrast](#contrast) for the workaround until the token is darkened.

**Portfolio duplicates the scale.** `apps/portfolio/app/tokens.css` restates the palette
under different names and adds parallel spacing, radius, easing, and duration scales. This
is defensible — templates need their own vocabulary — but it means a platform token change
has to be applied in two places, and portfolio's `oklch` status colours do not match the
platform's.
