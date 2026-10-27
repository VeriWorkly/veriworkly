import type { ResumeData } from "@/types/resume";
import type { ResumeExportContent, ResumeExportLink } from "./resume-export-document";

import { escapeHtml, getResumeFileBaseName } from "@/features/resume/services/resume-formatters";
import { getResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import { getPdfFontEntries } from "@/features/documents/constants/fonts";
import { documentDirection, toDocumentLanguage } from "@/features/documents/utils/formatters";
import {
  RESUME_PAGE_HEIGHT_PX,
  RESUME_PAGE_WIDTH_PX,
} from "@/features/resume/constants/resume-layout";

import { downloadBlob } from "./download";
import { EXPORT_EXCLUDE_ATTRIBUTE, EXPORT_ROOT_ATTRIBUTE } from "./export-dom-markers";
import { getResumeExportDocument } from "./resume-export-document";

/**
 * Print behaviour the exported page's own stylesheet decides. Inlined, the screen's
 * computed values (`break-after: auto`, `print-color-adjust: economy`) would outrank it.
 */
const PRINT_PROPERTY = /^(-webkit-)?(print-color-adjust|break-|page-break-)/;

function getComputedStyleText(style: CSSStyleDeclaration): string {
  const declarations: string[] = [];

  for (let index = 0; index < style.length; index += 1) {
    const propertyName = style.item(index);
    const propertyValue = style.getPropertyValue(propertyName);

    if (!propertyValue || PRINT_PROPERTY.test(propertyName)) {
      continue;
    }

    const priority = style.getPropertyPriority(propertyName);
    declarations.push(`${propertyName}: ${propertyValue}${priority ? ` !${priority}` : ""};`);
  }

  return declarations.join(" ");
}

/**
 * True for an element the user cannot see on screen.
 *
 * `cssText` is copied wholesale, so an invisible node does not merely survive the clone —
 * it arrives in the exported file carrying the very declarations that hid it
 * (`position: absolute; left: -10000px; opacity: 0`). It renders as nothing and reads as a
 * full duplicate of the document to any parser.
 *
 * Deliberately not "drop every `[aria-hidden]` node": resume templates mark their
 * decorative separators `aria-hidden` (see `templates/resume/shared/web.tsx`) and those are
 * visible, so removing them would change how the export looks.
 */
function isVisuallyHidden(element: Element): boolean {
  if (element.hasAttribute(EXPORT_EXCLUDE_ATTRIBUTE)) {
    return true;
  }

  const style = window.getComputedStyle(element);

  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number.parseFloat(style.opacity || "1") === 0
  );
}

function inlineComputedStyles(source: Element, clone: Element): void {
  const sourceStyle = window.getComputedStyle(source);
  const clonedElement = clone as HTMLElement;

  clonedElement.style.cssText = getComputedStyleText(sourceStyle);

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);

  // Collected and applied after the walk: removing mid-loop would desync the parallel
  // source/clone indices this function relies on.
  const hiddenClones: Element[] = [];

  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index];
    const cloneChild = cloneChildren[index];

    if (!sourceChild || !cloneChild) {
      continue;
    }

    if (isVisuallyHidden(sourceChild)) {
      hiddenClones.push(cloneChild);
      continue;
    }

    inlineComputedStyles(sourceChild, cloneChild);
  }

  for (const hiddenClone of hiddenClones) {
    hiddenClone.remove();
  }
}

/**
 * The subtree to export out of the preview stage.
 *
 * Prefers the element the preview explicitly marks as holding the visible pages. The
 * fallback to the first element child is for preview shells that carry no marker, and it is
 * why the hidden-node pruning above exists as a second line of defence.
 */
function findExportSourceNode(container: HTMLElement): HTMLElement {
  const markedRoot = container.querySelector<HTMLElement>(`[${EXPORT_ROOT_ATTRIBUTE}]`);

  if (markedRoot) {
    return markedRoot;
  }

  return (container.firstElementChild as HTMLElement | null) ?? container;
}

