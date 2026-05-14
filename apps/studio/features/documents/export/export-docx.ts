import type { ResumeData } from "@/types/resume";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import {
  safeText,
  formatDateRange,
  isSectionVisible,
  getVisibleSectionMap,
  getResumeFileBaseName,
} from "@/features/resume/services/resume-formatters";
import { downloadBlob } from "./download";

function createDocxParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}

async function buildDocx(resume: ResumeData): Promise<Blob> {
  const visibleSections = getVisibleSectionMap(resume);
  const children: Paragraph[] = [];

  const fullName = safeText(resume.basics.fullName) || "Your Name";
  const role = safeText(resume.basics.role);

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
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun(
              `${safeText(item.role) || "Role"} - ${safeText(item.company) || "Company"}`,
            ),
          ],
        }),
        createDocxParagraph(
          [formatDateRange(item.startDate, item.endDate, item.current), safeText(item.location)]
            .filter(Boolean)
            .join(" | "),
        ),
      );

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
      const degree = `${safeText(item.degree) || "Degree"}${safeText(item.field) ? `, ${safeText(item.field)}` : ""}`;

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(degree)],
        }),
        createDocxParagraph(
          `${safeText(item.school) || "School"} | ${formatDateRange(item.startDate, item.endDate, item.current)}`,
        ),
      );

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
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun(
              `${safeText(item.name) || "Project"}${safeText(item.role) ? ` (${safeText(item.role)})` : ""}`,
            ),
          ],
        }),
      );

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

      children.push(createDocxParagraph(`${safeText(group.name) || "Skills"}: ${keywords}`));
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
      const label = safeText(item.label) || safeText(item.type) || "Link";
      const url = safeText(item.url);

      if (!url) {
        return;
      }

      children.push(createDocxParagraph(`${label}: ${url}`));
    });
  }

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
  const blob = await buildDocx(resume);
  downloadBlob(blob, `${getResumeFileBaseName(resume)}.docx`);
}
