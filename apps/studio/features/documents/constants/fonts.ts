export const FONT_IDS = ["geist", "modern", "inter"] as const;

export type FontFamilyId = (typeof FONT_IDS)[number];

type FontScope = "editor" | "on-demand";

type PdfFontFace = {
  src: string;
  fontWeight: number;
};

export interface FontRegistryEntry {
  id: FontFamilyId;
  label: string;
  primaryFamily: string;
  fallbackStack: string;
  /**
   * Embedded families the PDF tries, in order, for a character the primary
   * family cannot draw.
   *
   * The browser does this on its own through the CSS stack; react-pdf only
   * substitutes among the families it is handed, and falls through to
   * Helvetica, which draws nothing. Geist has no glyphs for Vietnamese tone
   * marks or Greek, so `Nguyễn Thị Hương` previewed correctly and exported with
   * seven characters missing until this list existed.
   *
   * The first entry here must match the first real family in `fallbackStack`,
   * or the two renderers substitute different shapes.
   */
  pdfFallbackIds: FontFamilyId[];
  stylesheetHref: string;
  scope: FontScope;
  pdfFonts: PdfFontFace[];
}

const fontDefinitions: FontRegistryEntry[] = [
  {
    id: "geist",
    label: "Geist Sans",
    primaryFamily: "Geist",
    // Manrope before Inter: it covers the same gaps at a fifth of the weight.
    fallbackStack: "Manrope, Inter, 'Segoe UI', Arial, sans-serif",
    pdfFallbackIds: ["modern"],
    // Only 400/700 are requested — matches the two weights registered in pdfFonts
    // below. Requesting extra web weights the PDF renderer can't reproduce creates a
    // WYSIWYG mismatch between the live preview and the downloaded PDF.
    stylesheetHref: "https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap",
    scope: "editor",
    pdfFonts: [
      { src: "/fonts/geist/Geist-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/geist/Geist-Bold.ttf", fontWeight: 700 },
    ],
  },
  {
    id: "modern",
    label: "Manrope Grotesk",
    primaryFamily: "Manrope",
    fallbackStack: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    pdfFallbackIds: [],
    stylesheetHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap",
    scope: "editor",
    pdfFonts: [
      { src: "/fonts/manrope/Manrope-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/manrope/Manrope-Bold.ttf", fontWeight: 700 },
    ],
  },
  {
    id: "inter",
    label: "Inter",
    primaryFamily: "Inter",
    fallbackStack: "'Segoe UI', Arial, sans-serif",
    pdfFallbackIds: [],
    stylesheetHref: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",
    scope: "editor",
    pdfFonts: [
      { src: "/fonts/inter/Inter_18pt-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/inter/Inter_18pt-Bold.ttf", fontWeight: 700 },
    ],
  },
];

const FONT_ALIAS_MAP: Record<string, FontFamilyId> = {
  mono: "geist",
};

const FONT_ID_SET = new Set<FontFamilyId>(fontDefinitions.map((font) => font.id));

const DEFAULT_FONT_FAMILY: FontFamilyId = "geist";

export const FONT_REGISTRY: Record<FontFamilyId, FontRegistryEntry> = Object.fromEntries(
  fontDefinitions.map((font) => [font.id, font]),
) as Record<FontFamilyId, FontRegistryEntry>;

function isFontFamilyId(value: string): value is FontFamilyId {
  return FONT_ID_SET.has(value as FontFamilyId);
}

export function normalizeFontFamilyId(value: string | null | undefined): FontFamilyId {
  const normalized = (value ?? "").trim().toLowerCase();

  if (isFontFamilyId(normalized)) {
    return normalized;
  }

  if (normalized in FONT_ALIAS_MAP) {
    return FONT_ALIAS_MAP[normalized];
  }

  return DEFAULT_FONT_FAMILY;
}

export const fontOptions: Array<{ value: FontFamilyId; label: string }> = fontDefinitions.map(
  (font) => ({
    value: font.id,
    label: font.label,
  }),
);

function toFontFamilyValue(font: FontRegistryEntry) {
  return `'${font.primaryFamily}', ${font.fallbackStack}`;
}

export const FONT_FAMILY_MAP: Record<FontFamilyId, string> = Object.fromEntries(
  fontDefinitions.map((font) => [font.id, toFontFamilyValue(font)]),
) as Record<FontFamilyId, string>;

export function getFontStylesheetHref(fontFamily: string | null | undefined) {
  const normalized = normalizeFontFamilyId(fontFamily);
  return FONT_REGISTRY[normalized].stylesheetHref;
}

/**
 * The family the PDF draws from when nothing earlier in a stack has the glyph. Inter holds
 * ⇒ ₩ ₺ ₦ ₱ ₫ ฿ ∆, which Geist and Manrope lack; the preview borrows a system face for
 * them, but a PDF has only what it embeds.
 *
 * Opt-in per document (`needsLastResortPdfFont`): react-pdf fetches every family a
 * `fontFamily` array names, used or not, and Inter is 340KB a weight.
 */
export const PDF_LAST_RESORT_FONT_ID: FontFamilyId = "inter";

function getPdfFontIds(
  fontFamily: string | null | undefined,
  withLastResort: boolean,
): FontFamilyId[] {
  const font = FONT_REGISTRY[normalizeFontFamilyId(fontFamily)];
  const ids = [font.id, ...font.pdfFallbackIds];

  return [...new Set(withLastResort ? [...ids, PDF_LAST_RESORT_FONT_ID] : ids)];
}

/**
 * Every family the PDF may draw a document in, chosen family first.
 *
 * react-pdf accepts an array for `fontFamily` and picks, per glyph, the first
 * family that can draw it — the same job the CSS font stack does for the
 * preview. Passing a bare family name instead leaves the export falling through
 * to Helvetica, which draws `.notdef`: zero width, no ink, silently missing
 * characters in a document the preview rendered perfectly.
 *
 * The families named here must be registered before layout; see
 * `templates/pdf/fonts.ts`.
 */
export function getPdfFontStack(
  fontFamily: string | null | undefined,
  withLastResort = false,
): string[] {
  return getPdfFontIds(fontFamily, withLastResort).map((id) => FONT_REGISTRY[id].primaryFamily);
}

/** The registry entries a PDF needs loaded: the chosen family and its fallbacks. */
export function getPdfFontEntries(
  fontFamily: string | null | undefined,
  withLastResort = false,
): FontRegistryEntry[] {
  return getPdfFontIds(fontFamily, withLastResort).map((id) => FONT_REGISTRY[id]);
}
