import type { ResumeData } from "@/types/resume";

import {
  safeText,
  escapeHtml,
  formatDateRange,
  isSectionVisible,
  getVisibleSectionMap,
  getResumeFileBaseName,
  joinTruthy,
} from "@/features/resume/services/resume-formatters";
import { normalizeLinkHref } from "@/features/documents/rendering/resume-rendering";
import { getResumeAdditionalBlocks } from "@/features/documents/rendering/resume-render-items";

import { downloadBlob } from "./download";
import { EXPORT_EXCLUDE_ATTRIBUTE, EXPORT_ROOT_ATTRIBUTE } from "./export-dom-markers";

function getComputedStyleText(style: CSSStyleDeclaration): string {
  const declarations: string[] = [];

  for (let index = 0; index < style.length; index += 1) {
    const propertyName = style.item(index);
    const propertyValue = style.getPropertyValue(propertyName);

    if (!propertyValue) {
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
 * fallback to the first element child is what this function used to do unconditionally —
 * it is kept only for preview shells that carry no marker, and it is why the hidden-node
 * pruning above exists as a second line of defence.
 */
function findExportSourceNode(container: HTMLElement): HTMLElement {
  const markedRoot = container.querySelector<HTMLElement>(`[${EXPORT_ROOT_ATTRIBUTE}]`);

  if (markedRoot) {
    return markedRoot;
  }

  return (container.firstElementChild as HTMLElement | null) ?? container;
}

function buildHtml(resume: ResumeData): string {
  const visibleSections = getVisibleSectionMap(resume);

  const summary = escapeHtml(safeText(resume.summary));
  const role = escapeHtml(safeText(resume.basics.role));
  const name = escapeHtml(safeText(resume.basics.fullName) || "Your Name");

  const contact = [
    safeText(resume.basics.email),
    safeText(resume.basics.phone),
    safeText(resume.basics.location),
  ]
    .filter(Boolean)
    .map((value) => `<span>${escapeHtml(value)}</span>`)
    .join('<span class="dot">•</span>');

  const experience = isSectionVisible(visibleSections, "experience")
    ? resume.experience
        .map((item) => {
          const highlights = item.highlights
            .map((highlight) => safeText(highlight))
            .filter(Boolean)
            .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
            .join("");

          const heading = joinTruthy([item.role, item.company], " · ");
          const dateRange = formatDateRange(item.startDate, item.endDate, item.current);
          const meta = joinTruthy([dateRange, item.location], " · ");

          return `
          <article>
            ${heading ? `<h3>${escapeHtml(heading)}</h3>` : ""}
            ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
            ${safeText(item.summary) ? `<p>${escapeHtml(safeText(item.summary))}</p>` : ""}
            ${highlights ? `<ul>${highlights}</ul>` : ""}
          </article>`;
        })
        .join("")
    : "";

  const education = isSectionVisible(visibleSections, "education")
    ? resume.education
        .map((item) => {
          const degree = joinTruthy([item.degree, item.field], ", ");
          const dateRange = formatDateRange(item.startDate, item.endDate, item.current);
          const meta = joinTruthy([item.school, dateRange], " · ");

          return `
          <article>
            ${degree ? `<h3>${escapeHtml(degree)}</h3>` : ""}
            ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
            ${safeText(item.summary) ? `<p>${escapeHtml(safeText(item.summary))}</p>` : ""}
          </article>`;
        })
        .join("")
    : "";

  const projects = isSectionVisible(visibleSections, "projects")
    ? resume.projects
        .map((item) => {
          const highlights = item.highlights
            .map((highlight) => safeText(highlight))
            .filter(Boolean)
            .map((highlight) => `<li>${escapeHtml(highlight)}</li>`)
            .join("");
          const name = safeText(item.name);
          const linkHref = safeText(item.link) ? escapeHtml(normalizeLinkHref(item.link)) : "";

          return `
          <article>
            ${name || item.role ? `<h3>${escapeHtml(name)}${safeText(item.role) ? ` <span class="sub">(${escapeHtml(safeText(item.role))})</span>` : ""}</h3>` : ""}
            ${linkHref ? `<p><a href="${linkHref}">${escapeHtml(safeText(item.link))}</a></p>` : ""}
            ${safeText(item.summary) ? `<p>${escapeHtml(safeText(item.summary))}</p>` : ""}
            ${highlights ? `<ul>${highlights}</ul>` : ""}
          </article>`;
        })
        .join("")
    : "";

  const skills = isSectionVisible(visibleSections, "skills")
    ? resume.skills
        .map((group) => {
          const keywords = group.keywords
            .map((keyword) => safeText(keyword))
            .filter(Boolean)
            .join(", ");

          if (!keywords) {
            return "";
          }

          const name = safeText(group.name);
          return `<li>${name ? `<strong>${escapeHtml(name)}</strong>: ` : ""}${escapeHtml(keywords)}</li>`;
        })
        .filter(Boolean)
        .join("")
    : "";

  const links = isSectionVisible(visibleSections, "links")
    ? resume.links.items
        .map((link) => {
          const url = safeText(link.url);

          if (!url) {
            return "";
          }

          const label = escapeHtml(safeText(link.label) || safeText(link.type) || url);
          const safeUrl = escapeHtml(normalizeLinkHref(url));
          return `<li><a href="${safeUrl}">${label}</a></li>`;
        })
        .filter(Boolean)
        .join("")
    : "";

  /*
   * Every optional section — the eight typed ones and any number of custom ones — through
   * the same resolver the preview and the PDF use, rather than iterating
   * `resume.customSections` behind the single "custom" toggle.
   */
  const customSections = getResumeAdditionalBlocks(resume)
    .map((block) => {
      const items = block.items
        .map((item) => {
          const bullets = item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
          const meta = joinTruthy([item.subtitle, item.link?.text, item.meta], " · ");

          return `
              <article>
                ${item.title ? `<h3>${escapeHtml(item.title)}</h3>` : ""}
                ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
                ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
                ${bullets ? `<ul>${bullets}</ul>` : ""}
              </article>`;
        })
        .join("");

      if (!items) return "";

      return `<section>${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ""}${items}</section>`;
    })
    .filter(Boolean)
    .join("");

  return `<!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>${name} - Resume</title>
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
                .meta { color: #4b5563; font-size: 0.95rem; }
                .lead { font-size: 1.05rem; color: #374151; }
                .contact { color: #4b5563; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
                .dot { opacity: 0.5; }
                .sub { color: #4b5563; font-weight: 500; }
                a { color: #0f4dbf; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <main>
                <header>
                  <h1>${name}</h1>
                  ${role ? `<p class="lead">${role}</p>` : ""}
                  ${contact ? `<div class="contact">${contact}</div>` : ""}
                </header>
                ${isSectionVisible(visibleSections, "summary") && summary ? `<section><h2>Summary</h2><p>${summary}</p></section>` : ""}
                ${experience ? `<section><h2>Experience</h2>${experience}</section>` : ""}
                ${education ? `<section><h2>Education</h2>${education}</section>` : ""}
                ${projects ? `<section><h2>Projects</h2>${projects}</section>` : ""}
                ${skills ? `<section><h2>Skills</h2><ul>${skills}</ul></section>` : ""}
                ${links ? `<section><h2>Links</h2><ul>${links}</ul></section>` : ""}
                ${customSections}
              </main>
            </body>
            </html>`;
}

function buildRenderedHtmlDocument(targetId: string, resume: ResumeData): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const printableNode = document.getElementById(targetId);

  if (!printableNode) {
    return null;
  }

  const sourceNode = findExportSourceNode(printableNode);
  const clonedResume = sourceNode.cloneNode(true) as HTMLElement;
  const sourceRect = sourceNode.getBoundingClientRect();

  inlineComputedStyles(sourceNode, clonedResume);

  clonedResume.style.margin = "0 auto";
  clonedResume.style.width = `${Math.ceil(sourceRect.width)}px`;
  clonedResume.style.maxWidth = "100%";
  clonedResume.style.boxSizing = "border-box";

  const bodyStyle = window.getComputedStyle(document.body);

  const title = `${escapeHtml(safeText(resume.basics.fullName) || "Resume")} - Resume`;

  return `<!doctype html>
            <html lang="en" dir="${escapeHtml(document.documentElement.dir || "ltr")}">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>${title}</title>
              <style>
                :root {
                  color-scheme: light;
                }
                body {
                  margin: 0;
                  padding: 24px 16px;
                  background: ${bodyStyle.backgroundColor || "#f6f7fb"};
                  display: flex;
                  justify-content: center;
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
 * Both toolbars now reach this only through `exportDocumentByType`, which forwards the
 * caller's `previewElementId` — see `resume-exporters.tsx`. The choice of branch is made
 * there, once, rather than by which of two parallel export paths happened to run.
 */
export function exportResumeAsHtml(resume: ResumeData, targetId?: string): void {
  const html = targetId ? buildRenderedHtmlDocument(targetId, resume) : buildHtml(resume);
  const outputHtml = html ?? buildHtml(resume);

  const blob = new Blob([outputHtml], { type: "text/html;charset=utf-8" });

  downloadBlob(blob, `${getResumeFileBaseName(resume)}.html`);
}
