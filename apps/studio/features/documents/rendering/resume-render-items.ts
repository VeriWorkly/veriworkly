import type {
  ResumeData,
  ResumeSection,
  ResumeSectionId,
  ResumeLanguage,
  ResumeCustomSection,
} from "@/types/resume";
import type { DocumentDateFormat } from "@/features/documents/utils/formatters";

import { formatPhoneForDisplay } from "@veriworkly/profile-core";

import { formatDateRange, formatDocumentDate } from "@/features/documents/utils/formatters";
import {
  cleanResumeText,
  getEducationMeta,
  getEducationSchool,
  getEducationTitle,
  getProjectLinkText,
  getProjectTitle,
  hasAwardContent,
  hasCustomItemContent,
  hasAchievementContent,
  hasCertificateContent,
  hasInterestContent,
  hasLanguageContent,
  hasPublicationContent,
  hasReferenceContent,
  hasVolunteerContent,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";

/**
 * Shared, renderer-agnostic shape for every item a resume section can print.
 *
 * Both the web preview and the PDF export build their items from these helpers, so a field
 * can never appear in one renderer and silently vanish from the other (the WYSIWYG class of
 * bug this file exists to prevent). The DOCX, HTML, Markdown and text exporters read them
 * too, through `buildResumeSections`, for the same reason.
 */
export interface ResumeRenderItem {
  id: string;
  /** Primary heading of the item (role, degree, project, certificate...). */
  title: string;
  /** Right-hand meta column, usually a date range. */
  meta: string;
  /** Secondary line under the title (company | location, school, tech stack). */
  subtitle: string;
  /** Optional trailing link rendered next to the title. */
  link: { href: string; text: string } | null;
  summary: string;
  bullets: string[];
}

export interface ResumeSkillLine {
  id: string;
  label: string;
  value: string;
}

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => cleanResumeText(part))
    .filter(Boolean)
    .join(" | ");
}

function cleanList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => cleanResumeText(value)).filter(Boolean);
}

/** A website that the user has not switched off, as a render link. */
function optionalWebsiteLink(website: string | undefined, showLink: boolean) {
  if (!showLink) return null;

  const href = normalizeLinkHref(website ?? "");

  return href ? { href, text: cleanResumeText(website ?? "") } : null;
}

/**
 * Titles are left empty when the user has not filled them in, never substituted with
 * a placeholder word.
 *
 * Entries reaching here are pre-filtered by `hasExperienceContent` and friends, which
 * pass an entry that has *any* content — so a row with a company and bullets but no role
 * reaches here; a placeholder word would print into the preview and the exported
 * PDF/DOCX/HTML. Renderers skip an empty title (see `renderItem` in shared/web.tsx and
 * shared/pdf.tsx).
 */
