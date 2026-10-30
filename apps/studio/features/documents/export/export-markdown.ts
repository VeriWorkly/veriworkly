import type { ResumeData } from "@/types/resume";
import type { ResumeExportContent } from "./resume-export-document";

import { getResumeFileBaseName } from "@/features/resume/services/resume-formatters";

import { downloadBlob } from "./download";
import { getResumeExportDocument } from "./resume-export-document";

/**
 * Escapes Markdown metacharacters in free-form user text so it can't alter formatting.
 * `parseResumeMarkdown` reverses it.
 */
function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1");
}

function markdownLink(text: string, href: string): string {
  const destination = href
    .replaceAll("(", "%28")
    .replaceAll(")", "%29")
    .replace(/\s/g, "%20")
    // A "%" that starts no escape would not survive being read back as a URL.
    .replace(/%(?![\dA-Fa-f]{2})/g, "%25");

  return `[${escapeMarkdown(text)}](${destination})`;
}

function contentLines(content: ResumeExportContent): string[] {
  switch (content.kind) {
    case "summary":
      return [escapeMarkdown(content.text)];
    case "skills":
      return content.lines.map(
        (line) =>
          `- ${line.label ? `**${escapeMarkdown(line.label)}:** ` : ""}${escapeMarkdown(line.value)}`,
      );
    case "items":
      // One blank line between items, none inside one: that is what tells them apart.
      return content.items.flatMap((item, index) => [
        ...(index > 0 ? [""] : []),
        ...(item.title ? [`### ${escapeMarkdown(item.title)}`] : []),
        // Bold, as the preview sets it, and so an import can tell it from the summary.
        ...(item.subtitle ? [`**${escapeMarkdown(item.subtitle)}**`] : []),
        ...(item.meta ? [`_${escapeMarkdown(item.meta)}_`] : []),
        ...(item.link ? [markdownLink(item.link.text, item.link.href)] : []),
        ...(item.summary ? [escapeMarkdown(item.summary.replace(/\n{2,}/g, "\n"))] : []),
        ...item.bullets.map((bullet) => `- ${escapeMarkdown(bullet)}`),
      ]);
  }
}

function buildMarkdown(resume: ResumeData): string {
  const document = getResumeExportDocument(resume);
  const blocks: string[] = [];

  if (document.name) blocks.push(`# ${escapeMarkdown(document.name)}`);
  if (document.headline) blocks.push(escapeMarkdown(document.headline));
  if (document.contact.length > 0) {
    const contact = document.contact.map((item) => escapeMarkdown(item.label)).join(" | ");
    // One item without an "@" reads as a headline; a trailing separator marks it as contact
    // for the import (S-412). A "|" in a label is escaped, so the marker cannot be text.
    const lone = document.contact.length === 1 && !document.contact[0].label.includes("@");

    blocks.push(lone ? `${contact} |` : contact);
  }
  if (document.links.length > 0) {
    blocks.push(document.links.map((link) => markdownLink(link.text, link.href)).join(" | "));
  }

  for (const section of document.sections) {
    const lines = contentLines(section.children);

    blocks.push(
      [...(section.title ? [`## ${escapeMarkdown(section.title)}`, ""] : []), ...lines].join("\n"),
    );
  }

  return `${blocks.join("\n\n")}\n`;
}

export function exportResumeAsMarkdown(resume: ResumeData): void {
  const markdown = buildMarkdown(resume);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });

  downloadBlob(blob, `${getResumeFileBaseName(resume)}.md`);
}

export { buildMarkdown };
