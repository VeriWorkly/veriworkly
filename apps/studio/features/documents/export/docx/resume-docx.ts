import type { ResumeData } from "@/types/resume";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import {
  safeText,
  formatDateRange,
  isSectionVisible,
  getVisibleSectionMap,
  getResumeFileBaseName,
  joinTruthy,
} from "@/features/resume/services/resume-formatters";

import { getResumeAdditionalBlocks } from "@/features/documents/rendering/resume-render-items";

import { downloadBlob } from "../download";
import { createDocxParagraph } from "./docx-paragraph";

async function buildResumeDocx(resume: ResumeData): Promise<Blob> {
  const children: Paragraph[] = [];

  const visibleSections = getVisibleSectionMap(resume);

  const role = safeText(resume.basics.role);
  const fullName = safeText(resume.basics.fullName) || "Your Name";

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(fullName)],
    }),
  );

  if (role) {
    children.push(createDocxParagraph(role));
  }

  const contactLine = [
    safeText(resume.basics.email),
    safeText(resume.basics.phone),
    safeText(resume.basics.location),
  ]
    .filter(Boolean)
    .join(" | ");

  if (contactLine) {
    children.push(createDocxParagraph(contactLine));
  }

  if (isSectionVisible(visibleSections, "summary") && safeText(resume.summary)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Summary")],
      }),
      createDocxParagraph(safeText(resume.summary)),
    );
  }

  if (isSectionVisible(visibleSections, "experience") && resume.experience.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Experience")],
      }),
    );

    resume.experience.forEach((item) => {
      const heading = joinTruthy([item.role, item.company], " - ");
      const dateRange = formatDateRange(item.startDate, item.endDate, item.current);
      const meta = joinTruthy([dateRange, item.location], " | ");

      if (heading) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(heading)],
          }),
        );
      }

      if (meta) {
        children.push(createDocxParagraph(meta));
      }

      if (safeText(item.summary)) {
        children.push(createDocxParagraph(safeText(item.summary)));
      }

      item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .forEach((highlight) => {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun(highlight)],
            }),
          );
        });
    });
  }

  if (isSectionVisible(visibleSections, "education") && resume.education.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Education")],
      }),
    );

    resume.education.forEach((item) => {
      const degree = joinTruthy([item.degree, item.field], ", ");
      const dateRange = formatDateRange(item.startDate, item.endDate, item.current);
      const meta = joinTruthy([item.school, dateRange], " | ");

      if (degree) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(degree)],
          }),
        );
      }

      if (meta) {
        children.push(createDocxParagraph(meta));
      }

      if (safeText(item.summary)) {
        children.push(createDocxParagraph(safeText(item.summary)));
      }
    });
  }

  if (isSectionVisible(visibleSections, "projects") && resume.projects.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Projects")],
      }),
    );

    resume.projects.forEach((item) => {
      const name = safeText(item.name);
      const heading = name
        ? `${name}${safeText(item.role) ? ` (${safeText(item.role)})` : ""}`
        : safeText(item.role);

      if (heading) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(heading)],
          }),
        );
      }

      if (safeText(item.link)) {
        children.push(createDocxParagraph(safeText(item.link)));
      }

      if (safeText(item.summary)) {
        children.push(createDocxParagraph(safeText(item.summary)));
      }

      item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .forEach((highlight) => {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun(highlight)],
            }),
          );
        });
    });
  }

  if (isSectionVisible(visibleSections, "skills") && resume.skills.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Skills")],
      }),
    );

    resume.skills.forEach((group) => {
      const keywords = group.keywords
        .map((keyword) => safeText(keyword))
        .filter(Boolean)
        .join(", ");

      if (!keywords) {
        return;
      }

      const name = safeText(group.name);
      children.push(createDocxParagraph(name ? `${name}: ${keywords}` : keywords));
    });
  }

  if (isSectionVisible(visibleSections, "links") && resume.links.items.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Links")],
      }),
    );

    resume.links.items.forEach((item) => {
      const url = safeText(item.url);

      if (!url) {
        return;
      }

      const label = safeText(item.label) || safeText(item.type) || url;
      children.push(createDocxParagraph(`${label}: ${url}`));
    });
  }

  /*
   * Every optional section — the eight typed ones and any number of custom ones — through
   * the same resolver the preview and the PDF use. This used to iterate
   * `resume.customSections` directly and gate all of it behind the single "custom" toggle,
   * which after the typed model would have dropped certifications, awards, languages and
   * the rest from every exported document.
   */
  getResumeAdditionalBlocks(resume).forEach((block) => {
    const itemParagraphs: Paragraph[] = [];

    block.items.forEach((item) => {
      const meta = joinTruthy([item.subtitle, item.link?.text, item.meta], " | ");

      if (item.title) {
        itemParagraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(item.title)],
          }),
        );
      }

      if (meta) itemParagraphs.push(createDocxParagraph(meta));
      if (item.summary) itemParagraphs.push(createDocxParagraph(item.summary));

      item.bullets.forEach((bullet) => {
        itemParagraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(bullet)],
          }),
        );
      });
    });

    if (itemParagraphs.length === 0) return;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(block.title || "Additional Information")],
      }),
      ...itemParagraphs,
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function exportResumeAsDocx(resume: ResumeData): Promise<void> {
  const blob = await buildResumeDocx(resume);
  downloadBlob(blob, `${getResumeFileBaseName(resume)}.docx`);
}