export function getExperienceRenderItems(
  items: ResumeData["experience"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.map((item) => ({
    id: item.id,
    title: cleanResumeText(item.role),
    meta: formatDateRange(item.startDate, item.endDate, item.current, dateFormat),
    subtitle: joinMeta([item.company, item.location]),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: cleanList(item.highlights),
  }));
}

export function getEducationRenderItems(
  items: ResumeData["education"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.map((item) => ({
    id: item.id,
    title: getEducationTitle(item),
    meta: getEducationMeta(item, dateFormat),
    subtitle: getEducationSchool(item),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: [],
  }));
}

export function getProjectRenderItems(items: ResumeData["projects"]): ResumeRenderItem[] {
  return items.map((item) => {
    const href = normalizeLinkHref(item.link);

    return {
      id: item.id,
      title: getProjectTitle(item),
      meta: "",
      subtitle: cleanList(item.skills).join(", "),
      link: href ? { href, text: getProjectLinkText(item) || href } : null,
      summary: cleanResumeText(item.summary),
      bullets: cleanList(item.highlights),
    };
  });
}

export function getCustomRenderItems(
  section: ResumeCustomSection,
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return section.items.filter(hasCustomItemContent).map((item) => {
    const href = normalizeLinkHref(item.link);

    return {
      id: item.id,
      title: cleanResumeText(item.name),
      meta: formatDocumentDate(cleanResumeText(item.date), dateFormat),
      subtitle: joinMeta([item.issuer, item.referenceId]),
      link: href ? { href, text: cleanResumeText(item.link) } : null,
      summary: cleanResumeText(item.description),
      bullets: cleanList(item.details),
    };
  });
}

export function getSkillLines(groups: ResumeData["skills"]): ResumeSkillLine[] {
  return groups.map((group, index) => ({
    id: group.id || `${group.name}-${index}`,
    label: cleanResumeText(group.name),
    value: cleanList(group.keywords).join(", "),
  }));
}

/** A skill line as text. A group without a name prints its keywords alone, never ": …". */
export function getSkillLineText(line: ResumeSkillLine): string {
  return line.label ? `${line.label}: ${line.value}` : line.value;
}

/* The eight typed sections, each with its own mapping: each section says what its fields mean. */

export const FLUENCY_LABELS: Record<ResumeLanguage["fluency"], string> = {
  elementary: "Elementary",
  limited: "Limited working",
  professional: "Professional working",
  fluent: "Fluent",
  native: "Native",
};

function getCertificateRenderItems(
  items: ResumeData["certificates"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.filter(hasCertificateContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: formatDocumentDate(cleanResumeText(item.date), dateFormat),
    // The credential id sits beside the issuer, which is where the flattened model printed
    // it and where a reader expects it.
    subtitle: joinMeta([item.issuer, item.referenceId]),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

function getAwardRenderItems(
  items: ResumeData["awards"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.filter(hasAwardContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: formatDocumentDate(cleanResumeText(item.date), dateFormat),
    subtitle: cleanResumeText(item.awarder),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

function getPublicationRenderItems(
  items: ResumeData["publications"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.filter(hasPublicationContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: formatDocumentDate(cleanResumeText(item.date), dateFormat),
    subtitle: cleanResumeText(item.publisher),
    link: optionalWebsiteLink(item.website, item.showLink),
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

export function getLanguageRenderItems(items: ResumeData["languages"]): ResumeRenderItem[] {
  return items.filter(hasLanguageContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.language),
    meta: "",
    subtitle: FLUENCY_LABELS[item.fluency] ?? "",
    link: null,
    summary: "",
    bullets: [],
  }));
}

function getInterestRenderItems(items: ResumeData["interests"]): ResumeRenderItem[] {
  return items.filter(hasInterestContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.name),
    meta: "",
    subtitle: "",
    link: null,
    summary: "",
    bullets: cleanList(item.keywords),
  }));
}

export function getVolunteerRenderItems(
  items: ResumeData["volunteer"],
  dateFormat?: DocumentDateFormat,
): ResumeRenderItem[] {
  return items.filter(hasVolunteerContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.organization),
    // A real date range, formatted the same way experience is.
    meta: formatDateRange(item.startDate, item.endDate, item.current, dateFormat),
    subtitle: joinMeta([item.role, item.location]),
    link: null,
    summary: cleanResumeText(item.summary),
    bullets: [],
  }));
}

export function getReferenceRenderItems(items: ResumeData["references"]): ResumeRenderItem[] {
  return items.filter(hasReferenceContent).map((item) => {
    const email = cleanResumeText(item.email ?? "");
    const phone = cleanResumeText(item.phone ?? "");

    return {
      id: item.id,
      title: cleanResumeText(item.name),
      meta: formatPhoneForDisplay(phone),
      subtitle: joinMeta([item.title, item.organization]),
      link: email ? { href: `mailto:${email}`, text: email } : null,
      summary: cleanResumeText(item.relationship),
      bullets: [],
    };
  });
}

function getAchievementRenderItems(items: ResumeData["achievements"]): ResumeRenderItem[] {
  return items.filter(hasAchievementContent).map((item) => ({
    id: item.id,
    title: cleanResumeText(item.title),
    meta: "",
    subtitle: "",
    link: null,
    summary: cleanResumeText(item.description),
    bullets: [],
  }));
}

/**
 * The heading each fixed section prints when the user has not renamed it. A custom section
 * prints its own title.
 */
export const DEFAULT_SECTION_HEADINGS: Record<Exclude<ResumeSectionId, "custom">, string> = {
  basics: "Basics",
  links: "Links",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  publications: "Publications",
  languages: "Languages",
  interests: "Interests",
  volunteer: "Volunteer",
  references: "References",
  achievements: "Achievements",
};

/**
 * The heading a section prints: the label the user gave it, or the default when they cleared
 * it. Every renderer and exporter reads headings through here (via `buildResumeSections`), so
 * a rename, or a heading in another language, reaches every format at once.
 */
export function getResumeSectionHeading(section: Pick<ResumeSection, "id" | "label">): string {
  return (
    cleanResumeText(section.label) ||
    (section.id === "custom" ? "" : DEFAULT_SECTION_HEADINGS[section.id])
  );
}

/** The typed items for one of the eight fixed optional sections. */
export function getAdditionalSectionItems(
  resume: ResumeData,
  sectionId: string,
): ResumeRenderItem[] {
  const { dateFormat } = resume.customization;

  switch (sectionId) {
    case "certifications":
      return getCertificateRenderItems(resume.certificates, dateFormat);
    case "awards":
      return getAwardRenderItems(resume.awards, dateFormat);
    case "publications":
      return getPublicationRenderItems(resume.publications, dateFormat);
    case "languages":
      return getLanguageRenderItems(resume.languages);
    case "interests":
      return getInterestRenderItems(resume.interests);
    case "volunteer":
      return getVolunteerRenderItems(resume.volunteer, dateFormat);
    case "references":
      return getReferenceRenderItems(resume.references);
    case "achievements":
      return getAchievementRenderItems(resume.achievements);
    default:
      return [];
  }
}
