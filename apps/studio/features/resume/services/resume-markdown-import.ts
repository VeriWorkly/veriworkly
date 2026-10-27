"use client";

import type {
  ResumeData,
  ResumeLanguage,
  ResumeSection,
  ResumeSectionId,
  ResumeCustomSection,
  ResumeLinkItem,
  ResumeSkillGroup,
  ResumeProjectItem,
  ResumeEducationItem,
  ResumeExperienceItem,
} from "@/types/resume";

import { createId, normalizePhoneValue } from "@veriworkly/profile-core";

import { blankResume } from "@/features/resume/constants/default-resume";
import { normalizeMonthDate, normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { getResumeSectionKey } from "@/features/documents/rendering/resume-rendering";
import {
  FLUENCY_LABELS,
  DEFAULT_SECTION_HEADINGS,
  getResumeSectionHeading,
} from "@/features/documents/rendering/resume-render-items";

/*
 * Reads the Markdown `export-markdown.ts` writes:
 *
 *   # Name / headline / contact "a | b | c" / links "[text](url) | …"
 *   ## Section
 *   ### Item title          one item per block of lines, blocks split by a blank line
 *   **subtitle**            company | location, school, or a project's stack
 *   _meta_                  the date column
 *   [link text](url)
 *   summary lines
 *   - bullet
 */

/** Reverses `escapeMarkdown` in the exporter. */
function unescapeMarkdown(value: string): string {
  return value.replace(/\\([\\`*_{}[\]()#+.!|>~-])/g, "$1").trim();
}

/** The fields the renderer joined with " | " (company | location). */
function splitFields(value: string): string[] {
  return unescapeMarkdown(value).split(" | ");
}

/**
 * Reverses only what the exporter encodes in a link destination. `decodeURI` would throw on
 * a "%" a hand-written file leaves bare, and would rewrite escapes the user typed.
 */
const LINK_ESCAPES: Record<string, string> = { "%20": " ", "%25": "%", "%28": "(", "%29": ")" };

/** `[text](url)` → its parts, or null for any other line. */
function parseLink(value: string): { text: string; url: string } | null {
  const match = value.match(/^\[(.*)\]\(([^()\s]*)\)$/);

  return match
    ? {
        text: unescapeMarkdown(match[1]),
        url: match[2].replace(
          /%2[0589]/gi,
          (escape) => LINK_ESCAPES[escape.toUpperCase()] ?? escape,
        ),
      }
    : null;
}

/**
 * A printed range back into stored dates. Each month is read back to the `YYYY-MM` the inputs
 * write, whichever format printed it ("Mar 2022", "03/2022", "2022-03"); a year or free text
 * stays as printed.
 */
function parseDateRange(value: string) {
  // Exports join a range with an en dash; older exports and hand-written files use a hyphen.
  const [first = "", second = ""] = value.split(/\s+[-–]\s+/);
  // A current entry with no start prints as "Present" alone.
  const [startDate, endDate] =
    second || !/^present$/i.test(first.trim()) ? [first, second] : ["", first];
  const current = endDate.trim().toLowerCase() === "present";

  return {
    startDate: normalizeMonthDate(startDate),
    endDate: current ? "" : normalizeMonthDate(endDate),
    current,
  };
}

/** Each `## heading` with its lines, in the order the file has them. */
function splitSections(markdown: string) {
  const sections: Array<{ title: string; lines: string[] }> = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+)$/);

    if (match) {
      sections.push({ title: unescapeMarkdown(match[1]), lines: [] });
      continue;
    }

    sections[sections.length - 1]?.lines.push(line);
  }

  return sections;
}

interface MarkdownItem {
  title: string;
  meta: string;
  subtitle: string;
  link: { text: string; url: string } | null;
  summary: string;
  bullets: string[];
}

/** One item per run of non-blank lines; a `###` heading also starts a new one. */
function parseItems(lines: string[]): MarkdownItem[] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines.map((item) => item.trim())) {
    if (!line || line.startsWith("### ")) {
      if (current.length) blocks.push(current);
      current = line ? [line] : [];
      continue;
    }

    current.push(line);
  }

  if (current.length) blocks.push(current);

  return blocks.map((block) => {
    const item: MarkdownItem = {
      title: "",
      meta: "",
      subtitle: "",
      link: null,
      summary: "",
      bullets: [],
    };
    const summary: string[] = [];

    for (const line of block) {
      const link = parseLink(line);

      if (line.startsWith("### ")) item.title = unescapeMarkdown(line.slice(4));
      else if (/^[-*]\s+/.test(line)) item.bullets.push(unescapeMarkdown(line.slice(2)));
      else if (/^_.+_$/.test(line) && !item.meta) item.meta = unescapeMarkdown(line.slice(1, -1));
      else if (/^\*\*.+\*\*$/.test(line) && !item.subtitle) item.subtitle = line.slice(2, -2);
      else if (link && !item.link) item.link = link;
      else summary.push(unescapeMarkdown(line));
    }

    item.summary = summary.join("\n");
    return item;
  });
}

