import type { ResumeData } from "@/types/resume";
import type { ResumeExportContent, ResumeExportLink } from "./resume-export-document";

import { getResumeFileBaseName } from "@/features/resume/services/resume-formatters";

import { downloadBlob } from "./download";
import { getSkillLineText } from "@/features/documents/rendering/resume-render-items";

import { getResumeExportDocument } from "./resume-export-document";

/** The text a reader sees, then where it goes — unless the text already is the address. */
function linkText(link: ResumeExportLink): string {
  return link.href.includes(link.text) ? link.href : `${link.text}: ${link.href}`;
}

function contentLines(content: ResumeExportContent): string[] {
  switch (content.kind) {
    case "summary":
      return [content.text];
    case "skills":
      return content.lines.map(getSkillLineText);
    case "items":
      return content.items.flatMap((item, index) => [
        ...(index > 0 ? [""] : []),
        ...(item.title ? [item.title] : []),
        ...(item.subtitle ? [item.subtitle] : []),
        ...(item.meta ? [item.meta] : []),
        ...(item.link ? [linkText(item.link)] : []),
        ...(item.summary ? [item.summary] : []),
        ...item.bullets.map((bullet) => `- ${bullet}`),
      ]);
  }
}

/**
 * Plain text built from the data, never derived from the Markdown: stripping escaped
 * Markdown left `\-` in dates and deleted every `_` from emails and URLs.
 */
export function buildText(resume: ResumeData): string {
  const document = getResumeExportDocument(resume);
  const blocks: string[] = [];

  const header = [
    document.name,
    document.headline,
    document.contact.map((item) => item.label).join(" | "),
    document.links.map(linkText).join(" | "),
  ].filter(Boolean);

  if (header.length > 0) blocks.push(header.join("\n"));

  for (const section of document.sections) {
    blocks.push(
      [
        ...(section.title ? [section.title.toUpperCase()] : []),
        ...contentLines(section.children),
      ].join("\n"),
    );
  }

  return `${blocks.join("\n\n")}\n`;
}

export function exportResumeAsText(resume: ResumeData): void {
  const text = buildText(resume);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${getResumeFileBaseName(resume)}.txt`);
}
