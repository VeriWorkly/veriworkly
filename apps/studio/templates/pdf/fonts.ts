import { Font } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { getResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import { getPdfFontEntries } from "@/features/documents/constants/fonts";
import { needsLastResortPdfFont } from "@/features/documents/export/pdf-unsupported-text";

const registeredFonts = new Set<string>();
let hasRegisteredHyphenation = false;

/**
 * Turns react-pdf's hyphenation off, which is what CSS does by default.
 *
 * Lines are no longer broken at textkit's syllables at all: the PDF breaks them by
 * the browser's rules (`templates/pdf/line-breaks.ts`), including the preview's
 * `overflow-wrap: anywhere` for a URL too long for its column, and never prints a
 * "-" at a break (S-104/S-297). Keeping every word whole here still matters if that
 * breaker is ever bypassed: textkit would otherwise split "doc-ument", "de-tails".
 *
 * Exported and free of the `window` guard on purpose: anything that lays out a PDF
 * has to install this — including tests.
 */
export function registerPdfHyphenation() {
  if (hasRegisteredHyphenation) return;

  Font.registerHyphenationCallback((word) => [word]);

  hasRegisteredHyphenation = true;
}

export function registerPdfFont(resume: ResumeData) {
  registerPdfFontById(
    getResumeRenderStyle(resume).fontFamily,
    needsLastResortPdfFont({ type: "RESUME", content: resume }),
  );
}

export function registerCoverLetterPdfFont(content: CoverLetterContent) {
  registerPdfFontById(
    content.appearance?.fontFamily,
    needsLastResortPdfFont({ type: "COVER_LETTER", content }),
  );
}

/** `withLastResort` must match the stack the template asks for; see `getPdfFontStack`. */
function registerPdfFontById(fontFamily: string | null | undefined, withLastResort = false) {
  registerPdfHyphenation();

  const fonts = getPdfFontEntries(fontFamily, withLastResort);

  // Off the browser there is no origin to load `/fonts/...` from, so whoever lays the
  // PDF out registers the files first (`registerPdfTestFonts` in tests). Without them
  // react-pdf falls back to Helvetica and draws a different document.
  if (typeof window === "undefined") {
    const registered = new Set(Font.getRegisteredFontFamilies());
    const missing = fonts.filter((font) => !registered.has(font.primaryFamily));

    if (missing.length > 0) {
      throw new Error(
        `PDF fonts not registered: ${missing.map((font) => font.primaryFamily).join(", ")}`,
      );
    }

    return;
  }

  // The fallbacks too, or the stack `getPdfFontStack` returns names families
  // react-pdf has never heard of and it quietly draws nothing for any character
  // the chosen family lacks.
  for (const font of fonts) {
    if (registeredFonts.has(font.id)) continue;

    Font.register({
      family: font.primaryFamily,
      fonts: font.pdfFonts.map((face) => ({
        src: new URL(face.src, window.location.origin).toString(),
        fontWeight: face.fontWeight,
      })),
    });

    registeredFonts.add(font.id);
  }
}