function parseHeader(markdown: string, resume: ResumeData) {
  const header = markdown.split(/^##\s/m)[0];
  const lines = header
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("# ")) {
      resume.basics.fullName = unescapeMarkdown(line.slice(2));
      resume.title = resume.basics.fullName;
      continue;
    }

    const fields = line.split(/(?<!\\) \| /);
    const links = fields.map(parseLink);

    if (links.every(Boolean)) {
      resume.links.items = links.map((link, index) => ({
        id: `link-${index + 1}`,
        type: "custom",
        label: link!.text,
        url: link!.url,
      }));
      continue;
    }

    const values = fields.map(unescapeMarkdown);
    const isContact = fields.length > 1 || values.some((value) => value.includes("@"));

    if (isContact) {
      for (const value of values) {
        if (value.includes("@")) resume.basics.email = value;
        else if (/^\+?[\d\s().-]{6,}$/.test(value))
          resume.basics.phone = normalizePhoneValue(value);
        else resume.basics.location = value;
      }
      continue;
    }

    if (!resume.basics.headline) resume.basics.headline = values[0];
  }
}

function parseExperience(lines: string[]): ResumeExperienceItem[] {
  return parseItems(lines).map((item, index) => {
    const [company = "", location = ""] = item.subtitle ? splitFields(item.subtitle) : [];

    return {
      id: `experience-${index + 1}`,
      role: item.title,
      company,
      location,
      ...parseDateRange(item.meta),
      summary: item.summary,
      highlights: item.bullets,
    };
  });
}

function parseEducation(lines: string[]): ResumeEducationItem[] {
  return parseItems(lines).map((item, index) => {
    const [degree = "", ...field] = item.title.split(", ");

    return {
      id: `education-${index + 1}`,
      school: unescapeMarkdown(item.subtitle),
      degree,
      field: field.join(", "),
      ...parseDateRange(item.meta),
      summary: item.summary,
    };
  });
}

function parseProjects(lines: string[]): ResumeProjectItem[] {
  return parseItems(lines).map((item, index) => {
    const [name = "", role = ""] = item.title.split(" | ");
    const link = item.link?.url ?? "";
    const linkLabel = item.link && item.link.text !== link ? item.link.text : "";

    return {
      id: `project-${index + 1}`,
      name,
      role,
      link,
      linkLabel,
      showLinkAsText: true,
      summary: item.summary,
      highlights: item.bullets,
      skills: item.subtitle ? unescapeMarkdown(item.subtitle).split(", ").filter(Boolean) : [],
    };
  });
}

