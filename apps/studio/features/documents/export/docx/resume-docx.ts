import type { ResumeData } from "@/types/resume";
import type { ResumeExportContent, ResumeExportLink } from "../resume-export-document";

import { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import { getResumeFileBaseName } from "@/features/resume/services/resume-formatters";

import { downloadBlob } from "../download";
import { getResumeExportDocument } from "../resume-export-document";
import { createDocxParagraph, docxPageProperties } from "./docx-paragraph";

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

function hyperlink(link: ResumeExportLink): ExternalHyperlink {
  return new ExternalHyperlink({
    link: link.href,
    children: [new TextRun({ text: link.text, style: "Hyperlink" })],
  });
}

/** Runs separated by " | ", the way the preview separates contact details and links. */
function joinedParagraph(parts: Array<TextRun | ExternalHyperlink>): Paragraph {
  return new Paragraph({
    children: parts.flatMap((part, index) => (index > 0 ? [new TextRun(" | "), part] : [part])),
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });
}

function contentParagraphs(content: ResumeExportContent): Paragraph[] {
  switch (content.kind) {
    case "summary":
      return [createDocxParagraph(content.text)];
    case "skills":
      return content.lines.map(
        (line) =>
          new Paragraph({
            children: [
              ...(line.label ? [new TextRun({ text: `${line.label}: `, bold: true })] : []),
              new TextRun(line.value),
            ],
          }),
      );
    case "items":
      return content.items.flatMap((item) => [
        ...(item.title ? [heading(item.title, HeadingLevel.HEADING_2)] : []),
        ...(item.subtitle ? [createDocxParagraph(item.subtitle)] : []),
        ...(item.meta ? [createDocxParagraph(item.meta)] : []),
        ...(item.link ? [new Paragraph({ children: [hyperlink(item.link)] })] : []),
        ...(item.summary ? [createDocxParagraph(item.summary)] : []),
        ...item.bullets.map(bullet),
      ]);
  }
}

/** The DOCX export as a file, for download or for reading back (see template-ats.contract). */
export async function buildResumeDocx(resume: ResumeData): Promise<Blob> {
  const document = getResumeExportDocument(resume);
  const children: Paragraph[] = [];

  if (document.name) children.push(heading(document.name, HeadingLevel.TITLE));
  if (document.headline) children.push(createDocxParagraph(document.headline));
  if (document.contact.length > 0) {
    children.push(joinedParagraph(document.contact.map((item) => new TextRun(item.label))));
  }
  if (document.links.length > 0) children.push(joinedParagraph(document.links.map(hyperlink)));

  for (const section of document.sections) {
    if (section.title) children.push(heading(section.title, HeadingLevel.HEADING_1));
    children.push(...contentParagraphs(section.children));
  }

  return Packer.toBlob(
    new Document({
      title: document.name ? `${document.name} - Resume` : "Resume",
      creator: document.name || "VeriWorkly",
      sections: [{ properties: docxPageProperties(resume.customization?.paperSize), children }],
    }),
  );
}

export async function exportResumeAsDocx(resume: ResumeData): Promise<void> {
  const blob = await buildResumeDocx(resume);
  downloadBlob(blob, `${getResumeFileBaseName(resume)}.docx`);
}
