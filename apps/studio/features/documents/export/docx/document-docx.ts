import { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";
import {
  getLinkDisplayText,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import {
  buildProfessionalFlowItems,
  getCoverLetterDocumentTitle,
  getCoverLetterState,
} from "@/templates/cover-letter/shared";

import { downloadBlob } from "../download";
import { createDocxParagraph, docxPageProperties } from "./docx-paragraph";
import { getDocumentFileBaseName } from "../export-file-names";

function bullet(text: string): Paragraph {
  return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] });
}

/**
 * The Word copy of a letter, built from the same render state as the preview and the PDF:
 * hidden sections (the letter and its signature included) are absent, empty fields print
 * nothing, and the body is the template flow, in the same order.
 */
export function buildCoverLetterDocx(content: CoverLetterContent): Promise<Blob> {
  const state = getCoverLetterState(content);
  const children: Paragraph[] = [];

  if (state.senderName) {
    children.push(
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(state.senderName)] }),
    );
  }

  const contact = [state.senderTitle, ...state.contact].filter(Boolean).join(" | ");

  if (contact) children.push(createDocxParagraph(contact));

  state.renderedLinks.forEach((link) =>
    children.push(
      new Paragraph({
        children: [
          new ExternalHyperlink({
            link: normalizeLinkHref(link.url),
            children: [
              new TextRun({
                text: getLinkDisplayText(link, state.linkDisplayMode),
                style: "Hyperlink",
              }),
            ],
          }),
        ],
      }),
    ),
  );

  if (state.date) children.push(createDocxParagraph(state.date));
  state.recipient.forEach((line) => children.push(createDocxParagraph(line)));
  if (state.subject) children.push(createDocxParagraph(`Subject: ${state.subject}`));

  for (const item of buildProfessionalFlowItems(state.flow)) {
    if (item.type === "body-list" || item.type === "proof-list") {
      item.items.forEach((line) => children.push(bullet(line)));
      continue;
    }

    children.push(createDocxParagraph(item.text));
  }

  return Packer.toBlob(
    new Document({
      title: getCoverLetterDocumentTitle(state),
      creator: state.senderName || "VeriWorkly",
      sections: [{ properties: docxPageProperties(state.appearance.paperSize), children }],
    }),
  );
}

export async function exportCoverLetterAsDocx(document: BaseDocument): Promise<void> {
  const content = document.content as CoverLetterContent;
  const blob = await buildCoverLetterDocx(content);
  downloadBlob(blob, `${getDocumentFileBaseName(document)}.docx`);
}