function parseSkills(lines: string[]): ResumeSkillGroup[] {
  return lines
    .map((line) => line.trim().match(/^[-*]\s+\*\*(.+?):\*\*\s*(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match, index) => ({
      id: `skill-${index + 1}`,
      name: unescapeMarkdown(match[1]),
      keywords: unescapeMarkdown(match[2])
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    }));
}

/** "a | b" back into its fields, the second empty when the renderer printed one. */
function pair(value: string): [string, string] {
  const [first = "", second = ""] = value ? splitFields(value) : [];
  return [first, second];
}

const LANGUAGE_FLUENCY = Object.fromEntries(
  Object.entries(FLUENCY_LABELS).map(([fluency, label]) => [label, fluency]),
) as Record<string, ResumeLanguage["fluency"]>;

/**
 * The fixed section a `## heading` names, in any case: its default heading, or the one the open
 * resume renamed it to, so a resume exported with its own headings reads back into place.
 */
function sectionIdForHeading(resume: ResumeData, title: string): ResumeSectionId | undefined {
  const heading = title.trim().toLowerCase();

  return resume.sections.find(
    (section) =>
      section.id !== "custom" &&
      (getResumeSectionHeading(section).toLowerCase() === heading ||
        DEFAULT_SECTION_HEADINGS[section.id].toLowerCase() === heading),
  )?.id;
}

/**
 * The eight typed sections and any custom ones, read back from the fields each prints (see
 * `resume-render-items.ts`). A heading that is none of the eight becomes a custom section, so
 * nothing the file prints is dropped. Returns the section key (see `getResumeSectionKey`).
 */
function readAdditionalSection(
  resume: ResumeData,
  sectionId: ResumeSectionId | undefined,
  title: string,
  lines: string[],
): string {
  const items = parseItems(lines);
  const website = (item: MarkdownItem) => item.link?.url ?? "";

  switch (sectionId) {
    case "certifications":
      resume.certificates = items.map((item, index) => {
        const [issuer, referenceId] = pair(item.subtitle);
        return {
          id: `certificate-${index + 1}`,
          title: item.title,
          issuer,
          referenceId,
          date: normalizeMonthDate(item.meta),
          website: website(item),
          showLink: Boolean(item.link),
          description: item.summary,
        };
      });
      return sectionId;
    case "awards":
      resume.awards = items.map((item, index) => ({
        id: `award-${index + 1}`,
        title: item.title,
        awarder: unescapeMarkdown(item.subtitle),
        date: normalizeMonthDate(item.meta),
        website: website(item),
        showLink: Boolean(item.link),
        description: item.summary,
      }));
      return sectionId;
    case "publications":
      resume.publications = items.map((item, index) => ({
        id: `publication-${index + 1}`,
        title: item.title,
        publisher: unescapeMarkdown(item.subtitle),
        date: normalizeMonthDate(item.meta),
        website: website(item),
        showLink: Boolean(item.link),
        description: item.summary,
      }));
      return sectionId;
    case "languages":
      resume.languages = items.map((item, index) => ({
        id: `language-${index + 1}`,
        language: item.title,
        fluency: LANGUAGE_FLUENCY[unescapeMarkdown(item.subtitle)] ?? "professional",
      }));
      return sectionId;
    case "interests":
      resume.interests = items.map((item, index) => ({
        id: `interest-${index + 1}`,
        name: item.title,
        keywords: item.bullets,
      }));
      return sectionId;
    case "volunteer":
      resume.volunteer = items.map((item, index) => {
        const [role, location] = pair(item.subtitle);
        return {
          id: `volunteer-${index + 1}`,
          organization: item.title,
          role,
          location,
          ...parseDateRange(item.meta),
          summary: item.summary,
        };
      });
      return sectionId;
    case "references":
      resume.references = items.map((item, index) => {
        const [jobTitle, organization] = pair(item.subtitle);
        return {
          id: `reference-${index + 1}`,
          name: item.title,
          title: jobTitle,
          organization,
          email: item.link?.url.replace(/^mailto:/i, "") ?? "",
          // Printed spaced for reading; stored as E.164 like a typed number.
          phone: normalizePhoneValue(item.meta),
          relationship: item.summary,
        };
      });
      return sectionId;
    case "achievements":
      resume.achievements = items.map((item, index) => ({
        id: `achievement-${index + 1}`,
        title: item.title,
        description: item.summary,
      }));
      return sectionId;
    default: {
      const id =
        resume.customSections.length === 0
          ? "custom-default"
          : `custom-${resume.customSections.length + 1}`;
      const section: ResumeCustomSection = {
        id,
        kind: "custom",
        title,
        editableTitle: true,
        items: items.map((item, index) => {
          const [issuer, referenceId] = pair(item.subtitle);
          return {
            id: `${id}-item-${index + 1}`,
            name: item.title,
            issuer,
            referenceId,
            date: normalizeMonthDate(item.meta),
            link: item.link?.url ?? "",
            description: item.summary,
            details: item.bullets,
          };
        }),
      };

      resume.customSections.push(section);
      return `custom:${id}`;
    }
  }
}

/** The "## Links" list older exports wrote; current exports put links in the header. */
function parseLinkList(lines: string[]): ResumeLinkItem[] {
  return lines
    .map((line) => parseLink(line.trim().replace(/^[-*]\s+/, "")))
    .filter((link): link is NonNullable<typeof link> => Boolean(link))
    .map((link, index) => ({
      id: `link-${index + 1}`,
      type: "custom",
      label: link.text,
      url: link.url,
    }));
}

export function parseResumeMarkdown(markdown: string, currentResume?: ResumeData): ResumeData {
  const resume = normalizeResumeData({
    ...structuredClone(blankResume),
    ...(currentResume
      ? {
          templateId: currentResume.templateId,
          language: currentResume.language,
          customization: currentResume.customization,
          sections: currentResume.sections,
        }
      : {}),
    id: createId("resume"),
    updatedAt: new Date().toISOString(),
  });

  parseHeader(markdown, resume);
  resume.customSections = [];

  /** The file's section order, as section keys. */
  const order: string[] = [];

  for (const { title, lines } of splitSections(markdown)) {
    const sectionId = sectionIdForHeading(resume, title);

    switch (sectionId) {
      case "summary":
        resume.summary = lines.map(unescapeMarkdown).filter(Boolean).join("\n\n");
        order.push("summary");
        break;
      case "experience":
        resume.experience = parseExperience(lines);
        order.push("experience");
        break;
      case "education":
        resume.education = parseEducation(lines);
        order.push("education");
        break;
      case "projects":
        resume.projects = parseProjects(lines);
        order.push("projects");
        break;
      case "skills":
        resume.skills = parseSkills(lines);
        order.push("skills");
        break;
      case "links": {
        const linkList = parseLinkList(lines);
        if (linkList.length) resume.links = { ...resume.links, items: linkList };
        break;
      }
      default:
        order.push(readAdditionalSection(resume, sectionId, title, lines));
    }
  }

  const normalized = normalizeResumeData(resume);
  const rank = (section: ResumeSection) => {
    const index = order.indexOf(getResumeSectionKey(section));
    return index === -1 ? order.length : index;
  };
  const [basics, links, ...body] = normalized.sections;

  // The sections print in the order the file lists them.
  const sections = [
    basics,
    links,
    ...[...body].sort((left, right) => rank(left) - rank(right) || left.order - right.order),
  ].map((section, index) => ({ ...section, order: index }));

  return normalizeResumeData({ ...normalized, sections });
}

export async function importResumeFromMarkdownFile(file: File, currentResume?: ResumeData) {
  const markdown = await file.text();

  if (!markdown.trim()) {
    throw new Error("Invalid resume markdown");
  }

  return parseResumeMarkdown(markdown, currentResume);
}
