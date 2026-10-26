import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { ResumeData } from "@/types/resume";

import {
  FONT_REGISTRY,
  PDF_LAST_RESORT_FONT_ID,
  getPdfFontStack,
} from "@/features/documents/constants/fonts";
import {
  getLinkDisplayText,
  getResumeRenderStyle,
} from "@/features/documents/rendering/resume-rendering";
import { getCoverLetterState } from "@/templates/cover-letter/shared";
import { PDF_GLYPH_COVERAGE } from "@/templates/pdf/glyph-coverage";

import { getResumeExportDocument } from "./resume-export-document";

/** A printed field and the characters in it the PDF has no glyph for. */
/** A document as far as printing goes; the stored envelope carries more. */
type PrintedDocument = Pick<BaseDocument, "type" | "content">;

export interface UndrawablePdfText {
  field: string;
  characters: string[];
}

const coverage = new Map<string, Set<number>>();

function coveredBy(family: string): Set<number> {
  const cached = coverage.get(family);
  if (cached) return cached;

  const points = new Set<number>();

  for (const range of (PDF_GLYPH_COVERAGE[family] ?? "").split(" ").filter(Boolean)) {
    const [start, end = start] = range.split("-").map((hex) => Number.parseInt(hex, 16));
    for (let point = start; point <= end; point += 1) points.add(point);
  }

  coverage.set(family, points);
  return points;
}

/**
 * Spaces, soft hyphens and format characters (joiners, direction marks) carry no ink, so a
 * missing glyph for one changes nothing a reader would notice.
 */
const INKLESS = /^[\p{White_Space}\p{Cf}]$/u;

/** textkit picks a family per code point, so some family in the stack must hold it. */
function canDraw(character: string, families: Set<number>[]): boolean {
  const point = character.codePointAt(0)!;

  return families.some((family) => family.has(point));
}

/**
 * The distinct characters in `text` that every family the PDF tries for `fontFamily` lacks.
 * They lay out as `.notdef`: zero width, no ink, absent from the download while the
 * preview, free to borrow a system font, shows them.
 */
export function findUndrawableCharacters(
  text: string,
  fontFamily: string | null | undefined,
): string[] {
  // With the last-resort family: `needsLastResortPdfFont` adds it whenever it is needed.
  const families = getPdfFontStack(fontFamily, true).map(coveredBy);
  const missing = new Set<string>();

  for (const character of text) {
    if (missing.has(character) || INKLESS.test(character)) continue;
    if (!canDraw(character, families)) missing.add(character);
  }

  return [...missing];
}

function collectText(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, into));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      // Link targets and ids are never drawn as text.
      if (key !== "href" && key !== "id") collectText(child, into);
    }
  }

  return into;
}

function resumeFields(resume: ResumeData): [string, unknown][] {
  const printed = getResumeExportDocument(resume);

  return [
    ["Name", printed.name],
    ["Headline", printed.headline],
    ["Contact details", printed.contact.map((item) => item.label)],
    // Only what the PDF prints: an icon-only link draws no text.
    ["Links", resume.links.displayMode === "icon" ? [] : printed.links.map((link) => link.text)],
    ...printed.sections.map((section): [string, unknown] => [
      section.title || "Section",
      [section.title, section.children],
    ]),
  ];
}

function coverLetterFields(content: CoverLetterContent): [string, unknown][] {
  const state = getCoverLetterState(content);

  return [
    ["Name", state.senderName],
    ["Title", state.senderTitle],
    ["Contact details", state.contact],
    [
      "Links",
      state.linkDisplayMode === "icon"
        ? []
        : state.renderedLinks.map((link) => getLinkDisplayText(link, state.linkDisplayMode)),
    ],
    ["Date", state.date],
    ["Recipient", state.recipient],
    ["Subject", [state.subject, state.targetTitle, state.targetCompany]],
    ["Greeting", state.flow.greeting],
    ["Opening", state.flow.opening],
    ["Body", state.flow.body],
    ["Highlights", state.flow.highlights],
    ["Closing", state.flow.closing],
    ["Signature", state.flow.signature],
    ["Postscript", state.flow.postscript],
  ];
}

/** Every printed field and the family it is drawn in. */
function printedFields(document: PrintedDocument): [[string, unknown][], string] {
  return document.type === "RESUME"
    ? [
        resumeFields(document.content as ResumeData),
        getResumeRenderStyle(document.content as ResumeData).fontFamily,
      ]
    : [
        coverLetterFields(document.content as CoverLetterContent),
        getCoverLetterState(document.content as CoverLetterContent).appearance.fontFamily,
      ];
}

/**
 * Whether the PDF needs the last-resort family (`PDF_LAST_RESORT_FONT_ID`): some printed
 * character the chosen family and its fallbacks lack, and it has.
 */
export function needsLastResortPdfFont(document: PrintedDocument): boolean {
  const [fields, fontFamily] = printedFields(document);
  const stack = getPdfFontStack(fontFamily).map(coveredBy);
  const lastResort = coveredBy(FONT_REGISTRY[PDF_LAST_RESORT_FONT_ID].primaryFamily);

  for (const [, value] of fields) {
    for (const character of collectText(value).join(" ")) {
      if (
        !INKLESS.test(character) &&
        !canDraw(character, stack) &&
        canDraw(character, [lastResort])
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * What the PDF of this document would leave blank, field by field, read from the same
 * sources every exporter prints from (`getResumeExportDocument`, `getCoverLetterState`), so
 * a hidden section never raises a warning.
 */
export function findTextPdfCannotDraw(document: PrintedDocument): UndrawablePdfText[] {
  const [fields, fontFamily] = printedFields(document);
  const found = new Map<string, Set<string>>();

  for (const [field, value] of fields) {
    const characters = findUndrawableCharacters(collectText(value).join(" "), fontFamily);
    if (characters.length === 0) continue;

    const known = found.get(field) ?? new Set<string>();
    characters.forEach((character) => known.add(character));
    found.set(field, known);
  }

  return [...found].map(([field, characters]) => ({ field, characters: [...characters] }));
}

/** At most this many characters are quoted per field; a whole paragraph of them is noise. */
const QUOTED_PER_FIELD = 12;

export function describeUndrawablePdfText(found: UndrawablePdfText[]): string {
  const list = found
    .map(({ field, characters }) => {
      const quoted = characters.slice(0, QUOTED_PER_FIELD).join(" ");
      const more = characters.length > QUOTED_PER_FIELD ? " …" : "";

      return `${field} (${quoted}${more})`;
    })
    .join(", ");

  return `These characters will be blank in the PDF: ${list}. Use DOCX or HTML, or remove them.`;
}
