import type { ResumeData } from "@/types/resume";
import {
  safeText,
  formatDateRange,
  isSectionVisible,
  getVisibleSectionMap,
  getResumeFileBaseName,
} from "@/features/resume/services/resume-formatters";
import { downloadBlob } from "./download";

function toMarkdownSection(title: string, body: string[]): string {
  if (body.length === 0) {
    return "";
  }

  return [`## ${title}`, ...body, ""].join("\n");
}

function buildMarkdown(resume: ResumeData): string {
  const visibleSections = getVisibleSectionMap(resume);
  const parts: string[] = [];

  const name = safeText(resume.basics.fullName) || "Your Name";
  const role = safeText(resume.basics.role);

  parts.push(`# ${name}`);

  if (role) {
    parts.push(`_${role}_`);
  }

  const contact = [
    safeText(resume.basics.email),
    safeText(resume.basics.phone),
    safeText(resume.basics.location),
  ].filter(Boolean);

  if (contact.length > 0) {
    parts.push(contact.join(" | "));
  }

  parts.push("");

  if (isSectionVisible(visibleSections, "summary") && safeText(resume.summary)) {
    parts.push(toMarkdownSection("Summary", [safeText(resume.summary)]));
  }

  if (isSectionVisible(visibleSections, "experience") && resume.experience.length > 0) {
    const lines = resume.experience.flatMap((item) => {
      const heading = `### ${safeText(item.role) || "Role"} - ${safeText(item.company) || "Company"}`;

      const meta = [
        formatDateRange(item.startDate, item.endDate, item.current),
        safeText(item.location),
      ]
        .filter(Boolean)
        .join(" | ");

      const bullets = item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .map((highlight) => `- ${highlight}`);

      const summary = safeText(item.summary);

      return [heading, meta, ...(summary ? [summary] : []), ...bullets, ""].filter(Boolean);
    });

    parts.push(toMarkdownSection("Experience", lines));
  }

  if (isSectionVisible(visibleSections, "education") && resume.education.length > 0) {
    const lines = resume.education.flatMap((item) => {
      const title = `${safeText(item.degree) || "Degree"}${safeText(item.field) ? `, ${safeText(item.field)}` : ""}`;
      const school = safeText(item.school) || "School";
      const meta = formatDateRange(item.startDate, item.endDate, item.current);
      const summary = safeText(item.summary);

      return [`- **${title}** - ${school} (${meta})`, ...(summary ? [`  - ${summary}`] : [])];
    });

    parts.push(toMarkdownSection("Education", lines));
  }

  if (isSectionVisible(visibleSections, "projects") && resume.projects.length > 0) {
    const lines = resume.projects.flatMap((item) => {
      const title = safeText(item.name) || "Project";
      const roleLabel = safeText(item.role);
      const link = safeText(item.link);
      const summary = safeText(item.summary);
      const highlights = item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .map((highlight) => `- ${highlight}`);

      return [
        `### ${title}${roleLabel ? ` (${roleLabel})` : ""}`,
        ...(link ? [`${link}`] : []),
        ...(summary ? [summary] : []),
        ...highlights,
        "",
      ];
    });

    parts.push(toMarkdownSection("Projects", lines));
  }

  if (isSectionVisible(visibleSections, "skills") && resume.skills.length > 0) {
    const lines = resume.skills
      .map((group) => {
        const nameLabel = safeText(group.name) || "Skills";
        const keywords = group.keywords
          .map((keyword) => safeText(keyword))
          .filter(Boolean)
          .join(", ");

        return keywords ? `- **${nameLabel}:** ${keywords}` : "";
      })
      .filter(Boolean);

    parts.push(toMarkdownSection("Skills", lines));
  }

  if (isSectionVisible(visibleSections, "links") && resume.links.items.length > 0) {
    const lines = resume.links.items
      .map((link) => {
        const label = safeText(link.label) || safeText(link.type) || "Link";
        const url = safeText(link.url);

        if (!url) {
          return "";
        }

        return `- [${label}](${url})`;
      })
      .filter(Boolean);

    parts.push(toMarkdownSection("Links", lines));
  }

  if (isSectionVisible(visibleSections, "custom") && resume.customSections.length > 0) {
    resume.customSections.forEach((section) => {
      const lines = section.items.flatMap((item) => {
        const title = safeText(item.name) || "Item";
        const issuer = safeText(item.issuer);
        const date = safeText(item.date);
        const description = safeText(item.description);
        const details = item.details
          .map((detail) => safeText(detail))
          .filter(Boolean)
          .map((detail) => `- ${detail}`);

        const meta = [issuer, date].filter(Boolean).join(" | ");

        return [
          `### ${title}`,
          ...(meta ? [meta] : []),
          ...(description ? [description] : []),
          ...details,
          "",
        ];
      });

      parts.push(toMarkdownSection(safeText(section.title) || "Section", lines));
    });
  }

  return parts.filter(Boolean).join("\n").trim();
}

export function exportResumeAsMarkdown(resume: ResumeData): void {
  const markdown = buildMarkdown(resume);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${getResumeFileBaseName(resume)}.md`);
}

export { buildMarkdown };
