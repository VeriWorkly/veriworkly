import { Paragraph, TextRun, type ISectionPropertiesOptions } from "docx";

import { getPageGeometry, type PaperSize } from "@/templates/shared/page-geometry";

/** The section's page in the document's paper size; Word's default page is A4. */
export function docxPageProperties(paperSize: PaperSize | undefined): ISectionPropertiesOptions {
  const page = getPageGeometry(paperSize);

  return { page: { size: { width: page.widthTwip, height: page.heightTwip } } };
}

/**
 * `TextRun` does not convert embedded newlines into visual line breaks — Word would
 * otherwise render a multi-line summary/highlight as one run-on line. Each `\n` is
 * turned into an explicit run break instead.
 */
export function createDocxParagraph(text: string): Paragraph {
  const lines = text.split("\n");

  const children = lines.flatMap((line, index) =>
    index === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })],
  );

  return new Paragraph({ children });
}
