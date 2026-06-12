# VeriWorkly Portfolio Design

## Visual Theme

Public surfaces use a proof-studio direction: oversized but controlled typography, dark ink fields, VeriWorkly blue actions and proof markers, and large live portfolio previews. Authenticated surfaces use a quieter VeriWorkly workbench with cool white layers and compact controls.

## Color Palette

- Ink: `oklch(18% 0.025 258)`
- Paper: `oklch(98% 0.004 258)`
- Panel: `oklch(100% 0 0)`
- Cobalt accent: `oklch(55% 0.22 262)`
- Blue proof tint: `#DBEAFE`
- Muted text: `oklch(47% 0.025 258)`
- Lines: translucent ink, stronger on interactive boundaries

## Typography

Use Geist for the product UI and public brand for continuity with VeriWorkly. Public headlines rely on scale, weight, and composition rather than a second display family. Product text uses a compact fixed hierarchy.

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