function htmlLink(link: ResumeExportLink): string {
  return `<a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a>`;
}

/** Keeps the line breaks a user typed into a paragraph. */
function htmlParagraph(text: string, className?: string): string {
  const lines = text.split("\n").map(escapeHtml).join("<br />");

  return className ? `<p class="${className}">${lines}</p>` : `<p>${lines}</p>`;
}

function contentHtml(content: ResumeExportContent): string {
  switch (content.kind) {
    case "summary":
      return htmlParagraph(content.text);
    case "skills":
      return `<ul>${content.lines
        .map(
          (line) =>
            `<li>${line.label ? `<strong>${escapeHtml(line.label)}</strong>: ` : ""}${escapeHtml(line.value)}</li>`,
        )
        .join("")}</ul>`;
    case "items":
      return content.items
        .map((item) =>
          [
            "<article>",
            item.title ? `<h3>${escapeHtml(item.title)}</h3>` : "",
            item.subtitle ? htmlParagraph(item.subtitle, "sub") : "",
            item.meta ? htmlParagraph(item.meta, "meta") : "",
            item.link ? `<p>${htmlLink(item.link)}</p>` : "",
            item.summary ? htmlParagraph(item.summary) : "",
            item.bullets.length > 0
              ? `<ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
              : "",
            "</article>",
          ].join(""),
        )
        .join("");
  }
}

/**
 * A self-contained document generated from the resume, for surfaces with no rendered preview
 * to capture. Every value is escaped: it is user text going into markup.
 */
export function buildHtml(resume: ResumeData): string {
  const document = getResumeExportDocument(resume);
  const title = document.name ? `${escapeHtml(document.name)} - Resume` : "Resume";

  const header = [
    document.name ? `<h1>${escapeHtml(document.name)}</h1>` : "",
    document.headline ? htmlParagraph(document.headline, "lead") : "",
    document.contact.length > 0
      ? `<div class="contact">${document.contact
          .map((item) =>
            item.href
              ? htmlLink({ text: item.label, href: item.href })
              : `<span>${escapeHtml(item.label)}</span>`,
          )
          .join('<span class="dot">•</span>')}</div>`
      : "",
    document.links.length > 0
      ? `<div class="contact">${document.links.map(htmlLink).join('<span class="dot">•</span>')}</div>`
      : "",
  ].join("");

  const sections = document.sections
    .map(
      (section) =>
        `<section>${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}${contentHtml(section.children)}</section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="${toDocumentLanguage(resume.language)}" dir="${documentDirection(resume.language)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 40px 20px; font-family: "Segoe UI", Arial, sans-serif; background: #f6f7fb; color: #111827; }
    main { max-width: 880px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 2rem; line-height: 1.1; }
    h2 { margin: 32px 0 12px; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: #374151; }
    h3 { margin: 0 0 6px; font-size: 1rem; }
    p { margin: 0 0 10px; line-height: 1.55; }
    article { margin-bottom: 18px; }
    ul { margin: 0 0 10px 20px; padding: 0; }
    .meta, .sub { color: #4b5563; font-size: 0.95rem; }
    .lead { font-size: 1.05rem; color: #374151; }
    .contact { color: #4b5563; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .dot { opacity: 0.5; }
    a { color: #0f4dbf; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    ${header ? `<header>${header}</header>` : ""}
    ${sections}
  </main>
</body>
</html>`;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read a font file"));
    reader.readAsDataURL(blob);
  });
}

/**
 * The resume's fonts as `@font-face` rules carrying the files themselves, so the exported
 * page renders in them when opened from disk rather than in whatever the system has.
 */
async function buildEmbeddedFontFaces(resume: ResumeData): Promise<string> {
  const fonts = getPdfFontEntries(getResumeRenderStyle(resume).fontFamily);

  const faces = await Promise.all(
    fonts.flatMap((font) =>
      font.pdfFonts.map(async (face) => {
        const response = await fetch(new URL(face.src, window.location.origin));

        if (!response.ok) {
          throw new Error(`Could not load the font ${face.src} (${response.status})`);
        }

        const src = await toDataUrl(await response.blob());

        return `@font-face { font-family: "${font.primaryFamily}"; font-weight: ${face.fontWeight}; font-style: normal; src: url("${src}") format("truetype"); }`;
      }),
    ),
  );

  return faces.join("\n");
}

async function buildRenderedHtmlDocument(targetId: string, resume: ResumeData): Promise<string> {
  const printableNode = document.getElementById(targetId);

  // A silent fallback would hand the user a differently laid-out file than the one they
  // are looking at, under the same "Export → HTML" label.
  if (!printableNode) {
    throw new Error("The resume preview is not on screen, so it cannot be exported as HTML.");
  }

  const sourceNode = findExportSourceNode(printableNode);
  // The layout width, which the editor's zoom (a CSS transform) does not change;
  // `getBoundingClientRect` would hand a 78% zoom a page box 78% as wide as its content.
  const width = sourceNode.offsetWidth;

  // A phone's Content tab hides the preview (`display: none`), leaving nothing laid out to
  // copy; the generated document is the same resume without the template's styling.
  if (width === 0) return buildHtml(resume);

  const clonedResume = sourceNode.cloneNode(true) as HTMLElement;

  inlineComputedStyles(sourceNode, clonedResume);

  clonedResume.style.margin = "0 auto";
  clonedResume.style.width = `${width}px`;
  clonedResume.style.maxWidth = "100%";
  clonedResume.style.boxSizing = "border-box";

  const fontFaces = await buildEmbeddedFontFaces(resume);
  const name = getResumeExportDocument(resume).name;
  const title = name ? `${escapeHtml(name)} - Resume` : "Resume";

  return `<!doctype html>
<html lang="${toDocumentLanguage(resume.language)}" dir="${documentDirection(resume.language)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    ${fontFaces}
    :root {
      color-scheme: light;
    }
    body {
      margin: 0;
      padding: 24px 16px;
      background: #f6f7fb;
      display: flex;
      justify-content: center;
      print-color-adjust: exact;
    }
    /* One preview page per sheet. The clone carries its computed size and gaps inline, hence
       !important: the screen height includes the gaps and would print a blank sheet. */
    @page {
      size: ${RESUME_PAGE_WIDTH_PX}px ${RESUME_PAGE_HEIGHT_PX}px;
      margin: 0;
    }
    @media print {
      body {
        padding: 0;
        background: none;
        display: block;
      }
      [${EXPORT_ROOT_ATTRIBUTE}] {
        row-gap: 0 !important;
        margin: 0 !important;
        width: auto !important;
        height: auto !important;
      }
      [${EXPORT_ROOT_ATTRIBUTE}] > * {
        box-shadow: none !important;
        margin: 0 !important;
        break-after: page;
      }
      [${EXPORT_ROOT_ATTRIBUTE}] > :last-child {
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  ${clonedResume.outerHTML}
</body>
</html>`;
}

/**
 * Two HTML outputs, deliberately kept — this is the settled answer to "is resume HTML
 * export WYSIWYG or template-generated?", and it is: **WYSIWYG whenever a preview exists.**
 *
 * - **With `targetId`**: a WYSIWYG capture of the rendered preview, so the file looks like
 *   the template the user chose. This is the DOM-scrape path above, and it is what the
 *   editor produces — changing it would silently alter "Export → HTML" for every user.
 * - **Without `targetId`**: a self-contained document generated from `ResumeData`, for the
 *   surfaces that have no rendered preview in the DOM to scrape (document list, share page).
 *
 * Both toolbars reach this only through `exportDocumentByType`, which forwards the
 * caller's `previewElementId` — see `resume-exporters.tsx`.
 */
export async function exportResumeAsHtml(resume: ResumeData, targetId?: string): Promise<void> {
  const html = targetId ? await buildRenderedHtmlDocument(targetId, resume) : buildHtml(resume);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });

  downloadBlob(blob, `${getResumeFileBaseName(resume)}.html`);
}
