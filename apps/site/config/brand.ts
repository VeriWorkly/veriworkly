import { siteConfig } from "@/config/site";

/**
 * The published description of the VeriWorkly design system.
 *
 * Both /brand-kit and /style-guide render from this file, and
 * scripts/build-brand-kit.mts writes the downloadable .zip from it, so a token
 * can never say one thing on the site and another in the archive.
 *
 * Colour values mirror packages/ui/src/styles/themes.css. That file is what the
 * product actually renders; this one is what we promise. Change them together.
 */

export interface BrandColorToken {
  name: string;
  /** CSS custom property, as authored in themes.css. */
  variable: string;
  light: string;
  dark: string;
  description: string;
  /**
   * Core tokens are the ones an outside designer or journalist needs, and are the
   * only ones shown on /brand-kit. /style-guide shows every token.
   */
  core: boolean;
}

export const brandColors: BrandColorToken[] = [
  {
    name: "Background",
    variable: "--background",
    light: "#F5F4EF",
    dark: "#0D1117",
    description: "Primary page background. Warm ivory in light, near-black in dark.",
    core: true,
  },

  {
    name: "Foreground",
    variable: "--foreground",
    light: "#171717",
    dark: "#F3F4F6",
    description: "Primary text colour.",
    core: true,
  },

  {
    name: "Accent",
    variable: "--accent",
    light: "#2563EB",
    dark: "#60A5FA",
    description: "Links, CTAs, and focus rings. Lifted in dark mode to hold contrast.",
    core: true,
  },

  {
    name: "Accent Foreground",
    variable: "--accent-foreground",
    light: "#F8FBFF",
    dark: "#0F172A",
    description: "Text and icons placed on an accent fill.",
    core: true,
  },

  {
    name: "Card",
    variable: "--card",
    light: "#FFFFFF",
    dark: "#121924",
    description: "Raised component surfaces, one step off the page background.",
    core: true,
  },

  {
    name: "Muted",
    variable: "--muted",
    light: "#5F5C54",
    dark: "#94A3B8",
    description: "Secondary text, metadata, and captions.",
    core: true,
  },

  {
    name: "Border",
    variable: "--border",
    light: "rgba(23, 23, 23, 0.12)",
    dark: "rgba(148, 163, 184, 0.25)",
    description: "Dividers and outlines. Always an alpha value, never a solid grey.",
    core: true,
  },

  {
    name: "Destructive",
    variable: "--destructive",
    light: "#DC2626",
    dark: "#EF4444",
    description: "Errors, destructive actions, and failed states.",
    core: true,
  },

  {
    name: "Success",
    variable: "--success",
    light: "#047857",
    dark: "#34D399",
    description: "Completed, valid, and passing states.",
    core: false,
  },

  {
    name: "Warning",
    variable: "--warning",
    light: "#B45309",
    dark: "#FBBF24",
    description: "States that need attention but have not failed.",
    core: false,
  },

  {
    name: "Muted Foreground",
    variable: "--muted-foreground",
    light: "#171717",
    dark: "#171717",
    description: "Text on a muted fill. Intentionally identical in both themes.",
    core: false,
  },

  {
    name: "Destructive Foreground",
    variable: "--destructive-foreground",
    light: "#FFFFFF",
    dark: "#FFFFFF",
    description: "Text on a destructive fill.",
    core: false,
  },

  {
    name: "Success Foreground",
    variable: "--success-foreground",
    light: "#FFFFFF",
    dark: "#052E1F",
    description: "Text on a success fill.",
    core: false,
  },

  {
    name: "Warning Foreground",
    variable: "--warning-foreground",
    light: "#FFFFFF",
    dark: "#271A02",
    description: "Text on a warning fill.",
    core: false,
  },

  {
    name: "Docs Highlight",
    variable: "--fd-accent",
    light: "rgba(96, 165, 250, 0.2)",
    dark: "rgba(130, 139, 2, 0.8)",
    description: "Search and menu highlight, used only by the docs platform.",
    core: false,
  },
];

export const coreBrandColors = brandColors.filter((token) => token.core);

/* ------------------------------------------------------------------ logo ---- */

export interface LogoAsset {
  name: string;
  file: string;
  /** Human-readable dimensions. */
  size: string;
  format: "PNG";
  usage: string;
}

export const logoAssets: LogoAsset[] = [
  {
    name: "Primary Mark",
    file: "veriworkly-logo-256.png",
    size: "256×256",
    format: "PNG",
    usage: "Primary logo mark. For websites, headers, and media placements.",
  },

  {
    name: "App Icon (Large)",
    file: "veriworkly-icon-512.png",
    size: "512×512",
    format: "PNG",
    usage: "Store listings, app launchers, and high-DPI displays.",
  },

  {
    name: "App Icon (Small)",
    file: "veriworkly-icon-192.png",
    size: "192×192",
    format: "PNG",
    usage: "Android home screen, manifest, and favicons.",
  },

  {
    name: "Apple Touch Icon",
    file: "veriworkly-icon-apple-touch.png",
    size: "180×180",
    format: "PNG",
    usage: "iOS home screen and web clip.",
  },
];

