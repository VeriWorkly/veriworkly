# VeriWorkly Design System

This document outlines the core design elements, tokens, and visual patterns used across the VeriWorkly platform.

## Core Colors

The design system uses a curated palette of neutral tones and a vibrant blue accent to create a premium, clean aesthetic.

| Name              | CSS Variable          | Value (Light)            | Description                                      |
| :---------------- | :-------------------- | :----------------------- | :----------------------------------------------- |
| **Background**    | `--background`        | `#F5F4EF`                | Primary page background                          |
| **Foreground**    | `--foreground`        | `#171717`                | Main text color                                  |
| **Accent (Blue)** | `--accent`            | `#2563EB`                | Primary action and branding color                |
| **Card**          | `--card`              | `#FFFFFF`                | Surface for components and containers            |
| **Muted**         | `--muted`             | `#5F5C54`                | Secondary text and less prominent details        |
| **Border**        | `--border`            | `rgba(23, 23, 23, 0.12)` | Subtle separators and outlines                   |
| **Destructive**   | `--destructive`       | `#DC2626`                | Error, danger, and deletion states               |
| **Accent FG**     | `--accent-foreground` | `#F8FBFF`                | Optimized text color for use on blue backgrounds |

## Visual Patterns & Effects

### Surface Grid

A subtle grid background used to provide structure and depth to main landing pages and dashboards.

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

### Page Background Gradient

Applied to the `body` or main wrapper to create a dynamic, modern feel.

```css
background:
  radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%),
  radial-gradient(circle at top right, rgba(96, 165, 250, 0.08), transparent 22%), var(--background);
```

### Card Gradient (Inner Depth)

Used within template preview cards to create a soft, paper-like lighting effect.

```css
background: linear-gradient(
  145deg,
  color-mix(in oklab, var(--resume-page-bg) 92%, transparent),
  color-mix(in oklab, var(--resume-page-bg) 72%, black 4%)
);
```

### Elevation & Shadows

We use a specific heavy shadow for "floating" elements or premium sections.

- **Premium Shadow**: `shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)]`
- **Standard Border Radius**: `32px` (`rounded-4xl`) for major sections; `12px` (`rounded-xl`) for components.

## Typography

The Geist font family is used throughout for its modern, clean appearance.

- **Main Font**: `Geist Sans` (`--font-geist-sans`)
- **Code/Detail Font**: `Geist Mono` (`--font-geist-mono`)

### Scale

- **Display**: `text-6xl` (Mobile: `text-4xl`) / `font-semibold` / `tracking-tight`
- **Section Header**: `text-3xl` / `font-semibold`
- **Body Text**: `text-base` / `leading-8` (Large: `text-lg`)

## Spacing & Layout

- **Max-Width**: `1280px` (`max-w-7xl`)
- **Horizontal Padding**: `px-4` (Mobile), `px-6` (Tablet), `px-8` (Desktop)
- **Vertical Spacing**: `space-y-16` to `space-y-24` between sections.
