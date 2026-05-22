import { Paragraph, TextRun } from "docx";

export function createDocxParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}