export const logoRules = {
  /** Clear space on every side, as a fraction of the mark's width. */
  clearSpaceRatio: 0.25,
  /** Smallest size the mark stays legible at, in px. */
  minSizePx: 16,
  /** Mark geometry inside its square canvas, as percentages. */
  geometry: { widthPct: 74, heightPct: 54 },
} as const;

/* ------------------------------------------------------------ typography ---- */

export interface TypeScaleStep {
  label: string;
  /** Tailwind classes that produce this step. */
  className: string;
  /** Rendered size per breakpoint, smallest first. */
  sizes: string;
  weight: string;
  tracking: string;
  lineHeight: string;
  usage: string;
}

export const typeScale: TypeScaleStep[] = [
  {
    label: "Display",
    className: "text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight",
    sizes: "36 → 48 → 60 px",
    weight: "600",
    tracking: "−0.025em",
    lineHeight: "1.0",
    usage: "Page-opening headline. One per page.",
  },

  {
    label: "Section",
    className: "text-3xl font-semibold tracking-tight",
    sizes: "30 px",
    weight: "600",
    tracking: "−0.025em",
    lineHeight: "36 px",
    usage: "Section headings.",
  },

  {
    label: "Component",
    className: "text-xl font-semibold tracking-tight",
    sizes: "20 px",
    weight: "600",
    tracking: "−0.025em",
    lineHeight: "28 px",
    usage: "Card and panel titles.",
  },

  {
    label: "Body Large",
    className: "text-base leading-8 md:text-lg",
    sizes: "16 → 18 px",
    weight: "400",
    tracking: "0",
    lineHeight: "32 px",
    usage: "Lead paragraphs and marketing copy.",
  },

  {
    label: "Body",
    className: "text-sm leading-relaxed",
    sizes: "14 px",
    weight: "400",
    tracking: "0",
    lineHeight: "1.625",
    usage: "Descriptions, list items, and dense UI text.",
  },

  {
    label: "Eyebrow",
    className: "text-xs font-semibold tracking-[0.24em] uppercase",
    sizes: "12 px",
    weight: "600",
    tracking: "0.24em",
    lineHeight: "16 px",
    usage: "Labels above a heading. Always uppercase.",
  },

  {
    label: "Mono Meta",
    className: "font-mono text-xs",
    sizes: "12 px",
    weight: "400",
    tracking: "0",
    lineHeight: "16 px",
    usage: "Token names, file paths, dimensions, and code.",
  },
];

export const fontStack = {
  sans: {
    family: "Geist Sans",
    variable: "--font-geist-sans",
    usage: "Interface and body copy.",
  },

  mono: {
    family: "Geist Mono",
    variable: "--font-geist-mono",
    usage: "Labels, metadata, code, and numeric detail.",
  },
} as const;

/* ---------------------------------------------------------------- motion ---- */

export const motionTokens = [
  {
    name: "Micro transition",
    value: "200 ms",
    easing: "ease (default)",
    usage: "Hover and focus colour changes on links, cards, and buttons.",
  },

  {
    name: "Enter",
    value: "200 ms",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    usage: "Popovers, dropdowns, and dialogs appearing (animate-scale-in).",
  },

  {
    name: "Shimmer",
    value: "2.2 s loop",
    easing: "ease-in-out",
    usage: "Skeleton loading placeholders (animate-shimmer).",
  },

  {
    name: "Pulse ring",
    value: "2.4 s loop",
    easing: "cubic-bezier(0.4, 0, 0.6, 1)",
    usage: "Live and recording indicators (animate-pulse-ring).",
  },
] as const;

/* ------------------------------------------------------------------ press --- */

export const pressFacts = {
  name: siteConfig.name,
  /** How the name is written, and the ways it must not be. */
  spelling: "VeriWorkly",
  misspellings: ["Veriworkly", "veriworkly", "Veri Workly", "VeriWorkly.ai"],
  creator: siteConfig.creator,
  email: siteConfig.email,
  website: "veriworkly.com",
  repository: siteConfig.links.github,
  licence: "MIT",
  model: "Free-to-use and open-core",

  socials: [
    { label: "X", handle: siteConfig.twitter.handle, href: siteConfig.links.twitter },
    { label: "LinkedIn", handle: "/company/veriworkly", href: siteConfig.links.linkedin },
    { label: "GitHub", handle: "/VeriWorkly", href: siteConfig.links.github },
  ],
} as const;
