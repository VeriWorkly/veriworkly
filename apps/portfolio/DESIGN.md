# VeriWorkly Portfolio Design

## Visual Theme

Public surfaces use a proof-studio direction: oversized but controlled typography, dark ink fields, VeriWorkly blue actions and proof markers, and large live portfolio previews. Authenticated surfaces use a quieter VeriWorkly workbench with cool white layers and compact controls.

## Color Palette

Tokens live in `app/tokens.css`, with a dark set under the dark theme. Light values:

- Ink: `#171717`
- Paper: `#f5f4ef`
- Panel: `#ffffff`
- Cobalt accent: `#2563eb` (`#60a5fa` in dark)
- Blue proof tint: `#dbeafe`
- Muted text: `#5f5c54`
- Lines: translucent ink (12%), stronger (22%) on interactive boundaries

## Typography

Use Outfit (`--font-outfit`, loaded in `app/(platform)/layout.tsx`) for the product UI and public brand, with a Geist, Inter, Arial fallback stack, and Geist Mono for code. Public headlines rely on scale, weight, and composition rather than a second display family. Product text uses a compact fixed hierarchy. Published templates load their own fonts.

## Components

- Primary actions are solid cobalt or ink with 10px corners.
- Secondary actions are white with a defined border.
- Cards use 12px to 16px corners and either a border or a short shadow, never both decoratively.
- Public proof surfaces use dark frames and live iframe previews.
- Workspace controls use consistent hover, focus, disabled, and selected states.

## Layout

- Public pages: maximum width around 1280px, asymmetric compositions, generous vertical rhythm.
- Workspace: collapsible light sidebar, compact top bar, cream background, white cards, and `#2563EB` selected states.
- Editor: one command bar, structure rail, selected-content rail, and true iframe preview.
- Appearance: light and dark themes are persisted across VeriWorkly, while portfolio marketing pages and published templates retain their authored presentation.

## Motion

Public pages may use a single restrained reveal sequence. Product motion communicates state in 160 to 220ms. All motion respects reduced-motion preferences.
