import { Font } from "@react-pdf/renderer";

import type { ResumeData } from "@/types/resume";

import { getResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import { FONT_REGISTRY, normalizeFontFamilyId } from "@/features/documents/constants/fonts";

const registeredFonts = new Set<string>();
let hasRegisteredHyphenation = false;

function registerLongWordBreaking() {
  if (hasRegisteredHyphenation) return;

  Font.registerHyphenationCallback((word) => {
    if (word.length <= 18) return [word];

    return word.match(/.{1,12}/g) ?? [word];
  });

  hasRegisteredHyphenation = true;
}

export function registerPdfFont(resume: ResumeData) {
  if (typeof window === "undefined") return;

  const fontId = getResumeRenderStyle(resume).fontFamily;
  registerPdfFontById(fontId);
}

export function registerPdfFontById(fontFamily: string | null | undefined) {
  if (typeof window === "undefined") return;

  registerLongWordBreaking();

  const fontId = normalizeFontFamilyId(fontFamily);
  const font = FONT_REGISTRY[fontId];

  if (!font || registeredFonts.has(font.id)) return;

  Font.register({
    family: font.primaryFamily,
    fonts: font.pdfFonts.map((face) => ({
      src: new URL(face.src, window.location.origin).toString(),
      fontWeight: face.fontWeight,
    })),
  });

  registeredFonts.add(font.id);
}
