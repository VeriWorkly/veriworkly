import type { ResumeData } from "@/types/resume";

import {
  safeText,
  formatDateRange,
  isSectionVisible,
  getVisibleSectionMap,
  getResumeFileBaseName,
  joinTruthy,
} from "@/features/resume/services/resume-formatters";
import { normalizeLinkHref } from "@/features/documents/rendering/resume-rendering";
import { getResumeAdditionalBlocks } from "@/features/documents/rendering/resume-render-items";

import { downloadBlob } from "./download";

/** Escapes Markdown metacharacters in free-form user text so it can't alter formatting. */
function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1");
}

function toMarkdownSection(title: string, body: string[]): string {
  if (body.length === 0) {
    return "";
  }

  return [`## ${title}`, ...body, ""].join("\n");
}

function buildMarkdown(resume: ResumeData): string {
  const parts: string[] = [];

  const visibleSections = getVisibleSectionMap(resume);

  const role = safeText(resume.basics.role);
  const headline = safeText(resume.basics.headline);
  const name = safeText(resume.basics.fullName) || "Your Name";

  parts.push(`# ${escapeMarkdown(name)}`);

  if (role) {
    parts.push(`_${escapeMarkdown(role)}_`);
  }

  if (headline) {
    parts.push(escapeMarkdown(headline));
  }

  const contact = [
    safeText(resume.basics.email),
    safeText(resume.basics.phone),
    safeText(resume.basics.location),
  ].filter(Boolean);

  if (contact.length > 0) {
    parts.push(contact.map(escapeMarkdown).join(" | "));
  }

  parts.push("");

  if (isSectionVisible(visibleSections, "summary") && safeText(resume.summary)) {
    parts.push(toMarkdownSection("Summary", [escapeMarkdown(safeText(resume.summary))]));
  }

  if (isSectionVisible(visibleSections, "experience") && resume.experience.length > 0) {
    const lines = resume.experience.flatMap((item) => {
      const headingText = joinTruthy([item.role, item.company], " - ");
      const heading = headingText ? `### ${escapeMarkdown(headingText)}` : "";

      const dateRange = formatDateRange(item.startDate, item.endDate, item.current);
      const meta = joinTruthy([dateRange, item.location], " | ");

      const bullets = item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .map((highlight) => `- ${escapeMarkdown(highlight)}`);

      const summary = safeText(item.summary);

      return [
        heading,
        meta ? escapeMarkdown(meta) : "",
        ...(summary ? [escapeMarkdown(summary)] : []),
        ...bullets,
        "",
      ].filter(Boolean);
    });

    parts.push(toMarkdownSection("Experience", lines));
  }

  if (isSectionVisible(visibleSections, "education") && resume.education.length > 0) {
    const lines = resume.education.flatMap((item) => {
      const title = joinTruthy([item.degree, item.field], ", ");
      const meta = formatDateRange(item.startDate, item.endDate, item.current);
      const line = joinTruthy([title && `**${escapeMarkdown(title)}**`, item.school], " - ");
      const summary = safeText(item.summary);

      if (!line && !meta) return [];

      return [
        `- ${line}${meta ? ` (${escapeMarkdown(meta)})` : ""}`,
        ...(summary ? [`  - ${escapeMarkdown(summary)}`] : []),
      ];
    });

    parts.push(toMarkdownSection("Education", lines));
  }

  if (isSectionVisible(visibleSections, "projects") && resume.projects.length > 0) {
    const lines = resume.projects.flatMap((item) => {
      const name = safeText(item.name);
      const roleLabel = safeText(item.role);
      const link = safeText(item.link);
      const summary = safeText(item.summary);
      const highlights = item.highlights
        .map((highlight) => safeText(highlight))
        .filter(Boolean)
        .map((highlight) => `- ${escapeMarkdown(highlight)}`);

      const heading = name || roleLabel;

      return [
        heading
          ? `### ${escapeMarkdown(name)}${roleLabel ? ` (${escapeMarkdown(roleLabel)})` : ""}`
          : "",
        ...(link ? [normalizeLinkHref(link)] : []),
        ...(summary ? [escapeMarkdown(summary)] : []),
        ...highlights,
        "",
      ].filter(Boolean);
    });

    parts.push(toMarkdownSection("Projects", lines));
  }

  if (isSectionVisible(visibleSections, "skills") && resume.skills.length > 0) {
    const lines = resume.skills
      .map((group) => {
        const nameLabel = safeText(group.name);
        const keywords = group.keywords
          .map((keyword) => safeText(keyword))
          .filter(Boolean)
          .join(", ");

        if (!keywords) return "";

        return nameLabel
          ? `- **${escapeMarkdown(nameLabel)}:** ${escapeMarkdown(keywords)}`
          : `- ${escapeMarkdown(keywords)}`;
      })
      .filter(Boolean);

    parts.push(toMarkdownSection("Skills", lines));
  }

  if (isSectionVisible(visibleSections, "links") && resume.links.items.length > 0) {
    const lines = resume.links.items
      .map((link) => {
        const url = safeText(link.url);

        if (!url) {
          return "";
        }

        const label = safeText(link.label) || safeText(link.type) || url;
        return `- [${escapeMarkdown(label)}](${normalizeLinkHref(url)})`;
      })
      .filter(Boolean);

    parts.push(toMarkdownSection("Links", lines));
  }

  /*
   * Every optional section — the eight typed ones and any number of custom ones — through
   * the same resolver the preview and the PDF use, rather than iterating
   * `resume.customSections` behind the single "custom" toggle.
   */
  getResumeAdditionalBlocks(resume).forEach((block) => {
    const lines = block.items.flatMap((item) => {
      const meta = joinTruthy([item.subtitle, item.link?.text, item.meta], " | ");

      return [
        item.title ? `### ${escapeMarkdown(item.title)}` : "",
        ...(meta ? [escapeMarkdown(meta)] : []),
        ...(item.summary ? [escapeMarkdown(item.summary)] : []),
        ...item.bullets.map((bullet) => `- ${escapeMarkdown(bullet)}`),
        "",
      ].filter(Boolean);
    });

    if (block.title) {
      parts.push(toMarkdownSection(escapeMarkdown(block.title), lines));
    } else if (lines.length > 0) {
      parts.push([...lines, ""].join("\n"));
    }
  });

  return parts.filter(Boolean).join("\n").trim();
}

export function exportResumeAsMarkdown(resume: ResumeData): void {
  const markdown = buildMarkdown(resume);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });

  downloadBlob(blob, `${getResumeFileBaseName(resume)}.md`);
}

export { buildMarkdown };
