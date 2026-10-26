import { Font } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { getResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import { getPdfFontEntries } from "@/features/documents/constants/fonts";
import { needsLastResortPdfFont } from "@/features/documents/export/pdf-unsupported-text";

const registeredFonts = new Set<string>();
let hasRegisteredHyphenation = false;

/**
 * Mirrors the preview's `overflow-wrap: anywhere` (see `.resume-page-preview`
 * in globals.css) as closely as react-pdf allows.
 *
 * Words short enough to fit a column are left whole, and genuinely oversized
 * tokens (long URLs and emails) get a break opportunity at every character,
 * which is what `anywhere` does once a word cannot fit on a line by itself.
 *
 * Where such a token does break, react-pdf prints a "-" at the end of the line
 * (S-104/S-297): `@react-pdf/textkit` 7 turns every break inside a word into a
 * penalty node and `breakLines` inserts U+002D at each penalty it breaks on.
 * The only breaks without a hyphen are glue nodes, which textkit makes only from
 * parts that are JS whitespace (`s.trim() === ""`). U+200B is not whitespace to
 * `trim`, so it is still a hyphenated penalty. U+FEFF is, and with Inter in the
 * stack it lays out at zero width with no hyphen, but it stays in the text layer:
 * pdf.js then extracts the URL as "h t t p s : / / …", which breaks every reader
 * and ATS that copies it. A hyphen at a visible break costs less than a URL
 * nobody can copy, so the hyphen stays until textkit can break without one.
 */
const MAX_UNBREAKABLE_WORD_LENGTH = 60;

/**
 * Turns react-pdf's hyphenation off, which is what CSS does by default.
 *
 * Exported and free of the `window` guard on purpose: react-pdf hyphenates
 * eagerly ("doc-ument", "de-tails") unless told not to, and the preview never
 * will, so anything that lays out a PDF has to install this — including tests.
 */
export function registerPdfHyphenation() {
  if (hasRegisteredHyphenation) return;

  Font.registerHyphenationCallback((word) =>
    word.length <= MAX_UNBREAKABLE_WORD_LENGTH ? [word] : Array.from(word),
  );

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
