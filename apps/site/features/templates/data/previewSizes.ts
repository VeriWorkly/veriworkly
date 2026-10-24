/**
 * Pixel sizes of the raster template previews, for og:image width/height. Social cards do
 * not render SVG, so a template whose preview is an SVG wireframe falls back to the generic
 * templates card. `claims-truth.contract.test.ts` reads the files with sharp and fails when
 * a size here is stale.
 */
export const PREVIEW_SIZES: Record<string, { width: number; height: number }> = {
  "/templates/resume/executive-clarity.png": { width: 630, height: 877 },
  "/templates/resume/precision-ats.png": { width: 631, height: 882 },
  "/templates/cover-letter/professional.png": { width: 630, height: 880 },
  "/templates/cover-letter/veriworkly-special.png": { width: 630, height: 882 },
  "/templates/portfolio/signal.png": { width: 1900, height: 937 },
  "/templates/portfolio/atelier.png": { width: 1897, height: 941 },
  "/templates/portfolio/nimbus.png": { width: 1898, height: 898 },
  "/templates/portfolio/cipher.png": { width: 1912, height: 936 },
};

export const TEMPLATES_FALLBACK_CARD = {
  url: "/og/templates-page-og.png",
  width: 1200,
  height: 630,
} as const;

/** The share image for a template: its own preview when that is a raster, otherwise the card. */
export function shareImageFor(previewImage: string) {
  const size = PREVIEW_SIZES[previewImage];

  if (!size || previewImage.endsWith(".svg")) return TEMPLATES_FALLBACK_CARD;

  return { url: previewImage, ...size };
}
